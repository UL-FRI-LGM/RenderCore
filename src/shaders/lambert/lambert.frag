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
    float decay;
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
};


//UIO
//**********************************************************************************************************************
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

in vec3 v_position_viewspace;
in vec3 v_normal_viewspace;
in vec3 v_ViewDirection_viewspace;

out vec4 color;


//FUNCTIONS
//**********************************************************************************************************************
#if (PLIGHTS || SLIGHTS)
float calcAttenuation(float constant, float linear, float quadratic, float distance) {
    //float attenuation = 1.0f / (1.0f + 0.01f * distance + 0.0001f * (distance * distance));
    //float attenuation = light.decay / (light.decay + 0.01f * distance + 0.0001f * (distance * distance));
    
    return 1.0 / (constant + linear * distance + quadratic * (distance * distance));
}
#fi

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
    float attenuation = calcAttenuation(light.constant, light.linear, light.quadratic, distance);

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
    float attenuation = calcAttenuation(light.constant, light.linear, light.quadratic, distance);

    // Combine results
    vec3 diffuse  = light.color * diffuseF  * material.diffuse  * attenuation;

    return diffuse * intensity;
}
#fi


//MAIN
//**********************************************************************************************************************
void main() {
   vec4 combined = vec4(ambient + material.emissive, material.alpha);
   vec3 VPos_viewspace = v_position_viewspace;
   vec3 normal = v_normal_viewspace;
   vec3 viewDir = v_ViewDirection_viewspace;

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


   color = combined;
}