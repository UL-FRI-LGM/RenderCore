import {Mesh} from './Mesh.js';
import {Geometry} from './Geometry.js';
import {Texture} from '../textures/Texture.js';
import {Int32Attribute} from '../core/BufferAttribute.js';
import {ZLinesBasicMaterial} from '../materials/ZLinesBasicMaterial.js';

/**
 * The data of a ZLines object in three layers: points, segments and strokes.
 *
 * points: RGBA32F, three texels per point, point p at texel 3p
 *   texel 3p     : x, y, z, W        position; width scale, 1 = the material's width
 *   texel 3p + 1 : dx, dy, dz, S     unit direction, zero = none given; dW/dt
 *   texel 3p + 2 : nx, ny, nz, param ribbon vector, zero = camera-facing; time or path length
 *
 * tables: RGBA32I; strokes from texel 0, segments from texel segBase
 *   stroke k  at texel k               : firstSeg, nSeg, rgba (0xRRGGBBAA), flags
 *   segment s at texel segBase + 2s     : i0, i1, floatBitsToInt(L), stroke
 *                      segBase + 2s + 1 : iPrev, iNext, flags, spare   (-1 = no neighbour)
 *
 * Stroke flags: bit 0 visible. Segment flags: bit 0 break, no join to the
 * previous segment; bit 1 cap at the start; bit 2 cap at the end.
 * segBase is the stroke count rounded up to an even number.
 *
 * Both arrays are allocated at the full size of their texture, so each array
 * is the texture's image as it is; the tables array is also what the draw
 * planner of ZLines walks.
 */
export class ZLinesData {
    static STROKE_VISIBLE = 1;
    static SEG_BREAK = 1;
    static SEG_CAP_START = 2;
    static SEG_CAP_END = 4;

    constructor(nPoints, nSegs, nStrokes) {
        this.nPoints = nPoints; this.nSegs = nSegs; this.nStrokes = nStrokes;
        this.segBase = nStrokes + (nStrokes & 1);
        this.pointsSize = ZLines.textureSize(3 * nPoints);
        this.tablesSize = ZLines.textureSize(this.segBase + 2 * nSegs);
        this.points  = new Float32Array(4 * this.pointsSize[0] * this.pointsSize[1]);
        this.tables  = new Int32Array(4 * this.tablesSize[0] * this.tablesSize[1]);
        this.tablesF = new Float32Array(this.tables.buffer);   // the view that writes and reads L
    }

    setPoint(p, x, y, z, dx, dy, dz, W = 1, S = 0, nx = 0, ny = 0, nz = 0, param = 0) {
        const a = this.points, o = 12 * p;
        a[o]     = x;  a[o + 1] = y;  a[o + 2]  = z;  a[o + 3]  = W;
        a[o + 4] = dx; a[o + 5] = dy; a[o + 6]  = dz; a[o + 7]  = S;
        a[o + 8] = nx; a[o + 9] = ny; a[o + 10] = nz; a[o + 11] = param;
    }
    setStroke(k, firstSeg, nSeg, rgba, flags = ZLinesData.STROKE_VISIBLE) {
        const a = this.tables, o = 4 * k;
        a[o] = firstSeg; a[o + 1] = nSeg; a[o + 2] = rgba | 0; a[o + 3] = flags;
    }
    setSegment(s, i0, i1, L, stroke, iPrev = -1, iNext = -1, flags = 0) {
        const a = this.tables, o = 4 * (this.segBase + 2 * s);
        a[o] = i0; a[o + 1] = i1; this.tablesF[o + 2] = L; a[o + 3] = stroke;
        a[o + 4] = iPrev; a[o + 5] = iNext; a[o + 6] = flags; a[o + 7] = 0;
    }

    // readers the planner uses
    strokeFirstSeg(k) { return this.tables[4 * k]; }
    strokeCount(k)    { return this.tables[4 * k + 1]; }
    strokeColor(k)    { return this.tables[4 * k + 2] >>> 0; }
    strokeFlags(k)    { return this.tables[4 * k + 3]; }
    strokeVisible(k)  { return (this.tables[4 * k + 3] & ZLinesData.STROKE_VISIBLE) !== 0; }
    setStrokeVisible(k, on) {
        if (on) this.tables[4 * k + 3] |=  ZLinesData.STROKE_VISIBLE;
        else    this.tables[4 * k + 3] &= ~ZLinesData.STROKE_VISIBLE;
    }
    segStroke(s) { return this.tables[4 * (this.segBase + 2 * s) + 3]; }
    segLength(s) { return this.tablesF[4 * (this.segBase + 2 * s) + 2]; }
}

