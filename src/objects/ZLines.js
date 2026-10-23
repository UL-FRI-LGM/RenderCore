import {Mesh} from './Mesh.js';
import {Geometry} from './Geometry.js';
import {Texture} from '../textures/Texture.js';
import {Int32Attribute} from '../core/BufferAttribute.js';
import {Matrix4} from '../math/Matrix4.js';
import {ZLinesBasicMaterial} from '../materials/ZLinesBasicMaterial.js';

// Level of detail: a segment leaves its bucket for a lower one only when its
// need drops below 1 / LOD_HYSTERESIS of the lower bucket's capacity.
const LOD_HYSTERESIS = 1.4;
// A relative change of the projection-view matrix below this does not re-walk.
const LOD_STAMP_EPS = 1e-6;
// Clip w at or below this is behind the camera plane, for the walk and the shader.
const LOD_W_EPS = 1e-6;
// At most this many walk states, one per viewport size: the main pass, the
// outline pass when it runs at another size, the pick pass.
const LOD_MAX_SLOTS = 3;
const BUCKET_NONE = 254;     // not walked yet
const BUCKET_CULLED = 255;   // outside the frustum, not drawn

// The frustum planes a clip-space point lies outside of, the sides widened by
// the factors mx, my and the offsets kx, ky.
function outcode(x, y, z, w, mx, my, kx, ky) {
    const wx = w * mx + kx, wy = w * my + ky;
    return (x > wx ? 1 : 0) | (x < -wx ? 2 : 0) | (y > wy ? 4 : 0) | (y < -wy ? 8 : 0) |
           (z > w ? 16 : 0) | (z < -w ? 32 : 0);
}

// acos(u) + 7e-5, an upper bound by the error of Abramowitz and Stegun 4.4.45,
// at a third of the cost of Math.acos in the walk.
function acosUpper(u) {
    const x = u < 0 ? -u : u;
    const r = Math.sqrt(1 - x) * (1.5707288 + x * (-0.2121144 + x * (0.0742610 - 0.0187293 * x)));
    return (u < 0 ? Math.PI - r : r) + 7e-5;
}

/**
 * A set of lines drawn with instanced draw calls, one instance per segment.
 * A segment is a cubic Hermite between two points, evaluated in the vertex
 * shader from the points' positions and directions and the segment's arc
 * length; a zero direction is replaced by the Catmull-Rom estimate from the
 * neighbour points. The data layout is described in ZLinesData.js, which
 * also holds the builder for strokes authored on the client. The object itself
 * keeps only the two textures, see setTextures(); the counts come from the
 * header texel of the tables texture.
 *
 * The strip has 2 * (n + 1) vertices and no vertex buffer: the shader derives
 * t and the side from gl_VertexID. The strip is drawn u_Margin pixels wider
 * than the line and the fragment shader cuts and antialiases the edge on the
 * distance from the centre line.
 *
 * Level of detail. `samples` is the ceiling of n. With lodEnabled, update()
 * walks the segments whenever the projection-view matrix or the viewport
 * changed: it projects every point once, takes each segment's screen length s
 * (the projected Bezier control polygon, which bounds the projected arc) and
 * turning angle theta, and needs n = sqrt(s theta / (8 lodTolerance)) quads for
 * a sagitta below lodTolerance pixels. n rounds up to a bucket, the powers of
 * two below the ceiling and the ceiling itself, with a hysteresis of 1.4 on
 * the way down. A segment whose Bezier hull lies outside one frustum plane,
 * widened by the strip's extent, is culled; one with a hull point behind the
 * camera plane takes the top bucket. The vertex shader computes the same need
 * per instance and collapses the trailing samples onto the end point, so the
 * picture does not depend on the bucket boundaries.
 *
 * draw() is the planner: it walks the stroke table, merges consecutive
 * visible strokes into runs of segments, and with level of detail splits the
 * visible segments into one instance list per bucket, drawn with that
 * bucket's u_Samples through the a_Instances attribute. When every visible
 * segment is in one bucket and none is culled, it draws the runs, one draw per
 * run with u_InstanceOffset set to the run's first segment; above runThreshold
 * runs, one list of the visible segments instead. The plans are cached;
 * tablesChanged() invalidates them.
 *
 * Picking writes the segment index; the outline pass takes a list of segments
 * through outlineMaterial.outline_instances_setup(), split by bucket as well.
 */
