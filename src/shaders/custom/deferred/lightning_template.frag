#version 300 es
precision highp float;


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
// struct Light {
//     bool directional;
//     vec3 position;
//     vec3 color;
// };

struct Material {
    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi
};


//UIO
//**********************************************************************************************************************
#if (DLIGHTS)
uniform DLight dLights[##NUM_DLIGHTS];
#fi
#if (PLIGHTS)
uniform PLight pLights[##NUM_PLIGHTS];
#fi
// #if (!NO_LIGHTS)
//     uniform Light lights[##NUM_LIGHTS];
// #fi


uniform vec3 ambient;
uniform Material material;
uniform int drawMode;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


//FUNCTIONS
//**********************************************************************************************************************
// vec3 calcPointLight (Light light, vec3 fragPos, vec3 normal, vec3 viewDir, vec3 diffuse, float specular) {

//     vec3 lightDir = normalize(light.position - fragPos);

//     // Difuse
//     float diffuseF = max(dot(lightDir, normal), 0.0f);

//     // Specular
//     vec3 reflectDir = reflect(-lightDir, normal);
//     float specularF = pow(max(dot(viewDir, reflectDir), 0.0f), 16.0f);

//     // Attenuation
//     float distance = length(light.position - fragPos);
//     float attenuation = 1.0f / (1.0f + 0.01f * distance + 0.0001f * (distance * distance));

//     // Combine results
//     vec3 diffuseOut  = light.color * diffuseF  * diffuse  * attenuation;
//     vec3 specularOut = light.color * specularF * specular * attenuation;

//     return (diffuseOut + specularOut);
// }
#if (PLIGHTS)
vec3 calcPointLight (PLight light, vec3 fragPos, vec3 normal, vec3 viewDir, vec3 diffuse, float specular) {

    vec3 lightDir = normalize(light.position - fragPos);

    // Difuse
    float diffuseF = max(dot(lightDir, normal), 0.0f);

    // Specular
    vec3 reflectDir = reflect(-lightDir, normal);
    float specularF = pow(max(dot(viewDir, reflectDir), 0.0f), 16.0f);

    // Attenuation
    float distance = length(light.position - fragPos);
    float attenuation = 1.0f / (1.0f + 0.01f * distance + 0.0001f * (distance * distance));

    // Combine results
    vec3 diffuseOut  = light.color * diffuseF  * diffuse  * attenuation;
    vec3 specularOut = light.color * specularF * specular * attenuation;

    return (diffuseOut + specularOut);
}
#fi


//MAIN
//**********************************************************************************************************************
void main() {

    // Retrieve data from gbuffer
    vec3 diffuse = texture(material.texture0, fragUV).rgb;
    float specular = texture(material.texture0, fragUV).a;
    vec3 fragPos = texture(material.texture1, fragUV).rgb;
    vec3 normal = texture(material.texture2, fragUV).rgb;

    vec3 viewDir = normalize(-fragPos);

    // Calculate combined light contribution
    vec3 lighting = ambient * diffuse;

    // #if (!NO_LIGHTS)
    //     #for lightIdx in 0 to NUM_LIGHTS
    //         if (!lights[##lightIdx].directional) {
    //             lighting += calcPointLight(lights[##lightIdx], fragPos, normal, viewDir, diffuse, specular);
    //         }
    //     #end
    // #fi
    #if (PLIGHTS)
        #for lightIdx in 0 to NUM_PLIGHTS
            lighting += calcPointLight(pLights[##lightIdx], fragPos, normal, viewDir, diffuse, specular);
        #end
    #fi


    if (drawMode == 1)
        color = vec4(lighting, 1.0);
    else if (drawMode == 2)
        color = vec4(fragPos, 1.0);
    else if (drawMode == 3)
        color = vec4(normal, 1.0);
    else if (drawMode == 4)
        color = vec4(diffuse, 1.0);
    else if (drawMode == 5)
        color = vec4(vec3(specular), 1.0);

}