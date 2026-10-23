// The level-of-detail walk of ZLines, the same algorithm as ZLines._lodWalkJS()
// in src/objects/ZLines.js, over the points and tables at pointers in the
// arena memory (src/wasm/WasmArena.js). Built by build.sh into
// zlines_walk.wasm and zlines_walk.wasm.js.
//
// Freestanding: no libc, no libm, no allocator, no static data. The memory is
// imported, and every buffer is allocated by the arena in JS; the module keeps
// only its shadow stack at the bottom of the memory, below the arena's first
// allocation. A kernel with a data segment would overwrite another kernel's
// data when instantiated, so build.sh refuses one.
//
// A texel of the points texture is four floats, so a position (x, y, z, W) or
// a direction (dx, dy, dz, S) is one aligned v128 load, and its projection is
// four multiply-adds against the columns of the projection-view matrix. The
// segments go four at a time: each one's hull points and tangents are
// gathered as texels, then transposed so that a lane is a segment, and the
// cull, the screen length, the turning angle, the need and the bucket are
// computed for the four at once. One segment per vector left most lanes idle
// and took 1.6 to 1.9 times as long in node (V8 12) on a Ryzen 7 2700.
// simd128 only: relaxed SIMD would make the rounding depend on the machine.
//
// Every float operation is the one the JS walk does, in the same order, in
// single instead of double precision; there is no fused multiply-add.

#include <wasm_simd128.h>

typedef unsigned char u8;

#define EXPORT(name) __attribute__((export_name(name)))

#define BUCKET_CULLED 255
#define LOD_W_EPS 1e-6f
// The hysteresis of ZLines, 1.4, on the squares.
#define LOD_HYSTERESIS2 1.96f
#define PI_F 3.14159265358979f
#define MAX_CAPS 32

#define SPLAT(v, i) wasm_i32x4_shuffle(v, v, i, i, i, i)
#define F4(x) wasm_f32x4_splat(x)

static inline float dot3(v128_t a, v128_t b) {
    v128_t m = wasm_f32x4_mul(a, b);
    return wasm_f32x4_extract_lane(m, 0) + wasm_f32x4_extract_lane(m, 1) + wasm_f32x4_extract_lane(m, 2);
}

// Lanes 0 to 2 all zero: no direction given.
static inline int zero3(v128_t d) {
    return (wasm_i32x4_bitmask(wasm_f32x4_eq(d, F4(0.0f))) & 7) == 7;
}

// Four texels to four vectors of their x, y, z and w over the texels.
#define TRANSPOSE(a, b, c, d, X, Y, Z, W) do {                                       \
        const v128_t t0_ = wasm_i32x4_shuffle(a, b, 0, 4, 1, 5);                     \
        const v128_t t1_ = wasm_i32x4_shuffle(c, d, 0, 4, 1, 5);                     \
        const v128_t t2_ = wasm_i32x4_shuffle(a, b, 2, 6, 3, 7);                     \
        const v128_t t3_ = wasm_i32x4_shuffle(c, d, 2, 6, 3, 7);                     \
        X = wasm_i32x4_shuffle(t0_, t1_, 0, 1, 4, 5);                                \
        Y = wasm_i32x4_shuffle(t0_, t1_, 2, 3, 6, 7);                                \
        Z = wasm_i32x4_shuffle(t2_, t3_, 0, 1, 4, 5);                                \
        W = wasm_i32x4_shuffle(t2_, t3_, 2, 3, 6, 7);                                \
    } while (0)