export class ZLines extends Mesh {
    constructor(material = null, args = {}) {
        if (material === null) {
            material = new ZLinesBasicMaterial(args);
        }
        super(new Geometry(), material, material.clone_for_picking(), material.clone_for_outline());
        this.type = "ZLines";

        this.instanced = true;
        this.instanceCount = 0;
        // There is no geometry to take bounds from.
        this.frustumCulled = false;

        this.runThreshold = 64;
        this.nStrokes = 0;
        this.nSegs = 0;
        this.segBase = 0;
        this._pointsTex = null;
        this._tablesTex = null;
        this._plan = null;
        this._listAttr = null;

        // Level of detail.
        this._lodEnabled = args.lodEnabled !== undefined ? args.lodEnabled : true;
        this._lodTolerance = args.lodTolerance !== undefined ? args.lodTolerance : 0.25;
        this._applyLodUniform();
        this._pv = new Matrix4();
        this._lodSlots = [];       // walk states, one per viewport size
        this._lodSlot = null;      // the slot of the pass being drawn, set by update()
        this._lodTick = 0;
        this._lodCaps = null;      // bucket capacities, for the ceiling _lodCapsFor
        this._lodCapsFor = -1;
        this._lodClip = null;      // scratch: projected points and directions
        this._tablesF = null;      // float view of the tables image, for L
        this.lodChanges = 0;       // segments that moved between two drawn buckets
        this.lodWalks = 0;
    }

    get materials() { return [this.material, this.pickingMaterial, this.outlineMaterial]; }

    /** The ceiling of the quads per segment. */
    get samples() { return this.material.samples; }
    set samples(n) { for (const m of this.materials) m.samples = n; }

    get lineWidth() { return this.material.lineWidth; }
    set lineWidth(w) { for (const m of this.materials) m.lineWidth = w; }

    get screenWidth() { return this.material.screenWidth; }
    set screenWidth(b) { for (const m of this.materials) m.screenWidth = b; }

    get margin() { return this.material.margin; }
    set margin(px) { for (const m of this.materials) m.margin = px; }

    /** Level of detail on or off; off draws every segment with `samples` quads. */
    get lodEnabled() { return this._lodEnabled; }
    set lodEnabled(b) { this._lodEnabled = !!b; this._applyLodUniform(); this._lodInvalidate(); }

    /** The sagitta allowed per chord, in pixels. */
    get lodTolerance() { return this._lodTolerance; }
    set lodTolerance(px) { this._lodTolerance = px; this._applyLodUniform(); this._lodInvalidate(); }

    _applyLodUniform() {
        const v = this._lodEnabled ? this._lodTolerance : 0.0;
        for (const m of this.materials) m.lodTolerance = v;
    }

    get pointsTexture() { return this._pointsTex; }
    get tablesTexture() { return this._tablesTex; }

    static _makeTexture(image, size, internalFormat, format, type) {
        const tex = new Texture(image,
            Texture.WRAPPING.ClampToEdgeWrapping, Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter, Texture.FILTER.NearestFilter,
            internalFormat, format, type, size[0], size[1]);
        tex.flipy = false;
        return tex;
    }

    /**
     * The two data textures. The tables texture's image starts with a header
     * texel (nStrokes, nSegs, segBase, version), so the texture describes
     * itself, and the image is the stroke and segment table that the planner
     * walks; nothing else is kept. This is what REve calls, with textures over
     * views into the scene's binary blob.
     */
    setTextures(pointsTex, tablesTex) {
        const h = tablesTex.image;
        if (h[3] !== 1) throw new Error("ZLines.setTextures: tables header version " + h[3] + ", expected 1");
        this._pointsTex = pointsTex;
        this._tablesTex = tablesTex;
        this.nStrokes = h[0];
        this.nSegs = h[1];
        this.segBase = h[2];
        for (const m of this.materials) {
            m._instanceData = [pointsTex, tablesTex];
            m.segBase = this.segBase;
        }
        this.instanceCount = this.nSegs;
        this._plan = null;
        this._lodSlots = [];
    }

