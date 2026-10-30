#version 300 es
precision mediump float;

//DEF
//**********************************************************************************************************************

#if (DLIGHTS)
struct DLight {
    vec3 direction;
    vec3 color;
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
    bool castShadows;
    bool hardShadows;
    float minBias;
    float maxBias;
    float shadowFar;

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
    float cutoff;
    float outerCutoff;
    vec3 direction;

    float constant;
    float linear;
    float quadratic;
};
#fi

struct Material {
    vec3 emissive;
    vec3 diffuse;
    float alpha;
    #if (INSTANCED)
        sampler2D instanceData0;
    #fi
    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi

    // AMT ADD
    vec3 specular;
    float shininess;

    bool blinn;

};


//UIO
//**********************************************************************************************************************

uniform Material material;

#if (DLIGHTS)
    uniform DLight dLights[##NUM_DLIGHTS];
#fi

#if (PLIGHTS)
    uniform PLight pLights[##NUM_PLIGHTS];
#fi

#if (SLIGHTS)
    uniform SLight sLights[##NUM_SLIGHTS];
#fi
uniform vec3 ambient;
uniform mat4 PMat;

in vec3 fragVPos;

#if (!NORMAL_FLAT)
    in vec3 fragVNorm;
#fi

in vec4 fragVColor;

#if (TEXTURE)
    in vec2 fragUV;
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


//FUNCTIONS
//**********************************************************************************************************************
#include light_shading_decl
#include projection_decl


//MAIN
//**********************************************************************************************************************
void main() {

    #if (CLIPPING_PLANES)
        if (clippedByPlanes(vViewPosition)) discard;
    #fi

    #if (OUTLINE)
        vn_viewspace = vec4(v_normal_viewspace, 0.0);
        vd_viewspace = vec4(v_ViewDirection_viewspace, 0.0);
    #else if (PICK_MODE_UINT)
        #if (INSTANCED)
            #include pick_frag_stmt
        #else
            objectID = u_UINT_ID;
        #fi
    #else

    // AMT additions
    #if (NORMAL_FLAT)
        vec3 fdx = dFdx(fragVPos);
        vec3 fdy = dFdy(fragVPos);
        vec3 N = normalize(cross(fdx, fdy));
    #else
        vec3 N = normalize(fragVNorm);
    #fi

    vec3 V = normalize(-fragVPos);

    #if (HEIGHT_MAP)
        texCoords = parallaxOffset(texCoords, V);
        if(texCoords.x > 1.0 || texCoords.y > 1.0 || texCoords.x < 0.0 || texCoords.y < 0.0) discard;
    #fi

    // Calculate combined light contribution
    vec3 P = fragVPos;
    vec3 kd = fragVColor.rgb;
    vec3 ks = material.specular;
    // No specular under an orthographic projection: with the same view direction everywhere, the
    // highlight would depend on the normal alone and tint all faces of one orientation alike.
    if (isOrthographic(PMat)) ks = vec3(0.0);
    float shin = material.shininess;
    bool blinn = material.blinn;
    vec3 combined = ambient * kd + material.emissive;
    #include light_shading_stmt

    outColor = vec4(combined, material.alpha);
#fi
}
