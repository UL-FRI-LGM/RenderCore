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
    samplerCube shadowmap;
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
// AMT again what is dependent with plights
#if (!NORMAL_MAP && !NORMAL_FLAT)
in vec3 fragVNorm;
#fi


#if (COLORS)
#fi
in vec4 fragVColor; // AMT take it out from color define

#if (TEXTURE)
    in vec2 fragUV;
#fi

#if (PICK_MODE_RGB)
    uniform vec3 u_RGB_ID;
    layout(location = 0) out vec4 objectID;
#else if (PICK_MODE_UINT)
    uniform uint u_UINT_ID;
    #if (INSTANCED)
        uniform bool u_PickInstance;
        flat in uint InstanceID;
    #fi
    layout(location = 0) out uint objectID;
#else if (OUTLINE)
    // in vec3 v_position_viewspace;
    in vec3 v_normal_viewspace;
    in vec3 v_ViewDirection_viewspace;

    layout (location = 0) out vec4 vn_viewspace;
    layout (location = 1) out vec4 vd_viewspace;
    #if (DEPTH)
        layout (location = 2) out vec4 de_viewspace; // could be float
    #fi
#else
    out vec4 outColor;
#fi

#if (CLIPPING_PLANES)
    struct ClippingPlane {
        vec3 normal;
        float constant;
    };

    uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];

    in vec3 vViewPosition;
#fi

// in vec4 v_VColor;


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
    // vec3 diffuse  = light.color * diffuseF  * material.diffuse  * attenuation;
    // vec3 specular = light.color * specularF * material.specular * attenuation;
   // #if (COLORS)
        vec3 diffuse  = light.color * diffuseF  * (fragVColor.rgb) * attenuation;
    //#else
    //    vec3 diffuse  = light.color * diffuseF  * material.diffuse  * attenuation;
    //#fi
    vec3 specular = light.color * specularF * material.specular * attenuation;

    return (diffuse + specular);
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

 //  vec4 color = v_VColor;

    #if (OUTLINE)
        vn_viewspace = vec4(v_normal_viewspace, 0.0);
        vd_viewspace = vec4(v_ViewDirection_viewspace, 0.0);
        #if (DEPTH)
            de_viewspace = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
        #fi
    #else if (PICK_MODE_RGB)
        objectID = vec4(u_RGB_ID, 1.0);
    #else if (PICK_MODE_UINT)
        #if (INSTANCED)
            if (u_PickInstance) {
                objectID = InstanceID; // 0 is a valid result
            } else {
                objectID = u_UINT_ID;
            }
        #else
            objectID = u_UINT_ID;
        #fi
    #else

    // AMT additions
    #if (!NORMAL_MAP)
        #if (NORMAL_FLAT)
            vec3 fdx = dFdx(fragVPos);
            vec3 fdy = dFdy(fragVPos);
            vec3 normal = normalize(cross(fdx, fdy));

            //vec3 viewDir = vec3(0.0, 0.0, -1.0); //view direction in viewspace!
        #else if (!NORMAL_FLAT)
            vec3 normal = normalize(fragVNorm);
        #fi

        vec3 viewDir = normalize(-fragVPos);

        #if (HEIGHT_MAP)
            texCoords = parallaxOffset(texCoords, viewDir);
            if(texCoords.x > 1.0 || texCoords.y > 1.0 || texCoords.x < 0.0 || texCoords.y < 0.0) discard;
        #fi
    #else
        vec3 viewDir = normalize(-v_position_tangentspace);

        #if (HEIGHT_MAP)
            texCoords = parallaxOffset(texCoords, viewDir);
            if(texCoords.x > 1.0 || texCoords.y > 1.0 || texCoords.x < 0.0 || texCoords.y < 0.0) discard;
        #fi

        vec3 normal = texture(material.normalMap, texCoords).rgb;
        normal = normal*2.0 - 1.0;
        normal = normalize(normal);
    #fi

    // Calculate combined light contribution
    #if (!DIFFUSE_MAP)
        vec3 combined = ambient;
    #else
        vec3 combined = ambient * texture(material.diffuseMap, texCoords).rgb;
    #fi

    #if (PLIGHTS)
        vec3 pLight;
        float pShadow = 0.0;

        #for lightIdx in 0 to NUM_PLIGHTS
            #if (!NORMAL_MAP)
            pLight = calcPointLight(pLights[##lightIdx], normal, viewDir);
            #else
            pLight = calcPointLight_tangentspace(pLights[##lightIdx], v_pLightPosition_tangentspace[##lightIdx], viewDir, v_position_tangentspace, normal, texCoords);
            #fi

            combined += pLight * (1.0 - pShadow);
        #end
        outColor = vec4(combined, alpha);
    #fi
#fi
}