    /** Convenience for a ZLinesData built on the client: make its textures and install them. */
    setData(data) {
        this.setTextures(
            ZLines._makeTexture(data.points, data.pointsSize,
                Texture.FORMAT.RGBA32F, Texture.FORMAT.RGBA, Texture.TYPE.FLOAT),
            ZLines._makeTexture(data.tables, data.tablesSize,
                Texture.FORMAT.RGBA32I, Texture.FORMAT.RGBA_INTEGER, Texture.TYPE.INT));
    }

    /** The points texture's image changed: re-upload and re-walk. */
    pointsChanged() {
        if (this._pointsTex) this._pointsTex.needsUpload();
        this._lodInvalidate();
    }

    /** The tables texture's image changed (visibility, colours): re-upload and re-plan. */
    tablesChanged() {
        if (this._tablesTex) this._tablesTex.needsUpload();
        this._plan = null;
        this._lodInvalidate();
    }

    /** Re-walk on the next update and rebuild every list; the buckets stay for the hysteresis. */
    _lodInvalidate() {
        for (const s of this._lodSlots) { s.valid = false; s.dirty = -1; s.plan = null; }
    }

    /** The visibility plan: { runs: [first, count, first, count, ...], nRuns, nVisible, list }. */
    get plan() {
        if (this._plan === null) this._plan = this._makePlan();
        return this._plan;
    }

    _makePlan() {
        // Walk the stroke table in the tables texture: texel 1 + k is
        // (firstSeg, nSeg, rgba, flags), flags bit 0 is visible.
        const t = this._tablesTex ? this._tablesTex.image : null;
        const runs = [];
        let nVisible = 0;
        if (t) {
            for (let k = 0, o = 4; k < this.nStrokes; ++k, o += 4) {
                const n = t[o + 1];
                if (n <= 0 || (t[o + 3] & 1) === 0) continue;
                const first = t[o];
                const last = runs.length - 2;
                if (last >= 0 && runs[last] + runs[last + 1] === first)
                    runs[last + 1] += n;
                else
                    runs.push(first, n);
                nVisible += n;
            }
        }
        const plan = { runs: runs, nRuns: runs.length / 2, nVisible: nVisible, list: null };
        if (plan.nRuns > this.runThreshold) {
            const list = new Int32Array(nVisible);
            for (let r = 0, j = 0; r < runs.length; r += 2)
                for (let s = runs[r], e = runs[r] + runs[r + 1]; s < e; ++s) list[j++] = s;
            if (this._listAttr === null) this._listAttr = Int32Attribute(list, 1, 1);
            else this._listAttr.array = list;
            plan.list = this._listAttr;
        }
        return plan;
    }

    // --- level of detail: the walk ------------------------------------------

    /** Bucket capacities: the powers of two below the ceiling, then the ceiling. */
    _lodCapsArray() {
        const ceil = Math.max(1, this.material.samples | 0);
        if (this._lodCapsFor !== ceil) {
            const caps = [];
            for (let c = 1; c < ceil; c *= 2) caps.push(c);
            caps.push(ceil);
            this._lodCaps = caps;
            this._lodCapsFor = ceil;
            this._lodSlots = [];      // the bucket bytes index the old capacities
        }
        return this._lodCaps;
    }

