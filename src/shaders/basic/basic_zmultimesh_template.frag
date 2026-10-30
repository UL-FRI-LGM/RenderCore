#version 300 es
precision mediump float;

//DEF
//**********************************************************************************************************************

//STRUCT
//**********************************************************************************************************************

struct Material {
    vec3 emissive;
    vec3 diffuse;
    vec3 specular;
    float shininess;
    bool blinn;
    float alpha;
    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi
};

#if (DLIGHTS)
struct DLight {
    vec3 direction;
    vec3 color;
    mat4 VPMat;
};
#fi

#if (PLIGHTS)
struct PLight {
    //bool directional;
    vec3 position;
    vec3 position_worldspace;
    vec3 color;
    float distance;
    //float decay;

    mat4 VPMat;

    float constant;
    float linear;
    float quadratic;
};
#fi

#if (SLIGHTS)
struct SLight {
    vec3 position;
    vec3 color;
    float distance;
    // float decay;
    float cutoff;
    float outerCutoff;
    vec3 direction;

    mat4 VPMat;

    float constant;
    float linear;
    float quadratic;
};
#fi

//UIO
//**********************************************************************************************************************

uniform Material material;

in vec3 fragVPos;
// in vec3 fragVPos_worldspace;

#if (TRANSPARENT)  // QQQQQQ what to do
    uniform float alpha;
#else
    float alpha = 1.0;
#fi

#if (!NORMAL_FLAT)
    in vec3 fragVNorm;
#fi

#if (COLORS)
    in vec4 fragVColor;
#fi

#if (TEXTURE)
    in vec2 fragUV;
#fi

#if (DLIGHTS)
    uniform DLight dLights[##NUM_DLIGHTS];
    // in      vec4   fragVPos_dlightspace[##NUM_DLIGHTS];
#fi

#if (PLIGHTS)
    uniform PLight pLights[##NUM_PLIGHTS];
    // in      fragVPos_plightspace[##NUM_PLIGHTS];
#fi

#if (SLIGHTS)
    uniform SLight sLights[##NUM_SLIGHTS];
    // in      vec4   fragVPos_slightspace[##NUM_SLIGHTS];
#fi

uniform vec3 ambient; // QQQQQQ how does this work
uniform mat4 PMat;

#if (CLIPPING_PLANES)
    in vec3 v_pos_for_clip;
#fi
#include clipping_decl

#if (PICK_MODE_UINT)
    // ZMultiMesh draws each node with a draw call of its own and sets the node index in u_InstanceID.
    uniform uint u_UINT_ID;
    uniform bool u_PickInstance;
    uniform uint u_InstanceID;
    layout(location = 0) out uint objectID;
#else if (OUTLINE)
    #if (NORMAL_FLAT)
        in vec3 v_position_viewspace;
    #else
        in vec3 v_normal_viewspace;
    #fi
    in vec3 v_ViewDirection_viewspace;
    #include outline_frag_decl
#else
    out vec4 outColor;
#fi


//FUNCTIONS
//**********************************************************************************************************************
#include light_shading_decl
#include projection_decl


//MAIN
//**********************************************************************************************************************
void main()
{
    #if (CLIPPING_PLANES)
        if (clippedByPlanes(v_pos_for_clip)) discard;
    #fi

    #if (OUTLINE)

        #if (NORMAL_FLAT)
            vec3 fdx = dFdx(v_position_viewspace);
            vec3 fdy = dFdy(v_position_viewspace);
            vec3 v_normal_viewspace = normalize(cross(fdx, fdy));
        #fi
        if (gl_FrontFacing) {
            vn_viewspace = vec4(v_normal_viewspace, 0.0);
        } else {
            vn_viewspace = vec4(-v_normal_viewspace, 0.0);
        }
        vd_viewspace = vec4(v_ViewDirection_viewspace, 0.0);

    #else if (PICK_MODE_UINT)

        if (u_PickInstance) {
            objectID = u_InstanceID;
        } else {
            objectID = u_UINT_ID;
        }

    #else

    #if (TEXTURE)
        vec2 texCoords = fragUV;
    #fi

    #if (NORMAL_FLAT)
        vec3 fdx = dFdx(fragVPos);
        vec3 fdy = dFdy(fragVPos);
        vec3 N = normalize(cross(fdx, fdy));
    #else
        vec3 N = normalize(fragVNorm);
    #fi

    vec3 V = normalize(-fragVPos);

    vec3 P = fragVPos;
    vec3 kd = material.diffuse;
    #if (COLORS)
        kd *= fragVColor.rgb;
    #fi
    vec3 ks = material.specular;
    // No specular under an orthographic projection: with the same view direction everywhere, the
    // highlight would depend on the normal alone and tint all faces of one orientation alike.
    if (isOrthographic(PMat)) ks = vec3(0.0);
    float shin = material.shininess;
    bool blinn = material.blinn;
    vec3 combined = ambient * kd;
    #include light_shading_stmt

    outColor = vec4(combined, alpha);

    #if (TEXTURE)
        // Apply all of the textures
        #for I_TEX in 0 to NUM_TEX
             outColor *= texture(material.texture##I_TEX, texCoords);
        #end
    #fi

    #fi
}
