#version 300 es
precision mediump float;


//STRUCT
//**********************************************************************************************************************
#if (DLIGHTS)
struct DLight {
    //bool directional;
    vec3 position;
    vec3 color;
};
#fi
#if (PLIGHTS)
struct PLight {
    //bool directional;
    vec3 position;
    vec3 color;
    float distance;
    float decay;

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

#if (PLIGHTS || SLIGHTS)
in vec3 fragVPos;
#fi


#if (COLORS)
    in vec4 fragVColor;
#fi

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;

#if (CLIPPING_PLANES)
    struct ClippingPlane {
        vec3 normal;
        float constant;
    };

    uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];

    in vec3 vViewPosition;
#fi


//FUNCTIONS
//**********************************************************************************************************************
#include light_falloff_decl


//MAIN
//**********************************************************************************************************************
void main() {

    #if (CLIPPING_PLANES)
        bool clipped = true;
        for(int i = 0; i < ##NUM_CLIPPING_PLANES; i++){
            clipped = ( dot( vViewPosition, clippingPlanes[i].normal ) > clippingPlanes[i].constant ) && clipped;
        }
        if ( clipped ) discard;
    #fi


    // Calculate combined light contribution
    #if (PLIGHTS || SLIGHTS)
        vec3 P = fragVPos;
    #fi
    vec3 kd = material.diffuse;
    #if (COLORS)
        kd *= fragVColor.rgb;
    #fi
    vec3 combined = ambient * kd + material.emissive;
    #include light_falloff_stmt

    color = vec4(combined, alpha);


    #if (COLORS)
        color.a += fragVColor.a;
    #fi


    #if (TEXTURE)
        // Apply all of the textures
        #for I_TEX in 0 to NUM_TEX
            color *= texture(material.texture##I_TEX, fragUV);
        #end
    #fi
}