#version 300 es
precision mediump float;


//DEF
//**********************************************************************************************************************
#define SPRITE_SPACE_WORLD 0.0
#define SPRITE_SPACE_SCREEN 1.0


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
uniform vec3 ambient;
#if (CIRCLES)
uniform vec2 spriteSize;
uniform vec2 viewport;
uniform float MODE;
#fi

#if (PLIGHTS)
in vec3 fragVPos;
#fi


#if (COLORS)
    in vec4 fragVColor;
#fi

#if (TEXTURE)
    in vec2 fragUV;
#fi

in vec2 VCenter;
in vec2 deltaVPos;

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
#if (PLIGHTS || SLIGHTS)
float calcAttenuation(float constant, float linear, float quadratic, float distance) {
    //float attenuation = 1.0f / (1.0f + 0.01f * distance + 0.0001f * (distance * distance));
    //float attenuation = light.decay / (light.decay + 0.01f * distance + 0.0001f * (distance * distance));
    
    return 1.0 / (constant + linear * distance + quadratic * (distance * distance));
}
#fi

#if (PLIGHTS)
    // Calculates the point light color contribution
    vec3 calcPointLight(PLight light) {

        float distance = length(light.position - fragVPos);
        if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);

        // Attenuation
        float attenuation = calcAttenuation(light.constant, light.linear, light.quadratic, distance);

        // Combine results
        vec3 diffuse = light.color * material.diffuse * attenuation;

        return diffuse;
    }
#fi


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


    #if (CIRCLES)
    //DEPRECATED
    // if(MODE == SPRITE_SPACE_WORLD){
    //     //if (distance(deltaVPos.xy, VCenter.xy) > 4.0) {
    //     if (distance(deltaVPos.xy, VCenter.xy) > spriteSize.x) {
    //         discard; //performance trap
    //         //color = vec4(1.0, 1.0, 1.0, 0.0);
    //     }
    // }else if(MODE == SPRITE_SPACE_SCREEN){
    //     if (distance(deltaVPos.xy, VCenter.xy) > spriteSize.x) {
    //         discard; //performance trap
    //         //color = vec4(1.0, 1.0, 1.0, 0.0);
    //     }
    // }
    if (distance(deltaVPos.xy, VCenter.xy) > spriteSize.x) {
        discard; //performance trap
        //color = vec4(1.0, 1.0, 1.0, 0.0);
    }
    #fi


    // Calculate combined light contribution
    vec3 combined = ambient + material.emissive;

    #if (DLIGHTS)
        #for lightIdx in 0 to NUM_DLIGHTS
            combined += dLights[##lightIdx].color * material.diffuse;
        #end
    #fi

    #if (PLIGHTS)
        #for lightIdx in 0 to NUM_PLIGHTS
            combined += calcPointLight(pLights[##lightIdx]);
        #end
    #fi

    color = vec4(combined, alpha);


    #if (COLORS)
        color += fragVColor;
    #fi


    #if (TEXTURE)
        // Apply all of the textures
        #for I_TEX in 0 to NUM_TEX
            color *= texture(material.texture##I_TEX, fragUV);
        #end
    #fi
}