// The angle between the unit vectors a and b, given by components over four
// lanes, plus 7e-5: an upper bound by the error of Abramowitz and Stegun
// 4.4.45 for acos(u), u = a . b. 1 - |u| is taken as |a - b|^2 / 2
// (|a + b|^2 / 2 for u < 0): computed as 1 - u, it cancels near u = 1, and in
// floats the angle of a straight segment would come out as 4e-4 instead of 0.
static inline v128_t angle_upper(v128_t ax, v128_t ay, v128_t az, v128_t bx, v128_t by, v128_t bz) {
    const v128_t u = wasm_f32x4_add(wasm_f32x4_add(wasm_f32x4_mul(ax, bx), wasm_f32x4_mul(ay, by)),
                                    wasm_f32x4_mul(az, bz));
    const v128_t neg = wasm_f32x4_lt(u, F4(0.0f));
    const v128_t ex = wasm_v128_bitselect(wasm_f32x4_add(ax, bx), wasm_f32x4_sub(ax, bx), neg);
    const v128_t ey = wasm_v128_bitselect(wasm_f32x4_add(ay, by), wasm_f32x4_sub(ay, by), neg);
    const v128_t ez = wasm_v128_bitselect(wasm_f32x4_add(az, bz), wasm_f32x4_sub(az, bz), neg);
    v128_t w = wasm_f32x4_mul(F4(0.5f), wasm_f32x4_add(wasm_f32x4_add(wasm_f32x4_mul(ex, ex), wasm_f32x4_mul(ey, ey)),
                                                      wasm_f32x4_mul(ez, ez)));
    w = wasm_f32x4_pmin(F4(1.0f), w);
    const v128_t x = wasm_f32x4_sub(F4(1.0f), w);
    // 1.5707288 + x (-0.2121144 + x (0.0742610 - 0.0187293 x))
    v128_t p = wasm_f32x4_sub(F4(0.0742610f), wasm_f32x4_mul(F4(0.0187293f), x));
    p = wasm_f32x4_add(F4(-0.2121144f), wasm_f32x4_mul(x, p));
    p = wasm_f32x4_add(F4(1.5707288f), wasm_f32x4_mul(x, p));
    const v128_t r = wasm_f32x4_mul(wasm_f32x4_sqrt(w), p);
    return wasm_f32x4_add(wasm_v128_bitselect(wasm_f32x4_sub(F4(PI_F), r), r, neg), F4(7e-5f));
}

// The clip image of a direction that is not given: the Catmull-Rom estimate
// from the point `from` to the point `to`, or the chord a -> b when that
// estimate has zero length, divided by its world length. `dw` receives the
// normalized world direction, for the turning angle.
static inline v128_t est_dir(const float *pts, const float *clip, int from, int to, int a, int b,
                             v128_t chord, float Pl, v128_t *dw) {
    v128_t e = chord;
    float el = Pl;
    int cf = a, ct = b;
    if (from != a || to != b) {
        e = wasm_f32x4_sub(wasm_v128_load(pts + 12 * to), wasm_v128_load(pts + 12 * from));
        el = __builtin_sqrtf(dot3(e, e));
        cf = from; ct = to;
    }
    if (el > 0) {
        const v128_t f = F4(1.0f / el);
        *dw = wasm_f32x4_mul(e, f);
        return wasm_f32x4_mul(wasm_f32x4_sub(wasm_v128_load(clip + 8 * ct), wasm_v128_load(clip + 8 * cf)), f);
    }
    if (Pl > 0) {
        const v128_t f = F4(1.0f / Pl);
        *dw = wasm_f32x4_mul(chord, f);
        return wasm_f32x4_mul(wasm_f32x4_sub(wasm_v128_load(clip + 8 * b), wasm_v128_load(clip + 8 * a)), f);
    }
    *dw = F4(0.0f);
    return F4(0.0f);
}

// One segment's part of a group: its end points and tangents in clip space,
// its chord and tangents in world space, its arc length and the larger width
// scale of its end points. The chord's length, the unit chord and the inner
// hull points are left to the four-lane part, where one square root or
// division serves four segments.
typedef struct {
    v128_t h0, h3, q0, q1, chord, d0, d1;
    float L, Wmax;
} Gathered;