    update(glManager, camera) {
        super.update(glManager, camera);
        this._lodSlot = null;
        if (!this._lodEnabled || !this._pointsTex || !this._tablesTex || this.nSegs <= 0) return;

        this._lodCapsArray();
        const gl = glManager.context;
        const vp = gl.getParameter(gl.VIEWPORT);
        const vw = vp[2], vh = vp[3];
        this._pv.multiplyMatrices(camera.projectionMatrix, this.modelViewMatrix);
        const pe = this._pv.elements;

        let slot = null;
        for (const s of this._lodSlots) if (s.vw === vw && s.vh === vh) { slot = s; break; }
        if (slot === null) {
            if (this._lodSlots.length >= LOD_MAX_SLOTS) {
                let lru = 0;
                for (let i = 1; i < this._lodSlots.length; ++i)
                    if (this._lodSlots[i].lastUse < this._lodSlots[lru].lastUse) lru = i;
                this._lodSlots.splice(lru, 1);
            }
            slot = this._newSlot(vw, vh);
            this._lodSlots.push(slot);
        }
        slot.lastUse = ++this._lodTick;

        if (!slot.valid || ZLines._stampChanged(slot.pv, pe)) {
            slot.pv.set(pe);
            const P = camera.projectionMatrix.elements;
            this._lodWalk(slot, P[0], P[5]);
            slot.valid = true;
        }
        this._lodSlot = slot;
    }

    _newSlot(vw, vh) {
        const nb = this._lodCaps.length;
        return {
            vw: vw, vh: vh, valid: false, lastUse: 0,
            pv: new Float64Array(16),
            bucket: new Uint8Array(this.nSegs).fill(BUCKET_NONE),
            hist: new Int32Array(nb), culled: 0, walkMs: 0,
            dirty: -1,             // bit b: bucket b's list changed since the last plan
            plan: null,            // [{ n, vis } | { n, attr }]
            lists: new Array(nb).fill(null),
            given: null,           // the outline list split by bucket
            givenAttrs: new Array(nb).fill(null),
            version: 0,
        };
    }

    static _stampChanged(a, b) {
        let m = 0, d = 0;
        for (let i = 0; i < 16; ++i) {
            const v = Math.abs(b[i]);
            if (v > m) m = v;
            const e = Math.abs(b[i] - a[i]);
            if (e > d) d = e;
        }
        return d > LOD_STAMP_EPS * m;
    }

