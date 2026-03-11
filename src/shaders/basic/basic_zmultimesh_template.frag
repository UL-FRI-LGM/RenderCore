#version 300 es
precision mediump float;

//DEF
//**********************************************************************************************************************

//STRUCT
//**********************************************************************************************************************

struct Material {
    vec3 emissive;
    vec3 diffuse;
    vec3 specular;
    float shininess;
    float alpha;
    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi
};

#if (CLIPPING_PLANES)
struct ClippingPlane {
    vec3  normal;
    float constant;
};
#fi

#if (DLIGHTS)
struct DLight {
    vec3 direction;
    vec3 color;
    mat4 VPMat;
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
    // float decay;
    float cutoff;
    float outerCutoff;
    vec3 direction;

    mat4 VPMat;

    float constant;
    float linear;
    float quadratic;
};
#fi

//UIO
//**********************************************************************************************************************

uniform Material material;

in vec3 fragVPos;
// in vec3 fragVPos_worldspace;

#if (TRANSPARENT)  // QQQQQQ what to do
    uniform float alpha;
#else
    float alpha = 1.0;
#fi

#if (!NORMAL_FLAT)
    in vec3 fragVNorm;
#fi

#if (COLORS)
    in vec4 fragVColor;
#fi

#if (TEXTURE)
    in vec2 fragUV;
#fi

#if (DLIGHTS)
    uniform DLight dLights[##NUM_DLIGHTS];
    // in      vec4   fragVPos_dlightspace[##NUM_DLIGHTS];
#fi

#if (PLIGHTS)
    uniform PLight pLights[##NUM_PLIGHTS];
    // in      fragVPos_plightspace[##NUM_PLIGHTS];
#fi

#if (SLIGHTS)
    uniform SLight sLights[##NUM_SLIGHTS];
    // in      vec4   fragVPos_slightspace[##NUM_SLIGHTS];
#fi

uniform vec3 ambient; // QQQQQQ how does this work

#if (CLIPPING_PLANES)
    uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];
    in      vec3          v_pos_for_clip;
#fi

#if (PICK_MODE_UINT)
    uniform uint u_UINT_ID;
    uniform bool u_PickInstance;
    uniform uint u_InstanceID;
    layout(location = 0) out uint objectID;
#else if (OUTLINE)
    #if (NORMAL_FLAT)
        in vec3 v_position_viewspace;
    #else
        in vec3 v_normal_viewspace;
    #fi
    in vec3 v_ViewDirection_viewspace;

    layout (location = 0) out vec4 vn_viewspace;
    layout (location = 1) out vec4 vd_viewspace;
    #if (DEPTH)
        layout (location = 2) out vec4 de_viewspace; // could be float
    #fi
#else
    out vec4 outColor;
#fi


//FUNCTIONS
//**********************************************************************************************************************
#if (PLIGHTS || SLIGHTS)
float calcAttenuation(float constant, float linear, float quadratic, float distance)
{
    //float attenuation = 1.0f / (1.0f + 0.01f * distance + 0.0001f * (distance * distance));
    //float attenuation = light.decay / (light.decay + 0.01f * distance + 0.0001f * (distance * distance));
    return 1.0 / (constant + linear * distance + quadratic * (distance * distance));
}
#fi

#if (DLIGHTS)
vec3 calcDirectLight (DLight light, vec3 normal, vec3 viewDir)
{
    vec3 lightDir = normalize(-light.direction);

    // Difuse
    float diffuseF = max(dot(normal, lightDir), 0.0f);
    #if (COLORS)
        vec3 diffuse  = light.color * diffuseF  * (fragVColor.rgb + material.diffuse);
    #else
        vec3 diffuse  = light.color * diffuseF  * material.diffuse;
    #fi

    // Specular - Blinn
    vec3 halfwayDir = normalize(lightDir + viewDir);  
    float specularF = pow(max(dot(normal, halfwayDir), 0.0), material.shininess);
    vec3 specular = light.color * specularF * material.specular;

    return (diffuse + specular);
}
#fi

#if (PLIGHTS)
// Calculates the point light color contribution
vec3 calcPointLight (PLight light, vec3 normal, vec3 viewDir)
{
    float distance = length(light.position - fragVPos);
    if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);

    vec3 lightDir = normalize(light.position - fragVPos);

    // Attenuation - OFF
    float attenuation = 1.0; // calcAttenuation(light.constant, light.linear, light.quadratic, distance);

    // Difuse
    float diffuseF = max(dot(lightDir, normal), 0.0f);
    #if (COLORS)
        vec3 diffuse  = light.color * diffuseF  * (fragVColor.rgb + material.diffuse) * attenuation;
    #else
        vec3 diffuse  = light.color * diffuseF  * material.diffuse  * attenuation;
    #fi

    // Specular - Blinn
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float specularF = pow(max(dot(normal, halfwayDir), 0.0), material.shininess);
    vec3 specular = light.color * specularF * material.specular * attenuation;

    return (diffuse + specular);
}
#fi

#if (SLIGHTS)
vec3 calcSpotLight (SLight light, vec3 normal, vec3 viewDir)
{
    float distance = length(light.position - fragVPos);
    if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);

    vec3 lightDir = normalize(light.position - fragVPos);

    // Attenuation - OFF
    float attenuation = 1.0; // calcAttenuation(light.constant, light.linear, light.quadratic, distance);

    // spot
    float theta = dot(lightDir, normalize(-light.direction));
    float epsilon = light.cutoff - light.outerCutoff;
    float intensity = clamp((theta - light.outerCutoff) / epsilon, 0.0, 1.0);
    if(theta <= light.outerCutoff) return vec3(0.0, 0.0, 0.0);

    // Difuse
    float diffuseF = max(dot(lightDir, normal), 0.0f);
    #if (COLORS)
        vec3 diffuse  = light.color * diffuseF  * (fragVColor.rgb + material.diffuse) * attenuation;
    #else
        vec3 diffuse  = light.color * diffuseF  * material.diffuse  * attenuation;
    #fi

    // Specular - Blinn
    vec3 halfwayDir = normalize(lightDir + viewDir);  
    float specularF = pow(max(dot(normal, halfwayDir), 0.0), material.shininess);
    vec3 specular = light.color * specularF * material.specular * attenuation;

    return (diffuse + specular) * intensity;
}
#fi


