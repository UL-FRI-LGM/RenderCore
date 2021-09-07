#version 300 es
precision mediump float;
precision mediump int;


//STRUCT
//**********************************************************************************************************************
#if (DLIGHTS)
struct DLight {
    vec3 position;
    vec3 direction;
    vec3 color;
};
#fi
#if (PLIGHTS)
struct PLight {
    vec3 position;
    vec3 color;
    float distance;
    float decay;
};
#fi
#if (SLIGHTS)
struct SLight {
    vec3 position;
    vec3 color;
    float distance;
    float decay;
    float cutoff;
    float outerCutoff;
    vec3 direction;
};
#fi

struct Material {
    vec3 emissive;
    vec3 diffuse;
    float alpha;
};


//UIO
//**********************************************************************************************************************
#if (INSTANCED)
in mat4 MMat;
#fi
uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform mat3 NMat;  // Normal Matrix

#if (DLIGHTS)
uniform DLight dLights[##NUM_DLIGHTS];
#fi
#if (PLIGHTS)
uniform PLight pLights[##NUM_PLIGHTS];
#fi
#if (SLIGHTS)
uniform SLight sLights[##NUM_SLIGHTS];
#fi

uniform Material material;
uniform vec3 ambient;

in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal

out vec4 v_VColor;



//FUNCTIONS
//**********************************************************************************************************************
#if (DLIGHTS)
vec3 calcDirectLight (DLight light, vec3 normal, vec3 viewDir) {

    //vec3 lightDir = normalize(light.position);
    vec3 lightDir = normalize(-light.direction);

    // Difuse
    float diffuseF = max(dot(normal, lightDir), 0.0f);

    // Combine results
    vec3 diffuse  = light.color  * diffuseF * material.diffuse;

    return diffuse;
}
#fi

#if (PLIGHTS)
// Calculates the point light color contribution
vec3 calcPointLight (vec3 VPos_viewspace, PLight light, vec3 normal, vec3 viewDir) {

    float distance = length(light.position - VPos_viewspace);
    if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);

    vec3 lightDir = normalize(light.position - VPos_viewspace);

    // Difuse
    float diffuseF = max(dot(lightDir, normal), 0.0f);

    // Attenuation
    //float attenuation = 1.0f / (1.0f + 0.01f * distance + 0.0001f * (distance * distance));
    float attenuation = light.decay / (light.decay + 0.01f * distance + 0.0001f * (distance * distance));

    // Combine results
    vec3 diffuse  = light.color * diffuseF  * material.diffuse  * attenuation;

    return diffuse;
}
#fi

#if (SLIGHTS)
vec3 calcSpotLight (vec3 VPos_viewspace, SLight light, vec3 normal, vec3 viewDir) {

    float distance = length(light.position - VPos_viewspace);
    if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);

    vec3 lightDir = normalize(light.position - VPos_viewspace);


    // spot
    float theta = dot(lightDir, normalize(-light.direction));
    float epsilon = light.cutoff - light.outerCutoff;
    float intensity = clamp((theta - light.outerCutoff) / epsilon, 0.0, 1.0);
    //if(theta <= light.cutoff) return vec3(0.0, 0.0, 0.0);
    if(theta <= light.outerCutoff) return vec3(0.0, 0.0, 0.0);


    // Difuse
    float diffuseF = max(dot(lightDir, normal), 0.0f);

    // Attenuation
    //float attenuation = 1.0f / (1.0f + 0.01f * distance + 0.0001f * (distance * distance));
    float attenuation = light.decay / (light.decay + 0.01f * distance + 0.0001f * (distance * distance));

    // Combine results
    vec3 diffuse  = light.color * diffuseF  * material.diffuse  * attenuation;

    return diffuse * intensity;
}
#fi


//MAIN
//**********************************************************************************************************************
void main() {
    #if (!INSTANCED)
    vec4 VPos_viewspace = MVMat * vec4(VPos, 1.0);
    #fi
    #if (INSTANCED)
    //vec4 VPos_viewspace = VMat * MMat * vec4(VPos, 1.0);
    vec4 VPos_viewspace = MVMat * MMat * vec4(VPos, 1.0);
    #fi

    // Projected position
    gl_Position = PMat * VPos_viewspace;


    vec4 combined = vec4(ambient + material.emissive, material.alpha);
    vec3 normal = normalize(NMat * VNorm);
    vec3 viewDir = normalize(-VPos_viewspace.xyz);

    #if (DLIGHTS)
        vec3 dLight;
        float dShadow = 0.0;

        #for lightIdx in 0 to NUM_DLIGHTS
            dLight = calcDirectLight(dLights[##lightIdx], normal, viewDir);
            combined.rgb += dLight;

            // if(dLights[##lightIdx].castShadows && material.receiveShadows)
            //     dShadow = calcDirectShadow(fragVPos_dlightspace[##lightIdx], dLights[##lightIdx], normal);
        
            // combined += dLight * (1.0 - dShadow);
        #end
    #fi
    #if (PLIGHTS)
        vec3 pLight;
        float pShadow = 0.0;


        #for lightIdx in 0 to NUM_PLIGHTS
            pLight = calcPointLight(VPos_viewspace.xyz, pLights[##lightIdx], normal, viewDir);
            combined.rgb += pLight;

            // if(pLights[##lightIdx].castShadows && material.receiveShadows)
            //     pShadow = calcPointShadow(fragVPos_plightspace[##lightIdx], pLights[##lightIdx], normal);

            // combined += pLight * (1.0 - pShadow); 
        #end
    #fi
    #if (SLIGHTS)
        vec3 sLight;
        float sShadow = 0.0;

        #for lightIdx in 0 to NUM_SLIGHTS
            sLight = calcSpotLight(VPos_viewspace.xyz, sLights[##lightIdx], normal, viewDir);
            combined.rgb += sLight;

            // if(sLights[##lightIdx].castShadows && material.receiveShadows)
            //     sShadow = calcSpotShadow(fragVPos_slightspace[##lightIdx], sLights[##lightIdx], normal);
        
            // combined += sLight * (1.0 - sShadow);
        #end
    #fi


    v_VColor = combined;
}