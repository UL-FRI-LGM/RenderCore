#version 300 es
precision mediump float;

//DEF
//**********************************************************************************************************************

#define SPRITE_SPACE_WORLD 0.0
#define SPRITE_SPACE_SCREEN 1.0

struct Material {
    vec3 emissive;
    // vec3 diffuse;
    #if (INSTANCED)
        sampler2D instanceData0;
    #fi
    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi
};


//UIO
//**********************************************************************************************************************

uniform Material material;

#if (TRANSPARENT)
    uniform float alpha;
#else
    float alpha = 1.0;
#fi

#if (COLORS)
    in vec4 fragVColor;
#fi

#if (TEXTURE)
    in vec2 fragUV;
#fi

// Hover affordance for a screen-space sprite: a thin frame plus a resize grip
// in the bottom-right corner. Behind a flag because the ordinary -- and
// instanced -- ZSprite is a hot path that should not carry it.
// Requires TEXTURE: it reuses fragUV, and it has to run before the zero-alpha
// discard so the frame survives outside the image silhouette.
#if (SPRITE_FRAME)
    uniform vec2 SpriteSize;      // device px; the same uniform the vertex stage uses
    uniform vec4 u_FrameColor;
    uniform float u_FrameLW;      // device px; 0 turns the whole affordance off
    uniform float u_GripSq;       // grip square side, device px
    uniform float u_GripGap;      // clearance between grip and frame, device px
#fi

#if (PICK_MODE_UINT)
    #if (INSTANCED)
        #include pick_frag_decl
    #else
        // Without instances the pick pass writes u_UINT_ID only.
        uniform uint u_UINT_ID;
        layout(location = 0) out uint objectID;
    #fi
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
//**********************************************************************************************************************
void main() {

    #if (CLIPPING_PLANES)
        if (clippedByPlanes(vViewPosition)) discard;
    #fi

    // The sprite is unlit: its surface colour is the emissive colour, times the vertex colour.
    vec3 surface = material.emissive;
    #if (COLORS)
        surface *= fragVColor.rgb;
    #fi
    vec4 color = vec4(surface, alpha);

    #if (COLORS)
        color.a += fragVColor.a;
    #fi

    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            color *= texture(material.texture##I_TEX, fragUV);
        #end

        // Must sit between the texture fetch and the discard below: the frame is
        // drawn where the image is transparent, so it needs to overwrite alpha
        // before the zero-alpha test throws those fragments away.
        #if (SPRITE_FRAME)
            if (u_FrameLW > 0.0) {
                // uv is (0,0) at the bottom-left, so p is device px from there.
                vec2 p = fragUV * SpriteSize;
                vec2 d = min(p, SpriteSize - p);
                bool on_frame = min(d.x, d.y) < u_FrameLW;

                // Grip square tucked into the frame's inner corner. As in ZText,
                // the frame supplies the bottom and right sides and these two
                // arms the top and left, so the two read as one square.
                float gx = SpriteSize.x - p.x;
                float gy = p.y;
                float o  = u_FrameLW + u_GripGap;
                float e  = o + u_GripSq;
                bool in_sq   = gx >= o && gx <= e && gy >= o && gy <= e;
                bool on_grip = in_sq && (gy > e - u_FrameLW || gx > e - u_FrameLW);

                if (on_frame || on_grip) color = u_FrameColor;
            }
        #fi

        #if (TRANSPARENT)
            if (color.w <= 0.00392) discard;
        #fi
    #fi

    // Special handling for outline to provide better edge detection,
    // especially with overlapping outlined objects.
    #if (OUTLINE)
        if (color.w > 0.50) {
            vn_viewspace = vec4(v_normal_viewspace, 0.0);
            vd_viewspace = vec4(v_ViewDirection_viewspace, 0.0);
        } else {
            discard;
        }
    #else
        #if (PICK_MODE_UINT)
            #if (INSTANCED)
                #include pick_frag_stmt
            #else
                objectID = u_UINT_ID;
            #fi
        #else
            outColor = color;
        #fi
    #fi
}