static inline void gather(const float *pts, const float *clip, const int *seg, Gathered *g) {
    const v128_t A = wasm_v128_load(seg), B = wasm_v128_load(seg + 4);
    const int i0 = wasm_i32x4_extract_lane(A, 0), i1 = wasm_i32x4_extract_lane(A, 1);
    const float L = wasm_f32x4_extract_lane(A, 2);
    const int iPrev = (wasm_i32x4_extract_lane(B, 2) & 1) ? -1 : wasm_i32x4_extract_lane(B, 0);
    const int iNext = wasm_i32x4_extract_lane(B, 1);
    const float *pa = pts + 12 * i0, *pb = pts + 12 * i1;

    // World chord and the tangents, as the shader takes them.
    const v128_t Pa = wasm_v128_load(pa), Pb = wasm_v128_load(pb);
    const v128_t chord = wasm_f32x4_sub(Pb, Pa);
    g->chord = chord;
    g->L = L;
    const float Wa = wasm_f32x4_extract_lane(Pa, 3), Wb = wasm_f32x4_extract_lane(Pb, 3);
    g->Wmax = Wa > Wb ? Wa : Wb;

    // d0 and its clip image; a zero direction is the Catmull-Rom estimate
    // p1 - pPrev, or the chord. d1: p(iNext) - p0, or the chord.
    v128_t d0 = wasm_v128_load(pa + 4), d1 = wasm_v128_load(pb + 4);
    const int z0 = zero3(d0), z1 = zero3(d1);
    if (z0 | z1) {
        const float Pl = __builtin_sqrtf(dot3(chord, chord));
        g->q0 = z0 ? est_dir(pts, clip, iPrev >= 0 ? iPrev : i0, i1, i0, i1, chord, Pl, &d0)
                   : wasm_v128_load(clip + 8 * i0 + 4);
        g->q1 = z1 ? est_dir(pts, clip, i0, iNext >= 0 ? iNext : i1, i0, i1, chord, Pl, &d1)
                   : wasm_v128_load(clip + 8 * i1 + 4);
    } else {
        g->q0 = wasm_v128_load(clip + 8 * i0 + 4);
        g->q1 = wasm_v128_load(clip + 8 * i1 + 4);
    }
    g->d0 = d0; g->d1 = d1;
    g->h0 = wasm_v128_load(clip + 8 * i0);
    g->h3 = wasm_v128_load(clip + 8 * i1);
}

/**
 * Writes the bucket byte of every segment and returns the culled count.
 *
 * pts      points texture image, 12 floats per point; 16-byte aligned
 * tbl      tables texture image; segment s at texel segBase + 2 s; 16-byte aligned
 * pv       projection-view matrix, 16 floats, column-major; 16-byte aligned
 * vw, vh   the viewport the needs are computed for
 * mw, mh   the viewport the cull margin is computed for, the smallest one the
 *          buckets serve, since a pixel width is wider there
 * tol8     8 lodTolerance
 * hw       half the widest line width; pixels if screen, else world units
 * margin   the strip's extra margin in pixels
 * p00, p11 the projection's scales, for world-unit widths
 * caps     the bucket capacities, nCaps of them, at most MAX_CAPS
 * clip     scratch, 8 floats per point: clip position and clip direction
 * bucket   one byte per segment, read for the hysteresis and rewritten; the
 *          allocation is padded to a multiple of 16 bytes, which lets the
 *          last group read up to three bytes past nSegs
 * hist     nCaps + 2 ints: segments per bucket, then the count of segments
 *          that moved between two drawn buckets, then the bit mask of the
 *          buckets whose membership changed
 */
