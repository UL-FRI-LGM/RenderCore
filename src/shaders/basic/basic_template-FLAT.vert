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
    vec3 emissive;
    vec3 diffuse;
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
uniform vec3 ambient;


#if (INSTANCED)
//uniform mat4 VMat;
uniform mat4 MVMat;
#fi
#if (!INSTANCED)
uniform mat4 MVMat; // Model View Matrix
#fi
uniform mat4 PMat;  // Projection Matrix


#if (INSTANCED)
in mat4 MMat;
#fi
in vec3 VPos;       // Vertex position



//out vec3 fragVPos;

flat out vec4 fragVColor;


#if (COLORS)
    in vec4 VColor;
#fi

#if (TEXTURE)
    in vec2 uv;
    out vec2 fragUV;
#fi


#if (POINTS)
    uniform float pointSize;
#fi

#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi


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

#if (PLIGHTS)
// Calculates the point light color contribution
vec3 calcPointLight(vec3 fragVPos, PLight light) {

    float distance = length(light.position - fragVPos);
    if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);

    // Attenuation
    float attenuation = calcAttenuation(light.constant, light.linear, light.quadratic, distance);

    // Combine results
    vec3 diffuse = light.color * material.diffuse * attenuation;

    return diffuse;
}
#fi

#if (SLIGHTS)
vec3 calcSpotLight(vec3 fragVPos, SLight light) {
    
    float distance = length(light.position - fragVPos);
    if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);


    // spot
    vec3 lightDir = normalize(light.position - fragVPos);
    
    float theta = dot(lightDir, normalize(-light.direction));
    float epsilon = light.cutoff - light.outerCutoff;
    float intensity = clamp((theta - light.outerCutoff) / epsilon, 0.0, 1.0);
    //if(theta <= light.cutoff) return vec3(0.0, 0.0, 0.0);
    if(theta <= light.outerCutoff) return vec3(0.0, 0.0, 0.0);


    // Attenuation
    float attenuation = calcAttenuation(light.constant, light.linear, light.quadratic, distance);

    // Combine results
    vec3 diffuse = light.color * material.diffuse * attenuation;

    return diffuse * intensity;
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


    // Calculate combined light contribution
    vec3 combined = ambient + material.emissive;

    #if (DLIGHTS)
        #for lightIdx in 0 to NUM_DLIGHTS
            combined += dLights[##lightIdx].color * material.diffuse;
        #end
    #fi
    #if (PLIGHTS)
        #for lightIdx in 0 to NUM_PLIGHTS
            combined += calcPointLight(VPos_viewspace.xyz, pLights[##lightIdx]);
        #end
    #fi
    #if (SLIGHTS)
        #for lightIdx in 0 to NUM_SLIGHTS
            combined += calcSpotLight(VPos_viewspace.xyz, sLights[##lightIdx]);
        #end
    #fi

    fragVColor = vec4(combined, alpha);


    #if (COLORS)
        // Pass vertex color to fragment shader
        fragVColor += VColor;
    #fi


    #if (TEXTURE)
        // Pass-through texture coordinate // Pass uv coordinate to fragment shader
        fragUV = uv;
    #fi


    #if (POINTS)
        #if (POINTS_SCALE)
            gl_PointSize = pointSize / length(VPos_viewspace.xyz);
        #else
            gl_PointSize = pointSize;
        #fi
        if(gl_PointSize < 1.0) gl_PointSize = 1.0;
    #fi


    #if (CLIPPING_PLANES)
        vViewPosition = -VPos_viewspace.xyz;
    #fi
 }