    /**
     * The walk: bucket bytes for every segment of the slot. P00 and P11 are
     * the projection's scales, for the cull margin of world-unit widths.
     */
    _lodWalk(slot, P00, P11) {
        const t0 = performance.now();
        const pts = this._pointsTex.image;
        const tb = this._tablesTex.image;
        if (this._tablesF === null || this._tablesF.buffer !== tb.buffer ||
            this._tablesF.byteOffset !== tb.byteOffset || this._tablesF.length !== tb.length)
            this._tablesF = new Float32Array(tb.buffer, tb.byteOffset, tb.length);
        const tf = this._tablesF;
        const caps = this._lodCaps, nb = caps.length, top = nb - 1;
        const bucket = slot.bucket, hist = slot.hist;
        const vw = slot.vw, vh = slot.vh, hx = 0.5 * vw, hy = 0.5 * vh;
        const tol8 = 8 * this._lodTolerance;

        // Project every point and its direction once: 8 floats per point.
        const nP = (pts.length / 12) | 0;
        if (this._lodClip === null || this._lodClip.length < 8 * nP) this._lodClip = new Float32Array(8 * nP);
        const C = this._lodClip, e = slot.pv;
        const e0 = e[0], e1 = e[1], e2 = e[2], e3 = e[3], e4 = e[4], e5 = e[5], e6 = e[6], e7 = e[7];
        const e8 = e[8], e9 = e[9], e10 = e[10], e11 = e[11], e12 = e[12], e13 = e[13], e14 = e[14], e15 = e[15];
        for (let p = 0, i = 0, o = 0; p < nP; ++p, i += 12, o += 8) {
            const x = pts[i], y = pts[i + 1], z = pts[i + 2];
            const dx = pts[i + 4], dy = pts[i + 5], dz = pts[i + 6];
            C[o]     = e0 * x + e4 * y + e8  * z + e12;
            C[o + 1] = e1 * x + e5 * y + e9  * z + e13;
            C[o + 2] = e2 * x + e6 * y + e10 * z + e14;
            C[o + 3] = e3 * x + e7 * y + e11 * z + e15;
            C[o + 4] = e0 * dx + e4 * dy + e8  * dz;
            C[o + 5] = e1 * dx + e5 * dy + e9  * dz;
            C[o + 6] = e2 * dx + e6 * dy + e10 * dz;
            C[o + 7] = e3 * dx + e7 * dy + e11 * dz;
        }

        // The strip's extent beyond the centre line, for the cull: in pixels
        // for screen widths, in world units plus the margin in pixels otherwise.
        let hw = 0, margin = 0;
        for (const m of this.materials) { hw = Math.max(hw, 0.5 * m.lineWidth); margin = Math.max(margin, m.margin); }
        const screen = this.material.screenWidth;
        const aP00 = Math.abs(P00), aP11 = Math.abs(P11);

        hist.fill(0);
        let culled = 0, changes = 0, dirty = 0;
        // Hull points 0 to 3: p0, p0 + L d0 / 3, p1 - L d1 / 3, p1, in clip space.
        const segBase = this.segBase;
        for (let s = 0, o = 4 * segBase; s < this.nSegs; ++s, o += 8) {
            const i0 = tb[o], i1 = tb[o + 1], L = tf[o + 2];
            const iPrev = (tb[o + 6] & 1) ? -1 : tb[o + 4], iNext = tb[o + 5];
            const a = 12 * i0, b = 12 * i1, ca = 8 * i0, cb = 8 * i1;

            // World chord and the tangents, as the shader takes them.
            let Px = pts[b] - pts[a], Py = pts[b + 1] - pts[a + 1], Pz = pts[b + 2] - pts[a + 2];
            const Pl = Math.sqrt(Px * Px + Py * Py + Pz * Pz);
            const cx = Pl > 0 ? Px / Pl : 0, cy = Pl > 0 ? Py / Pl : 0, cz = Pl > 0 ? Pz / Pl : 0;

            // d0 and its clip image; a zero direction is the Catmull-Rom estimate
            // p1 - pPrev, or the chord, normalized in world space.
            let d0x = pts[a + 4], d0y = pts[a + 5], d0z = pts[a + 6];
            let q0x, q0y, q0z, q0w;
            if (d0x === 0 && d0y === 0 && d0z === 0) {
                let ex = Px, ey = Py, ez = Pz, el = Pl, ic = -1;
                if (iPrev >= 0) {
                    const c = 12 * iPrev;
                    ex = pts[b] - pts[c]; ey = pts[b + 1] - pts[c + 1]; ez = pts[b + 2] - pts[c + 2];
                    el = Math.sqrt(ex * ex + ey * ey + ez * ez);
                    ic = 8 * iPrev;
                }
                if (el > 0) {
                    const f = 1 / el;
                    d0x = ex * f; d0y = ey * f; d0z = ez * f;
                    const from = ic >= 0 ? ic : ca;
                    q0x = (C[cb] - C[from]) * f; q0y = (C[cb + 1] - C[from + 1]) * f;
                    q0z = (C[cb + 2] - C[from + 2]) * f; q0w = (C[cb + 3] - C[from + 3]) * f;
                } else if (Pl > 0) {
                    const f = 1 / Pl;
                    d0x = cx; d0y = cy; d0z = cz;
                    q0x = (C[cb] - C[ca]) * f; q0y = (C[cb + 1] - C[ca + 1]) * f;
                    q0z = (C[cb + 2] - C[ca + 2]) * f; q0w = (C[cb + 3] - C[ca + 3]) * f;
                } else { q0x = q0y = q0z = q0w = 0; }
            } else {
                q0x = C[ca + 4]; q0y = C[ca + 5]; q0z = C[ca + 6]; q0w = C[ca + 7];
            }
            // d1: p(iNext) - p0, or the chord.
            let d1x = pts[b + 4], d1y = pts[b + 5], d1z = pts[b + 6];
            let q1x, q1y, q1z, q1w;
            if (d1x === 0 && d1y === 0 && d1z === 0) {
                let ex = Px, ey = Py, ez = Pz, el = Pl, ic = -1;
                if (iNext >= 0) {
                    const c = 12 * iNext;
                    ex = pts[c] - pts[a]; ey = pts[c + 1] - pts[a + 1]; ez = pts[c + 2] - pts[a + 2];
                    el = Math.sqrt(ex * ex + ey * ey + ez * ez);
                    ic = 8 * iNext;
                }
                if (el > 0) {
                    const f = 1 / el;
                    d1x = ex * f; d1y = ey * f; d1z = ez * f;
                    const to = ic >= 0 ? ic : cb;
                    q1x = (C[to] - C[ca]) * f; q1y = (C[to + 1] - C[ca + 1]) * f;
                    q1z = (C[to + 2] - C[ca + 2]) * f; q1w = (C[to + 3] - C[ca + 3]) * f;
                } else if (Pl > 0) {
                    const f = 1 / Pl;
                    d1x = cx; d1y = cy; d1z = cz;
                    q1x = (C[cb] - C[ca]) * f; q1y = (C[cb + 1] - C[ca + 1]) * f;
                    q1z = (C[cb + 2] - C[ca + 2]) * f; q1w = (C[cb + 3] - C[ca + 3]) * f;
                } else { q1x = q1y = q1z = q1w = 0; }
            } else {
                q1x = C[cb + 4]; q1y = C[cb + 5]; q1z = C[cb + 6]; q1w = C[cb + 7];
            }

            const l3 = L / 3;
            const x0 = C[ca], y0 = C[ca + 1], z0 = C[ca + 2], w0 = C[ca + 3];
            const x3 = C[cb], y3 = C[cb + 1], z3 = C[cb + 2], w3 = C[cb + 3];
            const x1 = x0 + l3 * q0x, y1 = y0 + l3 * q0y, z1 = z0 + l3 * q0z, w1 = w0 + l3 * q0w;
            const x2 = x3 - l3 * q1x, y2 = y3 - l3 * q1y, z2 = z3 - l3 * q1z, w2 = w3 - l3 * q1w;

            // Cull when all four hull points lie outside one plane of the
            // frustum widened by the strip; each plane is a half-space in
            // world space, so the test holds for points behind the camera too.
            const W = pts[a + 3] > pts[b + 3] ? pts[a + 3] : pts[b + 3];
            let mx, my, kx, ky;
            if (screen) { mx = 1 + 2 * (hw * W + margin) / vw; my = 1 + 2 * (hw * W + margin) / vh; kx = ky = 0; }
            else        { mx = 1 + 2 * margin / vw; my = 1 + 2 * margin / vh; kx = hw * W * aP00; ky = hw * W * aP11; }
            const codeAll = outcode(x0, y0, z0, w0, mx, my, kx, ky) & outcode(x1, y1, z1, w1, mx, my, kx, ky) &
                            outcode(x2, y2, z2, w2, mx, my, kx, ky) & outcode(x3, y3, z3, w3, mx, my, kx, ky);
            let wmin = w0 < w1 ? w0 : w1, wmax = w0 < w1 ? w1 : w0;
            if (w2 < wmin) wmin = w2; if (w2 > wmax) wmax = w2;
            if (w3 < wmin) wmin = w3; if (w3 > wmax) wmax = w3;

            let nb_new;
            const old = bucket[s];
            if (codeAll !== 0) {
                nb_new = BUCKET_CULLED;
                ++culled;
            } else {
                let need;
                if (wmin <= LOD_W_EPS) {
                    // A hull point behind the camera plane: the top bucket.
                    need = Infinity;
                } else {
                    // Screen length of the control polygon, in pixels.
                    const r0 = 1 / w0, r1 = 1 / w1, r2 = 1 / w2, r3 = 1 / w3;
                    const sx0 = x0 * r0 * hx, sy0 = y0 * r0 * hy, sx1 = x1 * r1 * hx, sy1 = y1 * r1 * hy;
                    const sx2 = x2 * r2 * hx, sy2 = y2 * r2 * hy, sx3 = x3 * r3 * hx, sy3 = y3 * r3 * hy;
                    const slen = Math.sqrt((sx1 - sx0) * (sx1 - sx0) + (sy1 - sy0) * (sy1 - sy0)) +
                                 Math.sqrt((sx2 - sx1) * (sx2 - sx1) + (sy2 - sy1) * (sy2 - sy1)) +
                                 Math.sqrt((sx3 - sx2) * (sx3 - sx2) + (sy3 - sy2) * (sy3 - sy2));
                    // Turning: the angles of the two tangents to the chord; a zero chord is a loop.
                    let theta;
                    if (Pl > 0) {
                        let u0 = d0x * cx + d0y * cy + d0z * cz, u1 = d1x * cx + d1y * cy + d1z * cz;
                        u0 = u0 > 1 ? 1 : (u0 < -1 ? -1 : u0);
                        u1 = u1 > 1 ? 1 : (u1 < -1 ? -1 : u1);
                        theta = acosUpper(u0) + acosUpper(u1);
                    } else {
                        theta = Math.PI;
                    }
                    // Uniform t bunches the samples at the far end: the nearest
                    // chord is longer than slen / n by up to the ratio of the depths.
                    need = Math.sqrt(slen * theta * (wmax / wmin) / tol8);
                }
                let nbk = 0;
                while (nbk < top && caps[nbk] < need) ++nbk;
                if (old < nb && nbk < old) {
                    // Down only when below 1 / 1.4 of the lower bucket, then to the
                    // smallest bucket with that headroom.
                    if (need * LOD_HYSTERESIS < caps[old - 1]) {
                        while (nbk < old - 1 && need * LOD_HYSTERESIS >= caps[nbk]) ++nbk;
                    } else {
                        nbk = old;
                    }
                }
                nb_new = nbk;
                ++hist[nbk];
            }
            if (nb_new !== old) {
                if (old < nb && nb_new < nb) ++changes;
                if (old < nb) dirty |= 1 << old;
                if (nb_new < nb) dirty |= 1 << nb_new;
                bucket[s] = nb_new;
            }
        }

        slot.culled = culled;
        slot.dirty |= dirty;
        if (dirty !== 0) slot.plan = null;
        ++slot.version;
        this.lodChanges += changes;
        ++this.lodWalks;
        slot.walkMs = performance.now() - t0;
    }

