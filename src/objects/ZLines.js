import {Mesh} from './Mesh.js';
import {Geometry} from './Geometry.js';
import {Texture} from '../textures/Texture.js';
import {Int32Attribute} from '../core/BufferAttribute.js';
import {Matrix4} from '../math/Matrix4.js';
import {ZLinesBasicMaterial} from '../materials/ZLinesBasicMaterial.js';
import {WasmArena} from '../wasm/WasmArena.js';
import {ZLINES_WALK_WASM} from '../wasm/zlines_walk.wasm.js';
import {ZLinesData} from './ZLinesData.js';

// Level of detail: a segment leaves its bucket for a lower one only when its
// need drops below 1 / 1.4 of the lower bucket's capacity. The walk compares
// the squares of the need and the capacities, which saves the square root.
const LOD_HYSTERESIS2 = 1.4 * 1.4;
// A relative change of the projection-view matrix below this does not re-walk.
const LOD_STAMP_EPS = 1e-6;
// Clip w at or below this is behind the camera plane, for the walk and the shader.
const LOD_W_EPS = 1e-6;
// The viewport sizes the buckets serve: the main pass, the outline pass when
// it runs at another size, the pick pass. A size not drawn for LOD_SIZE_AGE
// updates is forgotten, so a resized window stops counting.
const LOD_MAX_SIZES = 3;
const LOD_SIZE_AGE = 256;
const BUCKET_NONE = 254;     // not walked yet
const BUCKET_CULLED = 255;   // outside the frustum, not drawn
// The kernel keeps the squared capacities in a local array of this size.
const WASM_MAX_CAPS = 32;
const WASM_KERNEL = "zlines_walk";

// Arena memory is not collected, so the allocations of a ZLines that was
// dropped without dispose() are freed when it is collected.
const arenaFinalizer = typeof FinalizationRegistry === "function"
    ? new FinalizationRegistry((res) => res.release()) : null;

/**
 * The arena allocations of one ZLines, kept apart from the object so the
 * finalizer can free them without holding the object alive.
 */
class ArenaHold {
    constructor(arena) { this.arena = arena; this.ptrs = new Set(); }
    alloc(bytes) {
        const p = this.arena.alloc(bytes);
        if (p !== 0) this.ptrs.add(p);
        return p;
    }
    free(p) { if (this.ptrs.delete(p)) this.arena.free(p); }
    release() { for (const p of this.ptrs) this.arena.free(p); this.ptrs.clear(); }
}

/**
 * The level-of-detail state: the bucket byte per segment, the histogram, the
 * per-bucket instance lists, and the camera and viewport of the walk that
 * produced them. A wasm state keeps the bucket bytes and the histogram the
 * kernel writes in the arena; `bucket` re-views them after a growth.
 */
class LodState {
    constructor(nSegs, nb, hold) {
        this.wasm = hold !== null;
        this.nSegs = nSegs; this.nb = nb;
        this.valid = false;
        this.pv = new Float64Array(16);
        this.vw = 0; this.vh = 0;      // the viewport the needs were computed for
        this.mw = 0; this.mh = 0;      // the viewport the cull margin was computed for
        this.hist = new Int32Array(nb);
        this.culled = 0; this.walkMs = 0; this.syncMs = 0;
        this.dirty = -1;               // bit b: bucket b's list changed since the last plan
        this.plan = null;              // [{ n, vis } | { n, attr }]
        this.lists = new Array(nb).fill(null);
        this.given = null;             // the outline list split by bucket
        this.givenAttrs = new Array(nb).fill(null);
        this.version = 0;
        this._hold = hold;
        this._bucket = null;
        this._gen = -1;
        if (hold !== null) {
            this.bucketBytes = (nSegs + 15) & ~15;
            this.ptr = hold.alloc(this.bucketBytes + 4 * (nb + 2));
            if (this.ptr === 0) throw new Error("ZLines: arena allocation failed");
            this.histPtr = this.ptr + this.bucketBytes;
        } else {
            this._bucket = new Uint8Array(nSegs);
        }
        this.bucket.fill(BUCKET_NONE);
    }

    /** The bucket bytes; a view on the arena for a wasm state, valid until the next alloc. */
    get bucket() {
        if (this.wasm && (this._bucket === null || this._gen !== this._hold.arena.generation)) {
            this._bucket = this._hold.arena.view(this.ptr, this.nSegs, Uint8Array);
            this._gen = this._hold.arena.generation;
        }
        return this._bucket;
    }

