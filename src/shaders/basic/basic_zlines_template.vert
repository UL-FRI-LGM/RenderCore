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
// instanceData0, points, RGBA32F, three texels per point at 3p:
//   (x, y, z, W)          position; width scale
//   (dx, dy, dz, S)       unit direction, zero = none given; dW/dt
//   (nx, ny, nz, param)   ribbon vector; time or path length (not read yet)
// instanceData1, tables, RGBA32I; strokes from texel 0, segments from u_SegBase:
//   stroke k   at k                   : (firstSeg, nSeg, rgba 0xRRGGBBAA, flags)
//   segment s  at u_SegBase + 2s      : (i0, i1, floatBitsToInt(L), stroke)
//              at u_SegBase + 2s + 1  : (iPrev, iNext, flags, spare), -1 = none
// Segment flags: bit 0 break (no join to the previous segment), bit 1 cap at
// the start, bit 2 cap at the end.

struct Material {
    vec3 emissive;
    sampler2D  instanceData0;
    isampler2D instanceData1;
};

//UIO
//-----------------------------------------------------------------------------
uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform vec2 viewport;

uniform Material material;
uniform int   u_SegBase;
uniform int   u_Samples;        // quads per segment
uniform int   u_InstanceOffset; // added to gl_InstanceID when drawing a run
uniform float u_HalfWidth;      // pixels when u_ScreenWidth, world units otherwise
uniform bool  u_ScreenWidth;
uniform float u_Margin;         // pixels the strip is drawn beyond the width
uniform bool  u_GivenInstances;
in int a_Instances;

out vec4  v_color;      // stroke rgba
out vec2  v_dist;       // across the strip (signed), along past the end; pixels or world units
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

    float t    = float(gl_VertexID >> 1) / float(u_Samples);
    float side = ((gl_VertexID & 1) == 0) ? -1.0 : 1.0;

    ivec4 sa = fetch_table(u_SegBase + 2 * seg);
    ivec4 sb = fetch_table(u_SegBase + 2 * seg + 1);
    int   i0 = sa.x, i1 = sa.y;
    float L  = intBitsToFloat(sa.z);
    ivec4 st = fetch_table(sa.w);

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

    // Tangents: the given directions, or the Catmull-Rom estimate from the
    // neighbour points, or the chord where there is no neighbour. A break
    // flag cuts the join to the previous segment.
    int iPrev = ((sb.z & 1) != 0) ? -1 : sb.x;
    int iNext = sb.y;
    vec3 d0 = ds0.xyz, d1 = ds1.xyz;
    if (dot(d0, d0) == 0.0) {
        vec3 e = (iPrev >= 0) ? p1 - fetch_point(3 * iPrev).xyz : P;
        d0 = (dot(e, e) > 0.0) ? normalize(e) : chord;
    }
    if (dot(d1, d1) == 0.0) {
        vec3 e = (iNext >= 0) ? fetch_point(3 * iNext).xyz - p0 : P;
        d1 = (dot(e, e) > 0.0) ? normalize(e) : chord;
    }

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
    fragVPos = pos_vs.xyz;

    // The strip covers the larger end width plus the margin; the fragment
    // stage cuts it at the width at t.
    float wmax = max(W0, W1) * u_HalfWidth;

    if (u_ScreenWidth) {
        // Offset in pixels, perpendicular to the curve's direction on screen.
        float ext  = wmax + u_Margin;
        vec4 dclip = PMat * vec4(der_vs, 0.0);
        vec2 dndc  = (dclip.xy * clip.w - clip.xy * dclip.w) / (clip.w * clip.w);
        vec2 tg    = dndc * viewport;
        float len  = length(tg);
        vec2 n     = (len > 0.0) ? vec2(-tg.y, tg.x) / len : vec2(1.0, 0.0);
        vec2 off   = n * (side * ext * 2.0) / viewport;
        gl_Position = vec4(clip.xy + off * clip.w, clip.zw);
        v_dist      = vec2(side * ext, 0.0);
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
        v_dist      = vec2(side * ext, 0.0);
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
