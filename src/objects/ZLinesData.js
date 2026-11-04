/**
 * The data of a ZLines object in three layers: points, segments and strokes.
 *
 * points: RGBA32F, three texels per point, point p at texel 3p
 *   texel 3p     : x, y, z, W        position; width scale, 1 = the material's width
 *   texel 3p + 1 : dx, dy, dz, S     unit direction, zero = none given; dW/dt
 *   texel 3p + 2 : nx, ny, nz, param ribbon vector, zero = camera-facing; time or path length
 *
 * tables: RGBA32I; texel 0 is the header, strokes from texel 1, segments from segBase
 *   header    at texel 0               : nStrokes, nSegs, segBase, version
 *   stroke k  at texel 1 + k           : firstSeg, nSeg, rgba (0xRRGGBBAA), flags
 *   segment s at texel segBase + 2s     : i0, i1, floatBitsToInt(L), stroke
 *                      segBase + 2s + 1 : iPrev, iNext, flags, spare   (-1 = no neighbour)
 *
 * Stroke flags: bit 0 visible. Segment flags: bit 0 break, no join to the
 * previous segment; bit 1 cap at the start; bit 2 cap at the end; bit 3
 * straight, the chord as both tangents whatever the directions and the
 * neighbours, so that a polyline is drawn with straight segments and the level
 * of detail gives the segment one quad.
 * segBase is 1 + nStrokes rounded up to an even number. The header makes the
 * texture self-describing: ZLines reads the counts from it.
 *
 * Both arrays are allocated at the full size of their texture, so each array
 * is the texture's image as it is; the tables array is also what the draw
 * planner of ZLines walks.
 */
export class ZLinesData {
    static VERSION = 1;
    static STROKE_VISIBLE = 1;
    static SEG_BREAK = 1;
    static SEG_CAP_START = 2;
    static SEG_CAP_END = 4;
    static SEG_STRAIGHT = 8;

    constructor(nPoints, nSegs, nStrokes) {
        this.nPoints = nPoints; this.nSegs = nSegs; this.nStrokes = nStrokes;
        this.segBase = ZLinesData.segBaseFor(nStrokes);
        this.pointsSize = ZLinesData.textureSize(3 * nPoints);
        this.tablesSize = ZLinesData.textureSize(this.segBase + 2 * nSegs);
        this.points  = new Float32Array(4 * this.pointsSize[0] * this.pointsSize[1]);
        this.tables  = new Int32Array(4 * this.tablesSize[0] * this.tablesSize[1]);
        this.tablesF = new Float32Array(this.tables.buffer);   // the view that writes and reads L
        this.tables.set([nStrokes, nSegs, this.segBase, ZLinesData.VERSION], 0);
    }

    /**
     * Adopt arrays that a server packed: points and tables already padded to
     * their texture sizes, which the caller passes along with the counts. This
     * is the path REve takes, with the arrays as views into the scene's binary
     * blob; nothing is copied.
     */
    static fromArrays(points, tables, pointsSize, tablesSize) {
        const d = Object.create(ZLinesData.prototype);
        if (tables[3] !== ZLinesData.VERSION)
            throw new Error("ZLinesData.fromArrays: tables header version " + tables[3] + ", expected " + ZLinesData.VERSION);
        d.nStrokes = tables[0]; d.nSegs = tables[1]; d.segBase = tables[2];
        d.nPoints = (points.length / 12) | 0;
        d.pointsSize = pointsSize; d.tablesSize = tablesSize;
        if (points.length < 4 * pointsSize[0] * pointsSize[1])
            throw new Error("ZLinesData.fromArrays: points array smaller than its texture");
        if (tables.length < 4 * tablesSize[0] * tablesSize[1])
            throw new Error("ZLinesData.fromArrays: tables array smaller than its texture");
        d.points = points; d.tables = tables;
        d.tablesF = new Float32Array(tables.buffer, tables.byteOffset, tables.length);
        return d;
    }

    /** The segment table starts after the header and the strokes, on an even texel. */
    static segBaseFor(nStrokes) { const n = 1 + nStrokes; return n + (n & 1); }

    /** Texture dimensions for n RGBA texels: even width near the square root of n. */
    static textureSize(nTexels) {
        let w = Math.ceil(Math.sqrt(Math.max(1, nTexels)));
        if (w % 2) ++w;
        return [w, Math.max(1, Math.ceil(nTexels / w))];
    }

