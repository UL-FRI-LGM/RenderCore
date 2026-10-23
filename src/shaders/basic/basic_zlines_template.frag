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

#if (PICK_MODE_RGB)
    uniform vec3 u_RGB_ID;
    layout(location = 0) out vec4 objectID;
#else if (PICK_MODE_UINT)
    uniform uint u_UINT_ID;
    uniform bool u_PickInstance;
    flat in uint InstanceID;
    layout(location = 0) out uint objectID;
#else if (OUTLINE)
    in vec3 v_normal_viewspace;
    in vec3 v_ViewDirection_viewspace;
    layout (location = 0) out vec4 vn_viewspace;
    layout (location = 1) out vec4 vd_viewspace;
    #if (DEPTH)
        layout (location = 2) out vec4 de_viewspace;
    #fi
#else
    out vec4 outColor;
#fi

#if (CLIPPING_PLANES)
    struct ClippingPlane {
        vec3 normal;
        float constant;
    };
    uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];
    in vec3 vViewPosition;
#fi

//MAIN
//-----------------------------------------------------------------------------
void main() {
    #if (CLIPPING_PLANES)
        bool clipped = true;
        for (int i = 0; i < ##NUM_CLIPPING_PLANES; i++) {
            clipped = (dot(vViewPosition, clippingPlanes[i].normal) > clippingPlanes[i].constant) && clipped;
        }
        if (clipped) discard;
    #fi

    float dx = v_dist.x / v_dist.z;
    float d  = abs(dx);

    #if (OUTLINE)
        if (d > v_halfWidth) discard;
        vn_viewspace = vec4(v_normal_viewspace, 0.0);
        vd_viewspace = vec4(v_ViewDirection_viewspace, 0.0);
        #if (DEPTH)
            de_viewspace = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
        #fi
    #else if (PICK_MODE_RGB)
        if (d > v_halfWidth) discard;
        objectID = vec4(u_RGB_ID, 1.0);
    #else if (PICK_MODE_UINT)
        if (d > v_halfWidth) discard;
        objectID = u_PickInstance ? InstanceID : u_UINT_ID;
    #else
        // The size of a pixel in the units of v_dist: 1 in screen mode.
        float px = length(vec2(dFdx(dx), dFdy(dx)));
        float a  = 1.0 - smoothstep(v_halfWidth - 0.5 * px, v_halfWidth + 0.5 * px, d);
        if (a <= 0.0) discard;
        outColor = vec4(v_color.rgb + material.emissive, alpha * v_color.a * a);
    #fi
}
