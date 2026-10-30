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
uniform vec3 ambient;

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

    // Specular
    //vec3 reflectDir = reflect(-lightDir, normal);
    //float specularF = pow(max(dot(viewDir, reflectDir), 0.0f), material.shininess);
    float specularF;
    if(material.blinn)
    {
        vec3 halfwayDir = normalize(lightDir + viewDir);
        specularF = pow(max(dot(normal, halfwayDir), 0.0), material.shininess);
    }
    else
    {
        vec3 reflectDir = reflect(-lightDir, normal);
        specularF = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
    }

    // Combine results
    vec3 diffuse  = light.color * diffuseF  * fragVColor.rgb;
    vec3 specular = light.color * specularF * material.specular;

    return (diffuse + specular);
}
#fi

#if (PLIGHTS)
// Calculates the point light color contribution
vec3 calcPointLight (PLight light, vec3 normal, vec3 viewDir) {

    float distance = length(light.position - fragVPos);
    if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);

    vec3 lightDir = normalize(light.position - fragVPos);

    // Difuse
    float diffuseF = max(dot(lightDir, normal), 0.0f);

    // Specular
    //vec3 reflectDir = reflect(-lightDir, normal);
    //float specularF = pow(max(dot(viewDir, reflectDir), 0.0f), material.shininess);
    float specularF;
    if(material.blinn)
    {
        vec3 halfwayDir = normalize(lightDir + viewDir);
        specularF = pow(max(dot(normal, halfwayDir), 0.0), material.shininess);
    }
    else
    {
        vec3 reflectDir = reflect(-lightDir, normal);
        specularF = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
    }

    // Attenuation
    float attenuation = 1.0; // calcAttenuation(light.constant, light.linear, light.quadratic, distance);

    // Combine results
    vec3 diffuse  = light.color * diffuseF  * fragVColor.rgb * attenuation;
    vec3 specular = light.color * specularF * material.specular * attenuation;

    return (diffuse + specular);
}
#fi


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
        vec3 normal = normalize(cross(fdx, fdy));

        //vec3 viewDir = vec3(0.0, 0.0, -1.0); //view direction in viewspace!
    #else
        vec3 normal = normalize(fragVNorm);
    #fi

    vec3 viewDir = normalize(-fragVPos);

    #if (HEIGHT_MAP)
        texCoords = parallaxOffset(texCoords, viewDir);
        if(texCoords.x > 1.0 || texCoords.y > 1.0 || texCoords.x < 0.0 || texCoords.y < 0.0) discard;
    #fi

    // Calculate combined light contribution
    vec3 combined = ambient + material.emissive;

    #if (DLIGHTS)
        vec3 dLight;

        #for lightIdx in 0 to NUM_DLIGHTS
            dLight = calcDirectLight(dLights[##lightIdx], normal, viewDir);

            combined += dLight;
        #end
    #fi

    #if (PLIGHTS)
        vec3 pLight;

        #for lightIdx in 0 to NUM_PLIGHTS
            pLight = calcPointLight(pLights[##lightIdx], normal, viewDir);

            combined += pLight;
        #end
    #fi

    outColor = vec4(combined, material.alpha);
#fi
}