    // --- level of detail: the plan -------------------------------------------

    /** The draws of a slot: [{ n, vis: true }] for the visibility plan, or one { n, attr } per bucket. */
    _lodPlan(slot) {
        if (slot.plan !== null) return slot.plan;
        const vis = this.plan;
        const caps = this._lodCaps, nb = caps.length, bk = slot.bucket, r = vis.runs;
        const cnt = new Int32Array(nb);
        let culled = 0;
        for (let i = 0; i < r.length; i += 2)
            for (let s = r[i], e = r[i] + r[i + 1]; s < e; ++s) {
                const b = bk[s];
                if (b < nb) ++cnt[b]; else ++culled;
            }
        let nonEmpty = 0, only = -1;
        for (let b = 0; b < nb; ++b) if (cnt[b] > 0) { ++nonEmpty; only = b; }

        const draws = [];
        if (nonEmpty === 1 && culled === 0) {
            draws.push({ n: caps[only], vis: true });
        } else if (nonEmpty > 0) {
            // Rebuild the lists of the buckets that changed.
            const pos = new Int32Array(nb), rebuild = new Array(nb);
            const arrays = new Array(nb);
            for (let b = 0; b < nb; ++b) {
                const a = slot.lists[b];
                rebuild[b] = cnt[b] > 0 && (a === null || a.count() !== cnt[b] || (slot.dirty & (1 << b)) !== 0);
                if (rebuild[b]) arrays[b] = new Int32Array(cnt[b]);
            }
            for (let i = 0; i < r.length; i += 2)
                for (let s = r[i], e = r[i] + r[i + 1]; s < e; ++s) {
                    const b = bk[s];
                    if (b < nb && rebuild[b]) arrays[b][pos[b]++] = s;
                }
            for (let b = 0; b < nb; ++b) {
                if (rebuild[b]) {
                    if (slot.lists[b] === null) slot.lists[b] = Int32Attribute(arrays[b], 1, 1);
                    else slot.lists[b].array = arrays[b];
                }
                if (cnt[b] > 0) draws.push({ n: caps[b], attr: slot.lists[b] });
            }
        }
        slot.dirty = 0;
        slot.plan = draws;
        return draws;
    }

