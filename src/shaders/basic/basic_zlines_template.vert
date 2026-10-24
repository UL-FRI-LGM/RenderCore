#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp isampler2D;

//DEF
//-----------------------------------------------------------------------------
// ZLines: a set of lines drawn as instanced TRIANGLE_STRIPs, one instance per
// segment, 2 * (u_Samples + 1) vertices per instance. The segment is a cubic
// Hermite between its two points. There is no vertex buffer: t and the side
// come from gl_VertexID, the segment from gl_InstanceID + u_InstanceOffset or,
// when u_GivenInstances, from the a_Instances attribute.
//
// Level of detail: with u_LodTol > 0 the segment uses n <= u_Samples quads,
// n = ceil(sqrt(s theta / (8 u_LodTol))) for a sagitta below u_LodTol pixels,
// with s the screen length of the projected Bezier control polygon and theta
// the angles of the two tangents to the chord; ZLines.js computes the same
// need on the CPU to choose u_Samples. Sample k > n is moved onto the end
// point, so the trailing quads have no area. A control point behind the camera
// plane takes n = u_Samples.
//
// instanceData0, points, RGBA32F, three texels per point at 3p:
//   (x, y, z, W)          position; width scale
//   (dx, dy, dz, S)       unit direction, zero = none given; dW/dt
//   (nx, ny, nz, param)   ribbon vector; time or path length (not read yet)
// instanceData1, tables, RGBA32I; texel 0 is the header, strokes from texel 1,
// segments from u_SegBase:
//   header     at 0                   : (nStrokes, nSegs, segBase, version)
//   stroke k   at 1 + k               : (firstSeg, nSeg, rgba 0xRRGGBBAA, flags)
//   segment s  at u_SegBase + 2s      : (i0, i1, floatBitsToInt(L), stroke)
//              at u_SegBase + 2s + 1  : (iPrev, iNext, flags, spare), -1 = none
// Segment flags: bit 0 break (no join to the previous segment), bit 1 cap at
// the start, bit 2 cap at the end, bit 3 straight (the chord as both tangents,
// whatever the directions and the neighbours, so the segment is a line).
#define SEG_STRAIGHT 8

struct Material {
    vec3 emissive;
    sampler2D  instanceData0;
    isampler2D instanceData1;
};

//UIO
//-----------------------------------------------------------------------------
uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform mat4 MVPMat;
uniform vec2 viewport;

uniform Material material;
uniform int   u_SegBase;
uniform int   u_Samples;        // quads per segment; the most, with the level of detail
uniform float u_LodTol;         // pixels; 0 turns the level of detail off
uniform int   u_InstanceOffset; // added to gl_InstanceID when drawing a run
uniform float u_HalfWidth;      // pixels when u_ScreenWidth, world units otherwise
uniform bool  u_ScreenWidth;
uniform float u_Margin;         // pixels the strip is drawn beyond the width
uniform bool  u_GivenInstances;
in int a_Instances;

out vec4  v_color;      // stroke rgba
out vec3  v_dist;       // (across the strip, signed; along past the end) times q, and q:
                        // pixels and q = w for pixel widths, so that xy / z interpolates
                        // linearly on screen; world units and q = 1 otherwise
out float v_halfWidth;  // the half width at this t, in the units of v_dist
out float v_s;          // arc length at this t, from the segment start (t * L)
flat out int v_seg;
out vec3 fragVPos;

#if (PICK_MODE_UINT)
    flat out uint InstanceID;
#fi
#if (OUTLINE)
    out vec3 v_normal_viewspace;
    out vec3 v_ViewDirection_viewspace;
#fi
#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi

vec4 fetch_point(int idx) {
    int tsx = textureSize(material.instanceData0, 0).x;
    return texelFetch(material.instanceData0, ivec2(idx % tsx, idx / tsx), 0);
}
ivec4 fetch_table(int idx) {
    int tsx = textureSize(material.instanceData1, 0).x;
    return texelFetch(material.instanceData1, ivec2(idx % tsx, idx / tsx), 0);
}

