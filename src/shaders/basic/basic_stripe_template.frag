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

#if (PLIGHTS)
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
#if (PLIGHTS)
    // Calculates the point light color contribution
    vec3 calcPointLight(PLight light) {

        float distance = length(light.position - fragVPos);
        if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);

        // Attenuation
        //float attenuation = 1.0f / (1.0f + 0.01f * distance + 0.0001f * (distance * distance));
        float attenuation = light.decay / (light.decay + 0.01f * distance + 0.0001f * (distance * distance));

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