EXPORT("walk")
int walk(const float *pts, int nPts, const int *tbl, int segBase, int nSegs,
         const float *pv, float vw, float vh, float mw, float mh, float tol8,
         float hw, float margin, int screen, float p00, float p11,
         const float *caps, int nCaps, float *clip, u8 *bucket, int *hist)
{
    // Project every point and its direction once.
    const v128_t c0 = wasm_v128_load(pv), c1 = wasm_v128_load(pv + 4);
    const v128_t c2 = wasm_v128_load(pv + 8), c3 = wasm_v128_load(pv + 12);
    for (int p = 0; p < nPts; ++p) {
        const v128_t P = wasm_v128_load(pts + 12 * p), D = wasm_v128_load(pts + 12 * p + 4);
        v128_t cp = wasm_f32x4_add(wasm_f32x4_add(wasm_f32x4_add(
                        wasm_f32x4_mul(c0, SPLAT(P, 0)), wasm_f32x4_mul(c1, SPLAT(P, 1))),
                        wasm_f32x4_mul(c2, SPLAT(P, 2))), c3);
        v128_t cd = wasm_f32x4_add(wasm_f32x4_add(
                        wasm_f32x4_mul(c0, SPLAT(D, 0)), wasm_f32x4_mul(c1, SPLAT(D, 1))),
                        wasm_f32x4_mul(c2, SPLAT(D, 2)));
        wasm_v128_store(clip + 8 * p, cp);
        wasm_v128_store(clip + 8 * p + 4, cd);
    }

    const int nb = nCaps, top = nCaps - 1;
    float caps2[MAX_CAPS];
    for (int i = 0; i < nb; ++i) caps2[i] = caps[i] * caps[i];

    const v128_t hx = F4(0.5f * vw), hy = F4(0.5f * vh);
    const float rmw = 2.0f / mw, rmh = 2.0f / mh, rtol8 = 1.0f / tol8;
    const float aP00 = p00 < 0 ? -p00 : p00, aP11 = p11 < 0 ? -p11 : p11;
    const v128_t one = F4(1.0f), zero = F4(0.0f), lane = wasm_i32x4_make(0, 1, 2, 3);
    const v128_t bit[6] = { wasm_i32x4_splat(1), wasm_i32x4_splat(2), wasm_i32x4_splat(4),
                            wasm_i32x4_splat(8), wasm_i32x4_splat(16), wasm_i32x4_splat(32) };

    // Per-bucket and culled counts, a lane each, summed at the end.
    v128_t acc[MAX_CAPS];
    for (int i = 0; i < nb; ++i) acc[i] = wasm_i32x4_splat(0);
    v128_t accCulled = wasm_i32x4_splat(0);
    int changes = 0, dirty = 0;

    for (int s0 = 0; s0 < nSegs; s0 += 4) {
        // Gather four segments; past the end, repeat the last one.
        // Unrolled, so that g lives in locals rather than on the shadow stack.
        Gathered g[4];
#pragma clang loop unroll(full)
        for (int l = 0; l < 4; ++l) {
            const int s = s0 + l < nSegs ? s0 + l : nSegs - 1;
            gather(pts, clip, tbl + 4 * (segBase + 2 * s), &g[l]);
        }
        const v128_t valid = wasm_i32x4_lt(wasm_i32x4_add(wasm_i32x4_splat(s0), lane), wasm_i32x4_splat(nSegs));

        // A lane per segment from here on, in an order that keeps few
        // vectors live at a time; x64 has sixteen registers.

        // Turning: the angles of the two tangents to the unit chord; a zero
        // chord is a loop.
        v128_t theta, chordOk;
        {
            v128_t Cx, Cy, Cz, Dx, Dy, Dz, junk;
            TRANSPOSE(g[0].chord, g[1].chord, g[2].chord, g[3].chord, Cx, Cy, Cz, junk);
            const v128_t Pl = wasm_f32x4_sqrt(wasm_f32x4_add(wasm_f32x4_add(wasm_f32x4_mul(Cx, Cx), wasm_f32x4_mul(Cy, Cy)),
                                                             wasm_f32x4_mul(Cz, Cz)));
            chordOk = wasm_f32x4_gt(Pl, zero);
            Cx = wasm_v128_and(wasm_f32x4_div(Cx, Pl), chordOk);
            Cy = wasm_v128_and(wasm_f32x4_div(Cy, Pl), chordOk);
            Cz = wasm_v128_and(wasm_f32x4_div(Cz, Pl), chordOk);
            TRANSPOSE(g[0].d0, g[1].d0, g[2].d0, g[3].d0, Dx, Dy, Dz, junk);
            theta = angle_upper(Dx, Dy, Dz, Cx, Cy, Cz);
            TRANSPOSE(g[0].d1, g[1].d1, g[2].d1, g[3].d1, Dx, Dy, Dz, junk);
            theta = wasm_v128_bitselect(wasm_f32x4_add(theta, angle_upper(Dx, Dy, Dz, Cx, Cy, Cz)), F4(PI_F), chordOk);
            (void) junk;
        }

        // The cull planes, widened by the strip.
        const v128_t Wm = wasm_f32x4_make(g[0].Wmax, g[1].Wmax, g[2].Wmax, g[3].Wmax);
        v128_t mx, my, kx, ky;
        if (screen) {
            const v128_t ext = wasm_f32x4_add(wasm_f32x4_mul(F4(hw), Wm), F4(margin));
            mx = wasm_f32x4_add(one, wasm_f32x4_mul(ext, F4(rmw)));
            my = wasm_f32x4_add(one, wasm_f32x4_mul(ext, F4(rmh)));
            kx = ky = zero;
        } else {
            mx = F4(1 + margin * rmw); my = F4(1 + margin * rmh);
            kx = wasm_f32x4_mul(wasm_f32x4_mul(F4(hw), Wm), F4(aP00));
            ky = wasm_f32x4_mul(wasm_f32x4_mul(F4(hw), Wm), F4(aP11));
        }

        // The hull points p0, p0 + L d0 / 3, p1 - L d1 / 3, p1, one at a
        // time: the planes each lies outside of, ANDed over the four, so a
        // bit left over means all four are outside that plane, which culls
        // (each plane is a half-space in world space, so the test holds for
        // points behind the camera too); the smallest and largest w; and the
        // screen length of the control polygon, in pixels.
        // `first` is 1 for the first point, 2 for the second, 0 after.
        v128_t code, wmin, wmax, slen, sxp, syp;
#define HULL_POINT(X, Y, Z, W, first) do {                                                                  \
            const v128_t wx_ = wasm_f32x4_add(wasm_f32x4_mul(W, mx), kx);                                   \
            const v128_t wy_ = wasm_f32x4_add(wasm_f32x4_mul(W, my), ky);                                   \
            const v128_t c_ = wasm_v128_or(wasm_v128_or(                                                    \
                wasm_v128_or(wasm_v128_and(wasm_f32x4_gt(X, wx_), bit[0]),                                  \
                             wasm_v128_and(wasm_f32x4_lt(X, wasm_f32x4_neg(wx_)), bit[1])),                 \
                wasm_v128_or(wasm_v128_and(wasm_f32x4_gt(Y, wy_), bit[2]),                                  \
                             wasm_v128_and(wasm_f32x4_lt(Y, wasm_f32x4_neg(wy_)), bit[3]))),                \
                wasm_v128_or(wasm_v128_and(wasm_f32x4_gt(Z, W), bit[4]),                                    \
                             wasm_v128_and(wasm_f32x4_lt(Z, wasm_f32x4_neg(W)), bit[5])));                  \
            const v128_t r_ = wasm_f32x4_div(one, W);                                                       \
            const v128_t sx_ = wasm_f32x4_mul(wasm_f32x4_mul(X, r_), hx);                                   \
            const v128_t sy_ = wasm_f32x4_mul(wasm_f32x4_mul(Y, r_), hy);                                   \
            if (first == 1) {                                                                               \
                code = c_; wmin = W; wmax = W; slen = zero;                                                 \
            } else {                                                                                        \
                const v128_t dx_ = wasm_f32x4_sub(sx_, sxp), dy_ = wasm_f32x4_sub(sy_, syp);                \
                const v128_t len_ = wasm_f32x4_sqrt(wasm_f32x4_add(wasm_f32x4_mul(dx_, dx_),                \
                                                                   wasm_f32x4_mul(dy_, dy_)));              \
                code = wasm_v128_and(code, c_);                                                             \
                wmin = wasm_f32x4_pmin(wmin, W); wmax = wasm_f32x4_pmax(wmax, W);                           \
                slen = first == 2 ? len_ : wasm_f32x4_add(slen, len_);                                      \
            }                                                                                               \
            sxp = sx_; syp = sy_;                                                                           \
        } while (0)
        {
            const v128_t l3 = wasm_f32x4_div(wasm_f32x4_make(g[0].L, g[1].L, g[2].L, g[3].L), F4(3.0f));
            v128_t X, Y, Z, W, Qx, Qy, Qz, Qw, X3, Y3, Z3, W3;
            TRANSPOSE(g[0].h0, g[1].h0, g[2].h0, g[3].h0, X, Y, Z, W);
            HULL_POINT(X, Y, Z, W, 1);
            TRANSPOSE(g[0].q0, g[1].q0, g[2].q0, g[3].q0, Qx, Qy, Qz, Qw);
            X = wasm_f32x4_add(X, wasm_f32x4_mul(l3, Qx)); Y = wasm_f32x4_add(Y, wasm_f32x4_mul(l3, Qy));
            Z = wasm_f32x4_add(Z, wasm_f32x4_mul(l3, Qz)); W = wasm_f32x4_add(W, wasm_f32x4_mul(l3, Qw));
            HULL_POINT(X, Y, Z, W, 2);
            TRANSPOSE(g[0].h3, g[1].h3, g[2].h3, g[3].h3, X3, Y3, Z3, W3);
            TRANSPOSE(g[0].q1, g[1].q1, g[2].q1, g[3].q1, Qx, Qy, Qz, Qw);
            X = wasm_f32x4_sub(X3, wasm_f32x4_mul(l3, Qx)); Y = wasm_f32x4_sub(Y3, wasm_f32x4_mul(l3, Qy));
            Z = wasm_f32x4_sub(Z3, wasm_f32x4_mul(l3, Qz)); W = wasm_f32x4_sub(W3, wasm_f32x4_mul(l3, Qw));
            HULL_POINT(X, Y, Z, W, 0);
            HULL_POINT(X3, Y3, Z3, W3, 0);
        }
#undef HULL_POINT
        const v128_t culled = wasm_i32x4_ne(code, wasm_i32x4_splat(0));

        // The square of the need, with the depth ratio for the bunching of
        // uniform t at the far end; a hull point behind the camera plane
        // takes the top bucket.
        v128_t need2 = wasm_f32x4_mul(wasm_f32x4_mul(wasm_f32x4_mul(slen, theta), wasm_f32x4_div(wmax, wmin)), F4(rtol8));
        need2 = wasm_v128_bitselect(F4(__builtin_inff()), need2, wasm_f32x4_le(wmin, F4(LOD_W_EPS)));
        // The bucket: the count of capacities below the top that are below the need.
        v128_t k = wasm_i32x4_splat(0);
        for (int i = 0; i < top; ++i) k = wasm_i32x4_sub(k, wasm_f32x4_lt(F4(caps2[i]), need2));

        // The old buckets, for the hysteresis and the change count.
        const v128_t old = wasm_u32x4_extend_low_u16x8(wasm_u16x8_extend_low_u8x16(
                               wasm_v128_load32_zero(bucket + s0)));
        const v128_t drawn = wasm_v128_andnot(valid, culled);
        const v128_t down = wasm_v128_and(drawn, wasm_v128_and(wasm_i32x4_lt(old, wasm_i32x4_splat(nb)),
                                                               wasm_i32x4_lt(k, old)));
        if (wasm_v128_any_true(down)) {
            // Down only when the need is below 1 / 1.4 of the lower bucket,
            // then to the smallest bucket with that headroom; rare enough
            // for a lane at a time.
            int kk[4] __attribute__((aligned(16))), oo[4] __attribute__((aligned(16)));
            float nn[4] __attribute__((aligned(16)));
            int dd[4] __attribute__((aligned(16)));
            wasm_v128_store(kk, k); wasm_v128_store(oo, old); wasm_v128_store(nn, need2); wasm_v128_store(dd, down);
            for (int l = 0; l < 4; ++l) {
                if (!dd[l]) continue;
                const int o = oo[l];
                const float n2 = nn[l];
                int b = kk[l];
                if (n2 * LOD_HYSTERESIS2 < caps2[o - 1]) {
                    while (b < o - 1 && n2 * LOD_HYSTERESIS2 >= caps2[b]) ++b;
                } else {
                    b = o;
                }
                kk[l] = b;
            }
            k = wasm_v128_load(kk);
        }
        const v128_t nbNew = wasm_v128_bitselect(wasm_i32x4_splat(BUCKET_CULLED), k, culled);

        for (int i = 0; i < nb; ++i) acc[i] = wasm_i32x4_sub(acc[i], wasm_v128_and(drawn, wasm_i32x4_eq(nbNew, wasm_i32x4_splat(i))));
        accCulled = wasm_i32x4_sub(accCulled, wasm_v128_and(valid, culled));

        const v128_t changed = wasm_v128_and(valid, wasm_i32x4_ne(nbNew, old));
        if (wasm_v128_any_true(changed)) {
            int nn[4] __attribute__((aligned(16))), oo[4] __attribute__((aligned(16)));
            int cc[4] __attribute__((aligned(16)));
            wasm_v128_store(nn, nbNew); wasm_v128_store(oo, old); wasm_v128_store(cc, changed);
            for (int l = 0; l < 4; ++l) {
                if (!cc[l]) continue;
                if (oo[l] < nb && nn[l] < nb) ++changes;
                if (oo[l] < nb) dirty |= 1 << oo[l];
                if (nn[l] < nb) dirty |= 1 << nn[l];
            }
            const v128_t b16 = wasm_u16x8_narrow_i32x4(nbNew, nbNew);
            const v128_t bytes = wasm_u8x16_narrow_i16x8(b16, b16);
            if (s0 + 4 <= nSegs) {
                wasm_v128_store32_lane(bucket + s0, bytes, 0);
            } else {
                for (int l = 0; s0 + l < nSegs; ++l) bucket[s0 + l] = (u8) nn[l];
            }
        }
    }

#define HSUM(v) (wasm_i32x4_extract_lane(v, 0) + wasm_i32x4_extract_lane(v, 1) + \
                 wasm_i32x4_extract_lane(v, 2) + wasm_i32x4_extract_lane(v, 3))
    for (int i = 0; i < nb; ++i) hist[i] = HSUM(acc[i]);
    hist[nb] = changes;
    hist[nb + 1] = dirty;
    return HSUM(accCulled);
#undef HSUM
}
