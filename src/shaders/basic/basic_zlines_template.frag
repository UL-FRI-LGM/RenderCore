#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp isampler2D;

//DEF
//-----------------------------------------------------------------------------
// ZLines fragment stage: the strip is drawn wider than the line, and the
// fragment keeps |v_dist.x / v_dist.z| <= v_halfWidth. The colour mode fades
// the alpha over one pixel centred on the edge; the pick and outline modes
// discard beyond the width, so their footprint is the true one.

struct Material {
    vec3 emissive;
    sampler2D  instanceData0;
    isampler2D instanceData1;
};

//UIO
//-----------------------------------------------------------------------------
uniform Material material;

#if (TRANSPARENT)
    uniform float alpha;
#else
    float alpha = 1.0;
#fi

in vec4  v_color;
in vec3  v_dist;   // distances times q, and q; see the vertex shader
in float v_halfWidth;
in float v_s;
flat in int v_seg;
in vec3 fragVPos;

#if (PICK_MODE_UINT)
    #include pick_frag_decl
#else if (OUTLINE)
    in vec3 v_normal_viewspace;
    in vec3 v_ViewDirection_viewspace;
    #include outline_frag_decl
#else
    out vec4 outColor;
#fi

#if (CLIPPING_PLANES)
    in vec3 vViewPosition;
#fi
#include clipping_decl

//MAIN
//-----------------------------------------------------------------------------
void main() {
    #if (CLIPPING_PLANES)
        if (clippedByPlanes(vViewPosition)) discard;
    #fi

    float dx = v_dist.x / v_dist.z;
    float d  = abs(dx);

    #if (OUTLINE)
        if (d > v_halfWidth) discard;
        vn_viewspace = vec4(v_normal_viewspace, 0.0);
        vd_viewspace = vec4(v_ViewDirection_viewspace, 0.0);
    #else if (PICK_MODE_UINT)
        if (d > v_halfWidth) discard;
        #include pick_frag_stmt
    #else
        // The size of a pixel in the units of v_dist: 1 in screen mode.
        float px = length(vec2(dFdx(dx), dFdy(dx)));
        float a  = 1.0 - smoothstep(v_halfWidth - 0.5 * px, v_halfWidth + 0.5 * px, d);
        if (a <= 0.0) discard;
        outColor = vec4(v_color.rgb + material.emissive, alpha * v_color.a * a);
    #fi
}
