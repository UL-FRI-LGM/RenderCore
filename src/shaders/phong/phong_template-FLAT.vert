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
    //bool directional;
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
    vec3 diffuse;
    vec3 specular;
    float shininess;
};


//UIO
//**********************************************************************************************************************
#if (INSTANCED)
//uniform mat4 VMat;
uniform mat4 MVMat;
#fi
#if (!INSTANCED)
uniform mat4 MVMat; // Model View Matrix
#fi
uniform mat4 PMat;  // Projection Matrix
uniform mat3 NMat;  // Normal Matrix

#if (INSTANCED)
in mat4 MMat;
#fi
in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal

// Output transformed vertex position, normal and texture coordinate
//out vec3 fragVPos;
//out vec3 fragVNorm;
flat out vec4 fragVColor;


#if (COLORS)
    in vec4 VColor;
#fi

#if (TEXTURE)
    in vec2 uv;          // Texture coordinate
    out vec2 fragUV;
#fi


#if (POINTS)
    uniform float pointSize;
#fi

#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
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
uniform Material material;
#if (TRANSPARENT)
uniform float alpha;
#else
    float alpha = 1.0;
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

#if (DLIGHTS)
vec3 calcDirectLight (DLight light, vec3 normal, vec3 viewDir) {

    vec3 lightDir = normalize(light.position);

    // Difuse
    float diffuseF = max(dot(normal, lightDir), 0.0f);

    // Specular
    vec3 reflectDir = reflect(-lightDir, normal);
    float specularF = pow(max(dot(viewDir, reflectDir), 0.0f), material.shininess);

    // Combine results
    vec3 diffuse  = light.color  * diffuseF * material.diffuse;
    vec3 specular = light.color * specularF * material.specular;

    return (diffuse + specular);
}
#fi

#if (PLIGHTS)
// Calculates the point light color contribution
vec3 calcPointLight (vec3 fragVPos, PLight light, vec3 normal, vec3 viewDir) {

    float distance = length(light.position - fragVPos);
    if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);
    
    vec3 lightDir = normalize(light.position - fragVPos);

    // Difuse
    float diffuseF = max(dot(lightDir, normal), 0.0f);

    // Specular
    vec3 reflectDir = reflect(-lightDir, normal);
    float specularF = pow(max(dot(viewDir, reflectDir), 0.0f), material.shininess);

    // Attenuation
    float attenuation = calcAttenuation(light.constant, light.linear, light.quadratic, distance);

    // Combine results
    vec3 diffuse  = light.color * diffuseF  * material.diffuse  * attenuation;
    vec3 specular = light.color * specularF * material.specular * attenuation;

    return (diffuse + specular);
}
#fi

#if (SLIGHTS)
vec3 calcSpotLight (vec3 fragVPos, SLight light, vec3 normal, vec3 viewDir) {

    float distance = length(light.position - fragVPos);
    if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);
    
    vec3 lightDir = normalize(light.position - fragVPos);


    // spot
    float theta = dot(lightDir, normalize(-light.direction));
    float epsilon = light.cutoff - light.outerCutoff;
    float intensity = clamp((theta - light.outerCutoff) / epsilon, 0.0, 1.0);
    //if(theta <= light.cutoff) return vec3(0.0, 0.0, 0.0);
    if(theta <= light.outerCutoff) return vec3(0.0, 0.0, 0.0);


    // Difuse
    float diffuseF = max(dot(lightDir, normal), 0.0f);

    // Specular
    vec3 reflectDir = reflect(-lightDir, normal);
    float specularF = pow(max(dot(viewDir, reflectDir), 0.0f), material.shininess);

    // Attenuation
    float attenuation = calcAttenuation(light.constant, light.linear, light.quadratic, distance);

    // Combine results
    vec3 diffuse  = light.color * diffuseF  * material.diffuse  * attenuation;
    vec3 specular = light.color * specularF * material.specular * attenuation;

    return (diffuse + specular) * intensity;
}
#fi


//MAIN
//**********************************************************************************************************************
void main() {
    // Model view position
    //vec4 VPos_viewspace = MVMat * vec4(VPos, 1.0); //original (non-instanced)
    #if (!INSTANCED)
    vec4 VPos_viewspace = MVMat * vec4(VPos, 1.0);
    #fi
    #if (INSTANCED)
    //vec4 VPos_viewspace = VMat * MMat * vec4(VPos, 1.0);
    vec4 VPos_viewspace = MVMat * MMat * vec4(VPos, 1.0);
    #fi

    // Projected position
    gl_Position = PMat * VPos_viewspace;


    vec3 normal = normalize(NMat * VNorm);
    vec3 viewDir = normalize(-VPos_viewspace.xyz);

    // Calculate combined light contribution
    vec3 combined = ambient;

    #if (DLIGHTS)
        #for lightIdx in 0 to NUM_DLIGHTS
            combined += calcDirectLight(dLights[##lightIdx], normal, viewDir);
        #end
    #fi
    #if (PLIGHTS)
        #for lightIdx in 0 to NUM_PLIGHTS
            combined += calcPointLight(VPos_viewspace.xyz, pLights[##lightIdx], normal, viewDir);
        #end
    #fi
    #if (SLIGHTS)
        #for lightIdx in 0 to NUM_SLIGHTS
            combined += calcSpotLight(VPos_viewspace.xyz, sLights[##lightIdx], normal, viewDir);
        #end
    #fi

    fragVColor = vec4(combined, alpha);


    #if (COLORS)
        fragVColor += VColor;
    #fi

    #if (TEXTURE)
        // Pass-through texture coordinate
        fragUV = uv;
    #fi


    #if (POINTS)
        gl_PointSize = pointSize / length(VPos_viewspace.xyz);
        if(gl_PointSize < 1.0) gl_PointSize = 1.0;
    #fi

    #if (CLIPPING_PLANES)
        vViewPosition = -VPos_viewspace.xyz;
    #fi
}