/**
 * Appends points, then strokes made of segments, and builds a ZLinesData.
 * A stroke's segments are appended between beginStroke() and endStroke(), so
 * they are contiguous by construction.
 */
export class ZLinesBuilder {
    constructor() {
        this._points = [];   // 12 numbers per point
        this._segs = [];     // 8 numbers per segment: i0, i1, L, stroke, iPrev, iNext, flags, spare
        this._strokes = [];  // 4 numbers per stroke
        this._open = -1;     // index of the open stroke
    }

    get nPoints()  { return this._points.length / 12; }
    get nSegs()    { return this._segs.length / 8; }
    get nStrokes() { return this._strokes.length / 4; }

    /** Pack r, g, b, a in [0, 1] as 0xRRGGBBAA in a signed int. */
    static rgba(r, g, b, a = 1) {
        const c = (v) => Math.max(0, Math.min(255, Math.round(255 * v)));
        return ((c(r) << 24) | (c(g) << 16) | (c(b) << 8) | c(a)) | 0;
    }

    /** Returns the point index. */
    addPoint(x, y, z, dx = 0, dy = 0, dz = 0, W = 1, S = 0, nx = 0, ny = 0, nz = 0, param = 0) {
        this._points.push(x, y, z, W, dx, dy, dz, S, nx, ny, nz, param);
        return this.nPoints - 1;
    }

    beginStroke(rgba, flags = ZLinesData.STROKE_VISIBLE) {
        if (this._open >= 0) throw new Error("ZLinesBuilder: a stroke is already open");
        this._open = this.nStrokes;
        this._strokes.push(this.nSegs, 0, rgba | 0, flags);
        return this._open;
    }

    /** Returns the segment index. Without L the arc length is the chord. */
    addSegment(i0, i1, L = undefined, iPrev = -1, iNext = -1, flags = 0) {
        if (this._open < 0) throw new Error("ZLinesBuilder: no open stroke");
        if (L === undefined) {
            const p = this._points, a = 12 * i0, b = 12 * i1;
            L = Math.hypot(p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]);
        }
        this._segs.push(i0, i1, L, this._open, iPrev, iNext, flags, 0);
        ++this._strokes[4 * this._open + 1];
        return this.nSegs - 1;
    }

    /** Segments through consecutive points of idx, with iPrev and iNext set;
     *  lens[i] is the arc length from idx[i] to idx[i + 1], the chord if not given. */
    addPolyline(idx, lens = undefined) {
        const n = idx.length;
        for (let i = 0; i + 1 < n; ++i) {
            this.addSegment(idx[i], idx[i + 1], lens ? lens[i] : undefined,
                            i > 0 ? idx[i - 1] : -1, i + 2 < n ? idx[i + 2] : -1);
        }
    }

    /** Returns the stroke index. */
    endStroke() {
        const k = this._open;
        this._open = -1;
        return k;
    }

    build() {
        if (this._open >= 0) this.endStroke();
        const d = new ZLinesData(this.nPoints, this.nSegs, this.nStrokes);
        d.points.set(this._points);
        d.tables.set(this._strokes);
        for (let s = 0, o = 4 * d.segBase; s < d.nSegs; ++s, o += 8) {
            const g = this._segs, q = 8 * s;
            d.tables[o] = g[q]; d.tables[o + 1] = g[q + 1]; d.tablesF[o + 2] = g[q + 2];
            d.tables[o + 3] = g[q + 3]; d.tables[o + 4] = g[q + 4]; d.tables[o + 5] = g[q + 5];
            d.tables[o + 6] = g[q + 6]; d.tables[o + 7] = g[q + 7];
        }
        return d;
    }
}