    /** A given list of segments (the outline) split by the slot's buckets, culled ones dropped. */
    _lodGiven(slot, list) {
        const g = slot.given;
        if (g !== null && g.src === list && g.version === slot.version) return g.draws;
        const caps = this._lodCaps, nb = caps.length, bk = slot.bucket;
        const cnt = new Int32Array(nb);
        for (let i = 0; i < list.length; ++i) { const b = bk[list[i]]; if (b < nb) ++cnt[b]; }
        const arrays = new Array(nb), pos = new Int32Array(nb);
        for (let b = 0; b < nb; ++b) if (cnt[b] > 0) arrays[b] = new Int32Array(cnt[b]);
        for (let i = 0; i < list.length; ++i) { const b = bk[list[i]]; if (b < nb) arrays[b][pos[b]++] = list[i]; }
        const draws = [];
        for (let b = 0; b < nb; ++b) {
            if (cnt[b] === 0) continue;
            if (slot.givenAttrs[b] === null) slot.givenAttrs[b] = Int32Attribute(arrays[b], 1, 1);
            else slot.givenAttrs[b].array = arrays[b];
            draws.push({ n: caps[b], attr: slot.givenAttrs[b] });
        }
        slot.given = { src: list, version: slot.version, draws: draws };
        return draws;
    }