    release() {
        if (this.wasm && this.ptr !== 0) { this._hold.free(this.ptr); this.ptr = 0; this._bucket = null; }
    }
}

// The frustum planes a clip-space point lies outside of, the sides widened by
// the factors mx, my and the offsets kx, ky.
function outcode(x, y, z, w, mx, my, kx, ky) {
    const wx = w * mx + kx, wy = w * my + ky;
    return (x > wx ? 1 : 0) | (x < -wx ? 2 : 0) | (y > wy ? 4 : 0) | (y < -wy ? 8 : 0) |
           (z > w ? 16 : 0) | (z < -w ? 32 : 0);
}

// The angle between the unit vectors a and b plus 7e-5, an upper bound by the
// error of Abramowitz and Stegun 4.4.45 for acos(u), u = a . b, at a third of
// the cost of Math.acos in the walk. 1 - |u| is taken as |a - b|^2 / 2
// (|a + b|^2 / 2 for u < 0), which does not cancel near u = 1; the wasm walk
// computes in floats and needs that, and this one does the same to agree.
function angleUpper(ax, ay, az, bx, by, bz) {
    const u = ax * bx + ay * by + az * bz;
    const ex = u < 0 ? ax + bx : ax - bx, ey = u < 0 ? ay + by : ay - by, ez = u < 0 ? az + bz : az - bz;
    const w = Math.min(1, 0.5 * (ex * ex + ey * ey + ez * ez));
    const x = 1 - w;
    const r = Math.sqrt(w) * (1.5707288 + x * (-0.2121144 + x * (0.0742610 - 0.0187293 * x)));
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
 * walks the segments whenever the projection-view matrix changed, or the
 * viewport is one the last walk does not serve: it projects every point once,
 * takes each segment's screen length s
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
 * One walk per camera change serves every pass. n grows with the square root
 * of the screen length, so a bucket computed for a larger viewport is never
 * too coarse for a smaller one; the outline pass at 1x reuses the buckets of
 * the supersampled main pass. update() keeps the viewport sizes drawn
 * recently and walks for the largest width and height among them, with the
 * cull margin of the smallest, since a width in pixels reaches further into a
 * smaller viewport. The pick pass narrows the projection to a small window
 * around the cursor; its matrix is the walk's with clip x and y scaled and
 * offset, and its pixels are the main pass's, so it reuses the walk as well,
 * found by that relation rather than by an equal matrix. A pick near the edge
 * of the screen, whose window reaches past the walked frustum, walks into a
 * state of its own and leaves the shared one. Any other pass with a new
 * matrix, or a size outside the walked range, walks again for all.
 *
 * The walk runs in wasm when the kernel src/wasm/zlines_walk.c is loaded and
 * `wasm` is on, else in JS (the kernel loads asynchronously, and needs wasm
 * SIMD). The kernel reads the points and tables where they lie when the
 * textures' images are views on the arena (WasmArena), else from a mirror in
 * the arena that setTextures(), pointsChanged() and tablesChanged() mark for a
 * copy. Its scratch is the arena's; the bucket bytes and the histogram are in
 * the arena too, freed by dispose() or when the object is collected.
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
        this._lod = null;          // the LodState the passes share
        this._lodAux = null;       // the LodState of a narrowed pass the shared one does not serve
        this._lodSlot = null;      // the state of the pass being drawn, set by update()
        this._lodSizes = [];       // { vw, vh, lastUse }: the viewports the buckets serve
        this._lodTick = 0;
        this._lodCaps = null;      // bucket capacities, for the ceiling _lodCapsFor
        this._lodCapsFor = -1;
        this._lodClip = null;      // JS walk scratch: projected points and directions
        this._tablesF = null;      // float view of the tables image, for L
        this.lodChanges = 0;       // segments that moved between two drawn buckets
        this.lodWalks = 0;

        // The wasm walk; the JS walk serves until the kernel is loaded.
        this._wasm = args.wasm !== undefined ? !!args.wasm : true;
        this._hold = null;         // ArenaHold, on the first wasm walk
        this._mirrors = { pts: { ptr: 0, bytes: 0, stale: true, src: null },
                          tbl: { ptr: 0, bytes: 0, stale: true, src: null } };
        if (this._wasm) ZLines.loadWasm();
    }

    /**
     * Starts loading the walk kernel into the page's arena, once; resolves to
     * the kernel's exports, or null without wasm SIMD.
     */
    static loadWasm() {
        if (typeof WebAssembly !== "object" || !WasmArena.simdSupported()) return Promise.resolve(null);
        if (ZLines._wasmLoad === undefined) {
            ZLines._wasmLoad = WasmArena.shared().loadKernel(WASM_KERNEL, ZLINES_WALK_WASM)
                .then((K) => { ZLines._warmUp(K, WasmArena.shared()); return K; })
                .catch(() => null);
        }
        return ZLines._wasmLoad;
    }

    /**
     * Three walks over 2048 made-up segments. V8 runs a new wasm function in
     * its baseline compiler until it has used a budget of work, and tiers up
     * only on a later call; measured in node, the first real walk of 179 000
     * segments took 21 ms without this and 11 with it, against 7 once tiered.
     */
    static _warmUp(K, A) {
        const nSegs = 2048, nPts = 1024, segBase = 2;
        const tb = A.alloc(16 * (segBase + 2 * nSegs)), pts = A.alloc(48 * nPts), clip = A.alloc(32 * nPts);
        const par = A.alloc(4 * (16 + WASM_MAX_CAPS)), bk = A.alloc(nSegs), hist = A.alloc(4 * 8);
        if (tb && pts && clip && par && bk && hist) {
            A.view(par, 4 * 21, Float32Array).set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, -1, 0, 0, 5, 5, 1, 2, 4, 8, 12]);
            const P = A.view(pts, 48 * nPts, Float32Array);
            for (let i = 0; i < nPts; ++i) { P[12 * i] = Math.sin(i); P[12 * i + 1] = Math.cos(i); P[12 * i + 3] = 1; P[12 * i + 4] = 1; }
            const T = A.view(tb, 16 * (segBase + 2 * nSegs), Int32Array);
            const TF = new Float32Array(T.buffer, T.byteOffset, T.length);
            for (let s = 0, o = 4 * segBase; s < nSegs; ++s, o += 8) {
                T[o] = s % (nPts - 1); T[o + 1] = T[o] + 1; TF[o + 2] = 0.1; T[o + 4] = -1; T[o + 5] = -1;
            }
            const B = A.view(bk, nSegs, Uint8Array);
            for (let i = 0; i < 3; ++i) {
                B.fill(BUCKET_NONE);
                K.walk(pts, nPts, tb, segBase, nSegs, par, 1200, 800, 1200, 800, 2, 1.5, 1, 1, 1, 1,
                       par + 64, 5, clip, bk, hist);
            }
        }
        for (const p of [tb, pts, clip, par, bk, hist]) if (p) A.free(p);
    }

    /** The kernel's exports if this object walks in wasm now, else null. */
    _wasmKernel() {
        if (!this._wasm || WasmArena._shared === undefined) return null;
        if (this._lodCaps !== null && this._lodCaps.length > WASM_MAX_CAPS) return null;
        return WasmArena._shared.kernel(WASM_KERNEL);
    }

    /** Walk in wasm when the kernel is loaded (default), or always in JS. */
    get wasm() { return this._wasm; }
    set wasm(b) {
        this._wasm = !!b;
        if (this._wasm) ZLines.loadWasm();
        this._lodInvalidate();
    }

    /**
     * Frees the arena memory of this object: the walk state and the mirrors.
     * The object still draws afterwards, and allocates again on its next walk.
     */
    dispose() {
        this._lodRelease();
        this._releaseMirrors();
        if (this._hold !== null) {
            this._hold.release();
            if (arenaFinalizer !== null) arenaFinalizer.unregister(this._hold);
            this._hold = null;
        }
    }

    _releaseMirrors() {
        for (const m of [this._mirrors.pts, this._mirrors.tbl]) {
            if (m.ptr !== 0 && this._hold !== null) this._hold.free(m.ptr);
            m.ptr = 0; m.bytes = 0; m.stale = true; m.src = null;
        }
    }

    _lodRelease() {
        if (this._lod !== null) this._lod.release();
        if (this._lodAux !== null) this._lodAux.release();
        this._lod = this._lodAux = this._lodSlot = null;
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
        this._lodRelease();
        this._mirrors.pts.stale = this._mirrors.tbl.stale = true;
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
        this._mirrors.pts.stale = true;
        this._lodInvalidate();
    }

    /** The tables texture's image changed (visibility, colours): re-upload and re-plan. */
    tablesChanged() {
        if (this._tablesTex) this._tablesTex.needsUpload();
        this._mirrors.tbl.stale = true;
        this._plan = null;
        this._lodInvalidate();
    }

    /** Re-walk on the next update and rebuild every list; the buckets stay for the hysteresis. */
    _lodInvalidate() {
        for (const s of [this._lod, this._lodAux])
            if (s !== null) { s.valid = false; s.dirty = -1; s.plan = null; }
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
            this._lodRelease();       // the bucket bytes index the old capacities
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
        const P = camera.projectionMatrix.elements;

        // This pass in the last walk's terms. The pick pass narrows the
        // projection to a window around the cursor: its matrix is the walk's
        // with clip x and y scaled by ax, ay and offset by bx w, by w, and its
        // pixels are those of a viewport ax vw by ay vh with the walk's
        // matrix. A pass with the walk's matrix has ax = ay = 1; so do the
        // other passes of the same frame, at their own viewports.
        const st = this._lod;
        const rel = st !== null && st.valid ? ZLines._clipRelation(st.pv, pe) : null;
        const tick = ++this._lodTick;

        if (rel !== null) {
            // The walk serves this pass if its pixels are no larger than the
            // walk's and no smaller than the margin's, and its window lies in
            // the walk's frustum, widened by the strip's margin.
            const ew = Math.round(rel[0] * vw), eh = Math.round(rel[2] * vh);
            const margin = this._lodExtent()[1];
            const sx = 2 * margin / st.mw, sy = 2 * margin / st.mh;
            if (ew <= st.vw && eh <= st.vh && ew >= st.mw && eh >= st.mh &&
                Math.abs(rel[1]) <= rel[0] * (1 + sx) - 1 + 1e-6 && Math.abs(rel[3]) <= rel[2] * (1 + sy) - 1 + 1e-6) {
                this._lodSize(ew, eh, tick);
                this._lodSlot = st;
                return;
            }
            // A window pass it does not serve, drawn into a viewport smaller
            // than any the walk serves: the pick near the edge of the screen,
            // whose window reaches past the frustum. It walks on its own, and
            // the walk the other passes share stays. Any other pass is a new
            // camera, an orthographic zoom or pan being one too.
            if (vw < st.mw && vh < st.mh) {
                let aux = this._lodAux;
                const relA = aux !== null && aux.valid ? ZLines._clipRelation(aux.pv, pe) : null;
                if (relA === null || !ZLines._isIdentity(relA) || aux.vw !== vw || aux.vh !== vh) {
                    aux = this._lodWalkInto(aux, pe, P, vw, vh, vw, vh);
                    this._lodAux = aux;
                }
                this._lodSlot = aux;
                return;
            }
        }

        // This pass's matrix is the new reference. Walk for the largest width
        // and height among the recent sizes, with the cull margin of the
        // smallest; sizes from before a camera change stay until they age.
        this._lodSize(vw, vh, tick);
        const sizes = this._lodSizes;
        for (let i = sizes.length - 1; i >= 0; --i) if (tick - sizes[i].lastUse > LOD_SIZE_AGE) sizes.splice(i, 1);
        let W = 0, H = 0, MW = Infinity, MH = Infinity;
        for (const s of sizes) { W = Math.max(W, s.vw); H = Math.max(H, s.vh); MW = Math.min(MW, s.vw); MH = Math.min(MH, s.vh); }
        this._lod = this._lodWalkInto(st, pe, P, W, H, MW, MH);
        if (this._lodAux !== null) this._lodAux.valid = false;
        this._lodSlot = this._lod;
    }

    /** Records a viewport size the walk is to serve, or refreshes it. */
    _lodSize(vw, vh, tick) {
        const sizes = this._lodSizes;
        let sz = null;
        for (const s of sizes) if (s.vw === vw && s.vh === vh) { sz = s; break; }
        if (sz === null) {
            if (sizes.length >= LOD_MAX_SIZES) {
                let lru = 0;
                for (let i = 1; i < sizes.length; ++i) if (sizes[i].lastUse < sizes[lru].lastUse) lru = i;
                sizes.splice(lru, 1);
            }
            sz = { vw: vw, vh: vh, lastUse: 0 };
            sizes.push(sz);
        }
        sz.lastUse = tick;
    }

    static _isIdentity(rel) {
        return Math.abs(rel[0] - 1) < 1e-6 && Math.abs(rel[1]) < 1e-6 && Math.abs(rel[2] - 1) < 1e-6 && Math.abs(rel[3]) < 1e-6;
    }

    /**
     * Walks for the matrix pe and the viewports, into st when it has the
     * right kind and size, else into a new state; returns the state.
     */
    _lodWalkInto(st, pe, P, W, H, MW, MH) {
        const K = this._wasmKernel();
        if (st !== null && (st.nSegs !== this.nSegs || st.nb !== this._lodCaps.length)) {
            st.release();
            st = null;
        }
        if (st !== null && st.wasm !== (K !== null)) {
            // The kernel arrived, or wasm was turned off: the buckets move to
            // the other kind of state, so the hysteresis carries over.
            const old = st;
            st = this._lodNewState(K !== null);
            st.bucket.set(old.bucket);
            old.release();
        }
        if (st === null) st = this._lodNewState(K !== null);
        st.pv.set(pe);
        st.vw = W; st.vh = H; st.mw = MW; st.mh = MH;
        if (!st.wasm || !this._lodWalkWasm(st, P[0], P[5], K)) {
            if (st.wasm) {
                // The arena could not take the data: walk in JS from now on.
                console.warn("ZLines: wasm walk failed, walking in JS");
                this._wasm = false;
                st.release();
                st = this._lodNewState(false);
                st.pv.set(pe);
                st.vw = W; st.vh = H; st.mw = MW; st.mh = MH;
            }
            this._lodWalkJS(st, P[0], P[5]);
        }
        st.valid = true;
        return st;
    }

    _lodNewState(wasm) {
        if (wasm) {
            if (this._hold === null) {
                this._hold = new ArenaHold(WasmArena.shared());
                if (arenaFinalizer !== null) arenaFinalizer.register(this, this._hold, this._hold);
            }
            try { return new LodState(this.nSegs, this._lodCaps.length, this._hold); }
            catch (e) { console.warn("ZLines:", e.message, "- walking in JS"); this._wasm = false; }
        }
        return new LodState(this.nSegs, this._lodCaps.length, null);
    }

    /**
     * [ax, bx, ay, by] if the projection-view matrix b is a, column-major,
     * with clip x replaced by ax x + bx w and clip y by ay y + by w, ax and ay
     * positive; else null. Rows z and w must agree to LOD_STAMP_EPS of the
     * largest element, rows x and y to that times the scale.
     */
    static _clipRelation(a, b) {
        let m = 0;
        for (let i = 0; i < 16; ++i) m = Math.max(m, Math.abs(a[i]));
        const eps = LOD_STAMP_EPS * m;
        for (let c = 0; c < 16; c += 4)
            if (Math.abs(b[c + 2] - a[c + 2]) > eps || Math.abs(b[c + 3] - a[c + 3]) > eps) return null;
        const out = [];
        for (let r = 0; r < 2; ++r) {
            // Least squares for b_r = s a_r + t a_3 over the four columns.
            let rr = 0, r3 = 0, t3 = 0, pr = 0, p3 = 0;
            for (let c = 0; c < 16; c += 4) {
                const x = a[c + r], y = a[c + 3], p = b[c + r];
                rr += x * x; r3 += x * y; t3 += y * y; pr += p * x; p3 += p * y;
            }
            const det = rr * t3 - r3 * r3;
            if (!(det > 1e-12 * rr * t3)) return null;
            const sc = (pr * t3 - p3 * r3) / det, of = (rr * p3 - r3 * pr) / det;
            if (!(sc > 0)) return null;
            for (let c = 0; c < 16; c += 4)
                if (Math.abs(b[c + r] - sc * a[c + r] - of * a[c + 3]) > eps * Math.max(1, sc)) return null;
            out.push(sc, of);
        }
        return out;
    }

    /** The strip's extent beyond the centre line, for the cull: [hw, margin]. */
    _lodExtent() {
        let hw = 0, margin = 0;
        for (const m of this.materials) { hw = Math.max(hw, 0.5 * m.lineWidth); margin = Math.max(margin, m.margin); }
        return [hw, margin];
    }

    /** The bookkeeping after a walk, either one. */
    _lodWalked(st, culled, changes, dirty, ms) {
        st.culled = culled;
        st.dirty |= dirty;
        if (dirty !== 0) st.plan = null;
        ++st.version;
        this.lodChanges += changes;
        ++this.lodWalks;
        st.walkMs = ms;
    }

    /**
     * The arena address of a texture's image for the kernel: the image itself
     * when it is a view on the arena, else a mirror, copied when stale.
     * Returns 0 when the arena cannot take it.
     */
    _wasmSource(m, img) {
        const A = this._hold.arena;
        if (A.owns(img) && (img.byteOffset & 15) === 0) {
            if (m.ptr !== 0) { this._hold.free(m.ptr); m.ptr = 0; m.bytes = 0; }
            m.stale = true;
            return img.byteOffset;
        }
        if (m.ptr === 0 || m.bytes < img.byteLength) {
            if (m.ptr !== 0) this._hold.free(m.ptr);
            m.ptr = this._hold.alloc(img.byteLength);
            m.bytes = m.ptr !== 0 ? img.byteLength : 0;
            m.stale = true;
            if (m.ptr === 0) return 0;
        }
        if (m.stale || m.src !== img) {
            A.view(m.ptr, img.byteLength, Uint8Array).set(new Uint8Array(img.buffer, img.byteOffset, img.byteLength));
            m.stale = false;
            m.src = img;
        }
        return m.ptr;
    }

    /** The walk in wasm, src/wasm/zlines_walk.c; false when the arena cannot take the data. */
    _lodWalkWasm(st, P00, P11, K) {
        const pts = this._pointsTex.image, tb = this._tablesTex.image;
        const caps = this._lodCaps, nb = caps.length;
        const nP = (pts.length / 12) | 0;
        // Every allocation first: one may grow the memory, which kills the views.
        const t0 = performance.now();
        const ptsPtr = this._wasmSource(this._mirrors.pts, pts);
        const tblPtr = this._wasmSource(this._mirrors.tbl, tb);
        // Scratch: the matrix, the capacities, then 8 floats per point.
        const sp = this._hold.arena.scratch(4 * (16 + WASM_MAX_CAPS + 8 * nP));
        if (ptsPtr === 0 || tblPtr === 0 || sp === 0) return false;
        const A = this._hold.arena;
        const f = A.view(sp, 4 * (16 + WASM_MAX_CAPS), Float32Array);
        f.set(st.pv);
        for (let i = 0; i < nb; ++i) f[16 + i] = caps[i];
        const [hw, margin] = this._lodExtent();
        const t1 = performance.now();
        const culled = K.walk(ptsPtr, nP, tblPtr, this.segBase, this.nSegs, sp,
                              st.vw, st.vh, st.mw, st.mh, 8 * this._lodTolerance, hw, margin,
                              this.material.screenWidth ? 1 : 0, P00, P11,
                              sp + 64, nb, sp + 4 * (16 + WASM_MAX_CAPS), st.ptr, st.histPtr);
        const t2 = performance.now();
        const h = A.view(st.histPtr, 4 * (nb + 2), Int32Array);
        st.hist.set(h.subarray(0, nb));
        st.syncMs = t1 - t0;
        this._lodWalked(st, culled, h[nb], h[nb + 1], t2 - t1);
        return true;
    }

    /**
     * The walk in JS, the same algorithm as the kernel, in doubles: bucket
     * bytes for every segment. P00 and P11 are the projection's scales, for
     * the cull margin of world-unit widths.
     */
    _lodWalkJS(slot, P00, P11) {
        const t0 = performance.now();
        const pts = this._pointsTex.image;
        const tb = this._tablesTex.image;
        if (this._tablesF === null || this._tablesF.buffer !== tb.buffer ||
            this._tablesF.byteOffset !== tb.byteOffset || this._tablesF.length !== tb.length)
            this._tablesF = new Float32Array(tb.buffer, tb.byteOffset, tb.length);
        const tf = this._tablesF;
        const caps = this._lodCaps, nb = caps.length, top = nb - 1;
        const caps2 = caps.map((c) => c * c);
        const bucket = slot.bucket, hist = slot.hist;
        const vw = slot.vw, vh = slot.vh, hx = 0.5 * vw, hy = 0.5 * vh;
        const mw = slot.mw, mh = slot.mh;
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
        const [hw, margin] = this._lodExtent();
        const screen = this.material.screenWidth;
        const aP00 = Math.abs(P00), aP11 = Math.abs(P11);

        hist.fill(0);
        let culled = 0, changes = 0, dirty = 0;
        // Hull points 0 to 3: p0, p0 + L d0 / 3, p1 - L d1 / 3, p1, in clip space.
        const segBase = this.segBase;
        for (let s = 0, o = 4 * segBase; s < this.nSegs; ++s, o += 8) {
            const i0 = tb[o], i1 = tb[o + 1], L = tf[o + 2];
            // A straight segment takes the chord as both tangents, which is
            // the fallback below for a zero direction and no neighbour.
            const straight = (tb[o + 6] & ZLinesData.SEG_STRAIGHT) !== 0;
            const iPrev = (straight || (tb[o + 6] & 1)) ? -1 : tb[o + 4], iNext = straight ? -1 : tb[o + 5];
            const a = 12 * i0, b = 12 * i1, ca = 8 * i0, cb = 8 * i1;

            // World chord and the tangents, as the shader takes them.
            let Px = pts[b] - pts[a], Py = pts[b + 1] - pts[a + 1], Pz = pts[b + 2] - pts[a + 2];
            const Pl = Math.sqrt(Px * Px + Py * Py + Pz * Pz);
            const cx = Pl > 0 ? Px / Pl : 0, cy = Pl > 0 ? Py / Pl : 0, cz = Pl > 0 ? Pz / Pl : 0;

            // d0 and its clip image; a zero direction is the Catmull-Rom estimate
            // p1 - pPrev, or the chord, normalized in world space.
            let d0x = straight ? 0 : pts[a + 4], d0y = straight ? 0 : pts[a + 5], d0z = straight ? 0 : pts[a + 6];
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
            let d1x = straight ? 0 : pts[b + 4], d1y = straight ? 0 : pts[b + 5], d1z = straight ? 0 : pts[b + 6];
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
            if (screen) { mx = 1 + 2 * (hw * W + margin) / mw; my = 1 + 2 * (hw * W + margin) / mh; kx = ky = 0; }
            else        { mx = 1 + 2 * margin / mw; my = 1 + 2 * margin / mh; kx = hw * W * aP00; ky = hw * W * aP11; }
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
                let need2;
                if (wmin <= LOD_W_EPS) {
                    // A hull point behind the camera plane: the top bucket.
                    need2 = Infinity;
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
                    if (straight) {
                        theta = 0;
                    } else if (Pl > 0) {
                        theta = angleUpper(d0x, d0y, d0z, cx, cy, cz) + angleUpper(d1x, d1y, d1z, cx, cy, cz);
                    } else {
                        theta = Math.PI;
                    }
                    // Uniform t bunches the samples at the far end: the nearest
                    // chord is longer than slen / n by up to the ratio of the depths.
                    // The square of the need; the capacities are compared squared.
                    need2 = slen * theta * (wmax / wmin) / tol8;
                }
                let nbk = 0;
                while (nbk < top && caps2[nbk] < need2) ++nbk;
                if (old < nb && nbk < old) {
                    // Down only when below 1 / 1.4 of the lower bucket, then to the
                    // smallest bucket with that headroom.
                    if (need2 * LOD_HYSTERESIS2 < caps2[old - 1]) {
                        while (nbk < old - 1 && need2 * LOD_HYSTERESIS2 >= caps2[nbk]) ++nbk;
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

        slot.syncMs = 0;
        this._lodWalked(slot, culled, changes, dirty, performance.now() - t0);
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
    /**
     * The last walk's numbers: segments per bucket, culled, which walk ran
     * ("wasm" or "js"), its time in ms and the time of the copies into the
     * arena before it, the cumulative bucket changes and walks, the viewport
     * the needs were computed for and the one of the cull margin.
     */
    lodStats() {
        const s = this._lod;
        if (s === null || !s.valid)
            return { buckets: [], caps: [], culled: 0, walk: null, walkMs: 0, syncMs: 0, changes: this.lodChanges, walks: this.lodWalks };
        return { buckets: Array.from(s.hist), caps: this._lodCaps.slice(), culled: s.culled,
                 walk: s.wasm ? "wasm" : "js", walkMs: s.walkMs, syncMs: s.syncMs,
                 changes: this.lodChanges, walks: this.lodWalks, viewport: [s.vw, s.vh], marginViewport: [s.mw, s.mh] };
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