/**
 * A set of lines drawn with instanced draw calls, one instance per segment.
 * A segment is a cubic Hermite between two points, evaluated in the vertex
 * shader from the points' positions and directions and the segment's arc
 * length; a zero direction is replaced by the Catmull-Rom estimate from the
 * neighbour points. The data layout is described at ZLinesData.
 *
 * The strip has 2 * (samples + 1) vertices and no vertex buffer: the shader
 * derives t and the side from gl_VertexID. The strip is drawn u_Margin pixels
 * wider than the line and the fragment shader cuts and antialiases the edge on
 * the distance from the centre line.
 *
 * draw() is the visibility planner: it walks the stroke table, merges
 * consecutive visible strokes into runs of segments and issues one draw per
 * run with u_InstanceOffset set to the run's first segment. Above runThreshold
 * runs it draws a list of the visible segments through the a_Instances
 * attribute instead. The plan is cached; tablesChanged() invalidates it.
 *
 * Picking writes the segment index; the outline pass takes a list of segments
 * through outlineMaterial.outline_instances_setup().
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
        this._data = null;
        this._pointsTex = null;
        this._tablesTex = null;
        this._plan = null;
        this._listAttr = null;
    }

    get materials() { return [this.material, this.pickingMaterial, this.outlineMaterial]; }

    get samples() { return this.material.samples; }
    set samples(n) { for (const m of this.materials) m.samples = n; }

    get lineWidth() { return this.material.lineWidth; }
    set lineWidth(w) { for (const m of this.materials) m.lineWidth = w; }

    get screenWidth() { return this.material.screenWidth; }
    set screenWidth(b) { for (const m of this.materials) m.screenWidth = b; }

    get margin() { return this.material.margin; }
    set margin(px) { for (const m of this.materials) m.margin = px; }

    get data() { return this._data; }

    /** Texture dimensions for n RGBA texels: even width near the square root of n. */
    static textureSize(nTexels) {
        let w = Math.ceil(Math.sqrt(Math.max(1, nTexels)));
        if (w % 2) ++w;
        return [w, Math.max(1, Math.ceil(nTexels / w))];
    }

    static _makeTexture(image, size, internalFormat, format, type) {
        const tex = new Texture(image,
            Texture.WRAPPING.ClampToEdgeWrapping, Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter, Texture.FILTER.NearestFilter,
            internalFormat, format, type, size[0], size[1]);
        tex.flipy = false;
        return tex;
    }

    /** Build the two textures over data.points and data.tables and keep data for draw(). */
    setData(data) {
        this._data = data;
        this._pointsTex = ZLines._makeTexture(data.points, data.pointsSize,
            Texture.FORMAT.RGBA32F, Texture.FORMAT.RGBA, Texture.TYPE.FLOAT);
        this._tablesTex = ZLines._makeTexture(data.tables, data.tablesSize,
            Texture.FORMAT.RGBA32I, Texture.FORMAT.RGBA_INTEGER, Texture.TYPE.INT);
        for (const m of this.materials) {
            m._instanceData = [this._pointsTex, this._tablesTex];
            m.segBase = data.segBase;
        }
        this.instanceCount = data.nSegs;
        this._plan = null;
    }

    /** The point positions changed in data.points: re-upload. */
    pointsChanged() {
        if (this._pointsTex) this._pointsTex.needsUpload();
    }

    /** The tables changed in data.tables (visibility, colours): re-upload and re-plan. */
    tablesChanged() {
        if (this._tablesTex) this._tablesTex.needsUpload();
        this._plan = null;
    }

    /** The draw plan: { runs: [first, count, first, count, ...], nRuns, nVisible, list }. */
    get plan() {
        if (this._plan === null) this._plan = this._makePlan();
        return this._plan;
    }

    _makePlan() {
        const d = this._data;
        const runs = [];
        let nVisible = 0;
        if (d) {
            for (let k = 0; k < d.nStrokes; ++k) {
                const n = d.strokeCount(k);
                if (n <= 0 || !d.strokeVisible(k)) continue;
                const first = d.strokeFirstSeg(k);
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

    draw(gl, glManager, instance_count = 0) {
        const nVert = 2 * (this.material.samples + 1);
        const mat = glManager._currentMaterial;
        const prog = glManager._currentProgram;
        const us = prog.uniformSetter;
        const setOffset = (v) => { if (us.u_InstanceOffset) us.u_InstanceOffset.set(v); };

        // A given list of segments: the outline of a selection.
        if (!instance_count && mat && mat.getUniform("u_GivenInstances"))
            instance_count = mat.getAttribute("a_Instances").count();
        if (instance_count > 0) {
            setOffset(0);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, nVert, instance_count);
            return;
        }

        const plan = this.plan;
        if (plan.nVisible === 0) return;
        if (plan.list) {
            const as = prog.attributeSetter.a_Instances;
            as.set(plan.list, 1, true, 1);
            us.u_GivenInstances.set(true);
            setOffset(0);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, nVert, plan.list.count());
            us.u_GivenInstances.set(false);
            const own = mat.getAttribute("a_Instances");
            as.set(own, 1, true, own.divisor);
        } else {
            const r = plan.runs;
            for (let i = 0; i < r.length; i += 2) {
                setOffset(r[i]);
                gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, nVert, r[i + 1]);
            }
        }
    }
}