//MAIN
//-----------------------------------------------------------------------------
void main()
{
    int seg = u_GivenInstances ? a_Instances : u_InstanceOffset + gl_InstanceID;
    v_seg = seg;

    int   k    = gl_VertexID >> 1;
    float side = ((gl_VertexID & 1) == 0) ? -1.0 : 1.0;

    ivec4 sa = fetch_table(u_SegBase + 2 * seg);
    ivec4 sb = fetch_table(u_SegBase + 2 * seg + 1);
    int   i0 = sa.x, i1 = sa.y;
    float L  = intBitsToFloat(sa.z);
    ivec4 st = fetch_table(1 + sa.w);

    uint c = uint(st.z);
    v_color = vec4(float((c >> 24) & 0xffu), float((c >> 16) & 0xffu),
                   float((c >>  8) & 0xffu), float(c & 0xffu)) / 255.0;

    #if (PICK_MODE_UINT)
        InstanceID = uint(seg);
    #fi

    vec4 pw0 = fetch_point(3 * i0), ds0 = fetch_point(3 * i0 + 1);
    vec4 pw1 = fetch_point(3 * i1), ds1 = fetch_point(3 * i1 + 1);
    vec3 p0 = pw0.xyz, p1 = pw1.xyz;
    vec3 P  = p1 - p0;
    vec3 chord = (dot(P, P) > 0.0) ? normalize(P) : vec3(0.0);

    // Tangents: the chord for a straight segment; else the given directions,
    // or the Catmull-Rom estimate from the neighbour points, or the chord
    // where there is no neighbour. A break flag cuts the join to the previous
    // segment.
    bool straight = (sb.z & SEG_STRAIGHT) != 0;
    int iPrev = (straight || (sb.z & 1) != 0) ? -1 : sb.x;
    int iNext = straight ? -1 : sb.y;
    vec3 d0 = ds0.xyz, d1 = ds1.xyz;
    if (straight) {
        d0 = chord;
        d1 = chord;
    }
    if (dot(d0, d0) == 0.0) {
        vec3 e = (iPrev >= 0) ? p1 - fetch_point(3 * iPrev).xyz : P;
        d0 = (dot(e, e) > 0.0) ? normalize(e) : chord;
    }
    if (dot(d1, d1) == 0.0) {
        vec3 e = (iNext >= 0) ? fetch_point(3 * iNext).xyz - p0 : P;
        d1 = (dot(e, e) > 0.0) ? normalize(e) : chord;
    }

    // The Bezier hull in clip space: h0 = p0, h1 = p0 + L d0 / 3,
    // h2 = p1 - L d1 / 3, h3 = p1.
    // Without the level of detail only w is needed, for the camera plane.
    vec4 h0, h1, h2, h3;
    if (u_LodTol > 0.0) {
        h0 = MVPMat * vec4(p0, 1.0);
        h3 = MVPMat * vec4(p1, 1.0);
        h1 = h0 + MVPMat * vec4(d0 * (L / 3.0), 0.0);
        h2 = h3 - MVPMat * vec4(d1 * (L / 3.0), 0.0);
    } else {
        vec4 rw = vec4(MVPMat[0][3], MVPMat[1][3], MVPMat[2][3], MVPMat[3][3]);
        h0 = vec4(0.0, 0.0, 0.0, dot(rw.xyz, p0) + rw.w);
        h3 = vec4(0.0, 0.0, 0.0, dot(rw.xyz, p1) + rw.w);
        h1 = vec4(0.0, 0.0, 0.0, h0.w + dot(rw.xyz, d0) * (L / 3.0));
        h2 = vec4(0.0, 0.0, 0.0, h3.w - dot(rw.xyz, d1) * (L / 3.0));
    }

    // Level of detail: the quads this segment needs, at most u_Samples.
    int nUse = u_Samples;
    if (u_LodTol > 0.0 && min(min(h0.w, h1.w), min(h2.w, h3.w)) > 1e-6) {
        vec2 h  = 0.5 * viewport;
        vec2 s0 = h0.xy / h0.w * h, s1 = h1.xy / h1.w * h;
        vec2 s2 = h2.xy / h2.w * h, s3 = h3.xy / h3.w * h;
        float slen  = length(s1 - s0) + length(s2 - s1) + length(s3 - s2);
        // A straight segment does not turn, and takes one quad.
        float theta = straight ? 0.0 : (dot(P, P) > 0.0)
            ? acos(clamp(dot(d0, chord), -1.0, 1.0)) + acos(clamp(dot(chord, d1), -1.0, 1.0))
            : 3.14159265;
        // Uniform t bunches the samples at the far end: the nearest chord is
        // longer on screen than slen / n by up to the ratio of the depths.
        float wr = max(max(h0.w, h1.w), max(h2.w, h3.w)) / min(min(h0.w, h1.w), min(h2.w, h3.w));
        float need = sqrt(slen * theta * wr / (8.0 * u_LodTol));
        nUse = clamp(int(ceil(need)), 1, u_Samples);
    }
    float t = float(min(k, nUse)) / float(nUse);

    // Cubic Hermite in the P, Q, R form of mkFit's Hermite3D and Gled's WSPoint:
    // x(t) = p0 + Q t + (P - Q - R) t^2 + R t^3, with the tangents d0 L and d1 L.
    vec3 Q  = L * d0;
    vec3 R  = L * d1 - 2.0 * P + Q;
    vec3 c2 = P - Q - R;
    vec3 pos = p0 + (Q + (c2 + R * t) * t) * t;
    vec3 der = Q + (2.0 * c2 + 3.0 * R * t) * t;

    // Width scale, the same form in 1D with tension 1: W(0) = W0, W(1) = W1,
    // dW/dt = S0 and S1 at the ends.
    float W0 = pw0.w, W1 = pw1.w;
    float Pw = W1 - W0, Qw = ds0.w, Rw = ds1.w - 2.0 * Pw + Qw;
    float Wt = W0 + (Qw + ((Pw - Qw - Rw) + Rw * t) * t) * t;

    v_s = t * L;

    vec4 pos_vs = MVMat * vec4(pos, 1.0);
    vec3 der_vs = mat3(MVMat) * der;
    vec4 clip   = PMat * pos_vs;

    // The camera plane, with pixel widths. A vertex behind it has an offset
    // n w that flips side with w, which makes the strip's quads bow ties whose
    // diagonals cross the near plane far outside the strip. So in a segment
    // with a hull point behind the plane, take the edge between the sample A
    // in front and the sample B behind: a vertex behind the plane moves along
    // the line from A to half the near distance (half A's depth if A is
    // nearer), where GL clips the edge as it would have clipped the original
    // one, with w > 0 at every vertex; and both A and the vertices behind take
    // the side of that edge on screen, which is the line drawn up to the near
    // plane, so it keeps its width there.
    const float wEps = 1e-5;
    bool  onEdge = false;
    vec2  edgeTg = vec2(0.0);
    if (u_ScreenWidth && min(min(h0.w, h1.w), min(h2.w, h3.w)) <= wEps && (h0.w > wEps || h3.w > wEps)) {
        // w(t) of the cubic in clip space, from the row of MVPMat giving w.
        vec4  r   = vec4(MVPMat[0][3], MVPMat[1][3], MVPMat[2][3], MVPMat[3][3]);
        float w0c = dot(r.xyz, p0) + r.w, wq = dot(r.xyz, Q), wc = dot(r.xyz, c2), wr = dot(r.xyz, R);
        float fn  = float(nUse);
        int kk = min(k, nUse), ia = -1, ib = -1;
        if (clip.w <= wEps) {
            // Search towards a front end for the nearest sample in front.
            int step = (h0.w > wEps) ? -1 : 1, j = kk;
            for (int it = 0; it < 64; ++it) {
                j += step;
                if (j <= 0 || j >= nUse) break;
                float tj = float(j) / fn;
                if (w0c + (wq + (wc + wr * tj) * tj) * tj > wEps) break;
            }
            ia = clamp(j, 0, nUse); ib = ia - step;
        } else {
            float tn = float(kk + 1) / fn, tp = float(kk - 1) / fn;
            if (kk < nUse && w0c + (wq + (wc + wr * tn) * tn) * tn <= wEps) { ia = kk; ib = kk + 1; }
            else if (kk > 0 && w0c + (wq + (wc + wr * tp) * tp) * tp <= wEps) { ia = kk; ib = kk - 1; }
        }
        if (ia >= 0) {
            float tA = float(ia) / fn, tB = float(ib) / fn;
            vec4  pAv = MVMat * vec4(p0 + (Q + (c2 + R * tA) * tA) * tA, 1.0);
            vec4  cA  = PMat * pAv;
            vec4  cB  = PMat * (MVMat * vec4(p0 + (Q + (c2 + R * tB) * tB) * tB, 1.0));
            if (cA.w > wEps && cB.w < cA.w) {
                // The near distance of a perspective projection.
                float zn = PMat[3][2] / (PMat[2][2] - 1.0);
                float wT = min(0.5 * zn, 0.5 * cA.w);
                vec4  cE = mix(cA, cB, (cA.w - wT) / (cA.w - cB.w));
                edgeTg = (cE.xy / cE.w - cA.xy / cA.w) * viewport;
                if (ib < ia) edgeTg = -edgeTg;   // the direction from p0 to p1
                onEdge = true;
                if (clip.w <= wEps) {
                    float a = (cA.w - wT) / (cA.w - clip.w);
                    pos_vs = mix(pAv, pos_vs, a);
                    clip   = mix(cA, clip, a);
                }
            }
        }
    }
    fragVPos = pos_vs.xyz;

    // The strip covers the larger end width plus the margin; the fragment
    // stage cuts it at the width at t.
    float wmax = max(W0, W1) * u_HalfWidth;

    if (u_ScreenWidth) {
        // Offset in pixels, perpendicular to the curve's direction on screen.
        float ext  = wmax + u_Margin;
        vec2 tg;
        if (onEdge) {
            tg = edgeTg;
        } else {
            vec4 dclip = PMat * vec4(der_vs, 0.0);
            vec2 dndc  = (dclip.xy * clip.w - clip.xy * dclip.w) / (clip.w * clip.w);
            tg = dndc * viewport;
        }
        float len  = length(tg);
        vec2 n     = (len > 0.0) ? vec2(-tg.y, tg.x) / len : vec2(1.0, 0.0);
        vec2 off   = n * (side * ext * 2.0) / viewport;
        gl_Position = vec4(clip.xy + off * clip.w, clip.zw);
        v_dist      = vec3(side * ext, 0.0, 1.0) * clip.w;
        v_halfWidth = u_HalfWidth * Wt;
    } else {
        // Offset in world units, in the plane facing the camera. The margin
        // is in pixels, converted at this depth: one pixel is
        // 2 w / (P[1][1] * viewport.y) world units, perspective or orthographic.
        float wpp  = 2.0 * clip.w / (PMat[1][1] * viewport.y);
        float ext  = wmax + u_Margin * wpp;
        vec3 n    = cross(der_vs, pos_vs.xyz);
        float len = length(n);
        n = (len > 0.0) ? n / len : vec3(1.0, 0.0, 0.0);
        gl_Position = PMat * vec4(pos_vs.xyz + n * (side * ext), 1.0);
        v_dist      = vec3(side * ext, 0.0, 1.0);
        v_halfWidth = u_HalfWidth * Wt;
    }

    #if (OUTLINE)
        v_normal_viewspace = vec3(0.0, 0.0, -1.0);
        v_ViewDirection_viewspace = -normalize(pos_vs.xyz);
    #fi
    #if (CLIPPING_PLANES)
        vViewPosition = -pos_vs.xyz;
    #fi
}