//MAIN
//**********************************************************************************************************************
void main()
{
    #if (CLIPPING_PLANES)
        bool clipped = true;
        for(int i = 0; i < ##NUM_CLIPPING_PLANES; i++) {
            clipped = ( dot( v_pos_for_clip, clippingPlanes[i].normal ) > clippingPlanes[i].constant ) && clipped;
        }
        if (clipped) discard;
    #fi

    #if (OUTLINE)

        #if (NORMAL_FLAT)
            vec3 fdx = dFdx(v_position_viewspace);
            vec3 fdy = dFdy(v_position_viewspace);
            vec3 v_normal_viewspace = normalize(cross(fdx, fdy));
        #fi
        if (gl_FrontFacing) {
            vn_viewspace = vec4(v_normal_viewspace, 0.0);
        } else {
            vn_viewspace = vec4(-v_normal_viewspace, 0.0);
        }
        vd_viewspace = vec4(v_ViewDirection_viewspace, 0.0);
        #if (DEPTH)
            de_viewspace = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
        #fi

    #else if (PICK_MODE_UINT)

        if (u_PickInstance) {
            objectID = u_InstanceID;
        } else {
            objectID = u_UINT_ID;
        }

    #else

    #if (TEXTURE)
        vec2 texCoords = fragUV;
    #fi

    #if (NORMAL_FLAT)
        vec3 fdx = dFdx(fragVPos);
        vec3 fdy = dFdy(fragVPos);
        vec3 normal = normalize(cross(fdx, fdy));
    #else
        vec3 normal = normalize(fragVNorm);
    #fi

    vec3 viewDir = normalize(-fragVPos);

    vec3 combined = ambient;

    #if (DLIGHTS)
    {   vec3 dLight;
        #for lightIdx in 0 to NUM_DLIGHTS
            dLight = calcDirectLight(dLights[##lightIdx], normal, viewDir);
            combined += dLight;
        #end
    }
    #fi
    #if (PLIGHTS)
    {   vec3 pLight;
        #for lightIdx in 0 to NUM_PLIGHTS
            pLight = calcPointLight(pLights[##lightIdx], normal, viewDir);
            combined += pLight; 
        #end
    }
    #fi
    #if (SLIGHTS)
    {   vec3 sLight;
        #for lightIdx in 0 to NUM_SLIGHTS
            sLight = calcSpotLight(sLights[##lightIdx], normal, viewDir);
            combined += sLight;
        #end
    }
    #fi

    outColor = vec4(combined, alpha);

    #if (TEXTURE)
        // Apply all of the textures
        #for I_TEX in 0 to NUM_TEX
             outColor *= texture(material.texture##I_TEX, texCoords);
        #end
    #fi

    #fi
}
