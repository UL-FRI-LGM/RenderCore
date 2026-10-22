#version 300 es
precision highp float;
precision highp sampler2D;

//DEF
//-----------------------------------------------------------------------------
// ZLines: a set of lines drawn as one instanced TRIANGLE_STRIP, one instance
// per control point, 2 * (u_Samples + 1) vertices per instance. Instance i
// draws the segment from point i to point i + 1 as a cubic Hermite; a point
// whose arc length is zero or negative is the last of its line and draws
// nothing. There is no vertex buffer: t and the side come from gl_VertexID.
//
// instanceData0, two RGBA32F texels per point, linear index 2i and 2i + 1:
//   (x, y, z, L)        position and the arc length to the next point
//   (dx, dy, dz, line)  unit direction (zero: straight segment) and the index
//                       of the line the point belongs to
// instanceData1, one RGBA32F texel per line:
//   (r, g, b, visible)

struct Material {
    vec3 emissive;
    sampler2D instanceData0;
    sampler2D instanceData1;
};

//UIO
//-----------------------------------------------------------------------------
uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform vec2 viewport;

uniform Material material;
uniform int   u_Samples;     // quads per segment
uniform float u_HalfWidth;   // pixels when u_ScreenWidth, world units otherwise
uniform bool  u_ScreenWidth;

out vec4 fragVColor;
out vec3 fragVPos;

#if (PICK_MODE_UINT)
    flat out uint InstanceID;
#fi
#if (OUTLINE)
    uniform bool u_OutlineGivenInstances;
    in  int  a_OutlineInstances;
    out vec3 v_normal_viewspace;
    out vec3 v_ViewDirection_viewspace;
#fi
#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi

vec4 fetch_texel(sampler2D s, int idx) {
    int tsx = textureSize(s, 0).x;
    return texelFetch(s, ivec2(idx % tsx, idx / tsx), 0);
}

//MAIN
//-----------------------------------------------------------------------------
void main()
{
    int iID = gl_InstanceID;
    #if (OUTLINE)
        if (u_OutlineGivenInstances)
            iID = a_OutlineInstances;
    #fi

    float t    = float(gl_VertexID >> 1) / float(u_Samples);
    float side = ((gl_VertexID & 1) == 0) ? -1.0 : 1.0;

    vec4 p0 = fetch_texel(material.instanceData0, 2 * iID);
    vec4 d0 = fetch_texel(material.instanceData0, 2 * iID + 1);
    int  line = int(d0.w);
    vec4 lt = fetch_texel(material.instanceData1, line);
    float L = p0.w;

    #if (PICK_MODE_UINT)
        InstanceID = uint(line);
    #fi
    fragVColor = vec4(lt.rgb, 1.0);

    // The last point of a line, or a hidden line: put every vertex of the
    // strip outside clip space, so nothing is rasterized in any pass.
    if (L <= 0.0 || lt.a < 0.5) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        fragVPos = vec3(0.0);
        #if (OUTLINE)
            v_normal_viewspace = vec3(0.0, 0.0, -1.0);
            v_ViewDirection_viewspace = vec3(0.0, 0.0, 1.0);
        #fi
        #if (CLIPPING_PLANES)
            vViewPosition = vec3(0.0);
        #fi
        return;
    }

    vec4 p1 = fetch_texel(material.instanceData0, 2 * iID + 2);
    vec4 d1 = fetch_texel(material.instanceData0, 2 * iID + 3);

    // Cubic Hermite in the P, Q, R form of mkFit's Hermite3D and Gled's WSPoint:
    // x(t) = p0 + Q t + (P - Q - R) t^2 + R t^3, with the tangents d0 L and d1 L.
    vec3 P = p1.xyz - p0.xyz;
    vec3 pos, der;
    if (dot(d0.xyz, d0.xyz) == 0.0 || dot(d1.xyz, d1.xyz) == 0.0) {
        pos = p0.xyz + P * t;
        der = P;
    } else {
        vec3 Q  = L * d0.xyz;
        vec3 R  = L * d1.xyz - 2.0 * P + Q;
        vec3 c2 = P - Q - R;
        pos = p0.xyz + (Q + (c2 + R * t) * t) * t;
        der = Q + (2.0 * c2 + 3.0 * R * t) * t;
    }

    vec4 pos_vs = MVMat * vec4(pos, 1.0);
    vec3 der_vs = mat3(MVMat) * der;
    fragVPos = pos_vs.xyz;

    if (u_ScreenWidth) {
        // Offset in pixels, perpendicular to the curve's direction on screen.
        vec4 clip  = PMat * pos_vs;
        vec4 dclip = PMat * vec4(der_vs, 0.0);
        vec2 dndc  = (dclip.xy * clip.w - clip.xy * dclip.w) / (clip.w * clip.w);
        vec2 tg    = dndc * viewport;
        float len  = length(tg);
        vec2 n     = (len > 0.0) ? vec2(-tg.y, tg.x) / len : vec2(1.0, 0.0);
        vec2 off   = n * (side * u_HalfWidth * 2.0) / viewport;
        gl_Position = vec4(clip.xy + off * clip.w, clip.zw);
    } else {
        // Offset in world units, in the plane facing the camera.
        vec3 n    = cross(der_vs, pos_vs.xyz);
        float len = length(n);
        n = (len > 0.0) ? n / len : vec3(1.0, 0.0, 0.0);
        gl_Position = PMat * vec4(pos_vs.xyz + n * (side * u_HalfWidth), 1.0);
    }

    #if (OUTLINE)
        v_normal_viewspace = vec3(0.0, 0.0, -1.0);
        v_ViewDirection_viewspace = -normalize(pos_vs.xyz);
    #fi
    #if (CLIPPING_PLANES)
        vViewPosition = -pos_vs.xyz;
    #fi
}