    setPoint(p, x, y, z, dx, dy, dz, W = 1, S = 0, nx = 0, ny = 0, nz = 0, param = 0) {
        const a = this.points, o = 12 * p;
        a[o]     = x;  a[o + 1] = y;  a[o + 2]  = z;  a[o + 3]  = W;
        a[o + 4] = dx; a[o + 5] = dy; a[o + 6]  = dz; a[o + 7]  = S;
        a[o + 8] = nx; a[o + 9] = ny; a[o + 10] = nz; a[o + 11] = param;
    }
    setStroke(k, firstSeg, nSeg, rgba, flags = ZLinesData.STROKE_VISIBLE) {
        const a = this.tables, o = 4 * (1 + k);
        a[o] = firstSeg; a[o + 1] = nSeg; a[o + 2] = rgba | 0; a[o + 3] = flags;
    }
    setSegment(s, i0, i1, L, stroke, iPrev = -1, iNext = -1, flags = 0) {
        const a = this.tables, o = 4 * (this.segBase + 2 * s);
        a[o] = i0; a[o + 1] = i1; this.tablesF[o + 2] = L; a[o + 3] = stroke;
        a[o + 4] = iPrev; a[o + 5] = iNext; a[o + 6] = flags; a[o + 7] = 0;
    }

    // readers the planner uses
    strokeFirstSeg(k) { return this.tables[4 * (1 + k)]; }
    strokeCount(k)    { return this.tables[4 * (1 + k) + 1]; }
    strokeColor(k)    { return this.tables[4 * (1 + k) + 2] >>> 0; }
    strokeFlags(k)    { return this.tables[4 * (1 + k) + 3]; }
    strokeVisible(k)  { return (this.tables[4 * (1 + k) + 3] & ZLinesData.STROKE_VISIBLE) !== 0; }
    setStrokeVisible(k, on) {
        if (on) this.tables[4 * (1 + k) + 3] |=  ZLinesData.STROKE_VISIBLE;
        else    this.tables[4 * (1 + k) + 3] &= ~ZLinesData.STROKE_VISIBLE;
    }
    segStroke(s) { return this.tables[4 * (this.segBase + 2 * s) + 3]; }
    segLength(s) { return this.tablesF[4 * (this.segBase + 2 * s) + 2]; }
}

/**
 * Appends points, then strokes made of segments, and builds a ZLinesData.
 * A stroke's segments are appended between beginStroke() and endStroke(), so
 * they are contiguous by construction.
 *
 * Segment flags, such as ZLinesData.SEG_STRAIGHT, are given per segment to
 * addSegment() and addPolyline(), or per stroke to beginStroke(), which ORs
 * them into every segment of the stroke.
 */
export class ZLinesBuilder {
    constructor() {
        this._points = [];   // 12 numbers per point
        this._segs = [];     // 8 numbers per segment: i0, i1, L, stroke, iPrev, iNext, flags, spare
        this._strokes = [];  // 4 numbers per stroke
        this._open = -1;     // index of the open stroke
        this._segFlags = 0;  // flags ORed into every segment of the open stroke
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

    /** segFlags are ORed into the flags of every segment of the stroke. */
    beginStroke(rgba, flags = ZLinesData.STROKE_VISIBLE, segFlags = 0) {
        if (this._open >= 0) throw new Error("ZLinesBuilder: a stroke is already open");
        this._open = this.nStrokes;
        this._segFlags = segFlags;
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
        this._segs.push(i0, i1, L, this._open, iPrev, iNext, flags | this._segFlags, 0);
        ++this._strokes[4 * this._open + 1];
        return this.nSegs - 1;
    }

    /** Segments through consecutive points of idx, with iPrev and iNext set;
     *  lens[i] is the arc length from idx[i] to idx[i + 1], the chord if not given. */
    addPolyline(idx, lens = undefined, flags = 0) {
        const n = idx.length;
        for (let i = 0; i + 1 < n; ++i) {
            this.addSegment(idx[i], idx[i + 1], lens ? lens[i] : undefined,
                            i > 0 ? idx[i - 1] : -1, i + 2 < n ? idx[i + 2] : -1, flags);
        }
    }

    /** Returns the stroke index. */
    endStroke() {
        const k = this._open;
        this._open = -1;
        this._segFlags = 0;
        return k;
    }

    build() {
        if (this._open >= 0) this.endStroke();
        const d = new ZLinesData(this.nPoints, this.nSegs, this.nStrokes);
        d.points.set(this._points);
        d.tables.set(this._strokes, 4);
        for (let s = 0, o = 4 * d.segBase; s < d.nSegs; ++s, o += 8) {
            const g = this._segs, q = 8 * s;
            d.tables[o] = g[q]; d.tables[o + 1] = g[q + 1]; d.tablesF[o + 2] = g[q + 2];
            d.tables[o + 3] = g[q + 3]; d.tables[o + 4] = g[q + 4]; d.tables[o + 5] = g[q + 5];
            d.tables[o + 6] = g[q + 6]; d.tables[o + 7] = g[q + 7];
        }
        return d;
    }
}