    /** The last walk's numbers: segments per bucket, culled, the walk's time in ms. */
    lodStats() {
        let s = null;
        for (const x of this._lodSlots) if (x.valid && (s === null || x.lastUse > s.lastUse)) s = x;
        if (s === null) return { buckets: [], caps: [], culled: 0, walkMs: 0, changes: this.lodChanges, walks: this.lodWalks };
        return { buckets: Array.from(s.hist), caps: this._lodCaps.slice(), culled: s.culled,
                 walkMs: s.walkMs, changes: this.lodChanges, walks: this.lodWalks, viewport: [s.vw, s.vh] };
    }

    // --- draw ----------------------------------------------------------------

    draw(gl, glManager, instance_count = 0) {
        const ceil = this.material.samples;
        const mat = glManager._currentMaterial;
        const prog = glManager._currentProgram;
        const us = prog.uniformSetter;
        const as = prog.attributeSetter.a_Instances;
        const setOffset  = (v) => { if (us.u_InstanceOffset) us.u_InstanceOffset.set(v); };
        const setSamples = (n) => { if (us.u_Samples) us.u_Samples.set(n); };
        const slot = this._lodSlot;

        // Instance lists through a_Instances, each with its own sample count.
        const drawLists = (draws, wasGiven, own) => {
            if (!wasGiven) us.u_GivenInstances.set(true);
            setOffset(0);
            for (const d of draws) {
                setSamples(d.n);
                as.set(d.attr, 1, true, 1);
                gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * (d.n + 1), d.attr.count());
            }
            if (!wasGiven) us.u_GivenInstances.set(false);
            as.set(own, 1, true, own.divisor);
            setSamples(ceil);
        };

        // A given list of segments: the outline of a selection.
        if (!instance_count && mat && mat.getUniform("u_GivenInstances")) {
            const own = mat.getAttribute("a_Instances");
            if (slot !== null && slot.vw > 0) {
                drawLists(this._lodGiven(slot, own.array), true, own);
                return;
            }
            instance_count = own.count();
        }
        if (instance_count > 0) {
            setOffset(0);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * (ceil + 1), instance_count);
            return;
        }

        const plan = this.plan;
        if (plan.nVisible === 0) return;
        const draws = slot !== null ? this._lodPlan(slot) : [{ n: ceil, vis: true }];
        if (draws.length === 0) return;
        if (draws[0].vis !== true) {
            drawLists(draws, false, mat.getAttribute("a_Instances"));
            return;
        }

        // Every visible segment in one bucket: the visibility plan.
        const n = draws[0].n, nVert = 2 * (n + 1);
        setSamples(n);
        if (plan.list) {
            drawLists([{ n: n, attr: plan.list }], false, mat.getAttribute("a_Instances"));
        } else {
            const r = plan.runs;
            for (let i = 0; i < r.length; i += 2) {
                setOffset(r[i]);
                gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, nVert, r[i + 1]);
            }
        }
        setSamples(ceil);
    }
}
