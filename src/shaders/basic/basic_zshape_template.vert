#version 300 es
precision mediump float;


//DEF
//**********************************************************************************************************************

#if (INSTANCED)
struct Material {
    vec3 emissive;
    vec3 diffuse;
    float alpha;
    sampler2D instanceData0;
    // The following one could actually be instanced in int (or it has to be float?)
    // #if (OUTLINE)
    //    sampler2D instance_indices;
    // #fi
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
#fi

//STRUCT
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

//UIO
//**********************************************************************************************************************
uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform vec2 viewport;
uniform vec3 ShapeSize;

in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal
uniform mat3 NMat;  // Normal Matrix

#if (COLORS)
    in vec4 VColor;
#fi
out vec4 fragVColor; // AMT take it outfrom COLORS define

#if (TEXTURE)
    in vec2 uv;
    out vec2 fragUV;
#fi

#if (PLIGHTS)
    out vec3 fragVPos;
#fi
#if (!NORMAL_MAP && !NORMAL_FLAT)
out vec3 fragVNorm;
#fi

#if (POINTS)
    uniform float pointSize;
#fi

#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi

#if (INSTANCED)
    uniform Material material;
    #if (PICK_MODE_UINT)
        flat out uint InstanceID;
    #fi
    #if (OUTLINE)
        uniform bool u_OutlineGivenInstances;
        in  int  a_OutlineInstances;
    #fi

#fi

#if (OUTLINE)
out vec3 v_normal_viewspace;
out vec3 v_ViewDirection_viewspace;
#fi

// AMT
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
vec3 coldif;

//FUNCTIONS
//**********************************************************************************************************************
#if (DLIGHTS)
vec3 calcDirectLight (DLight light, vec3 normal, vec3 viewDir) {

    vec3 lightDir = normalize(-light.direction);

    // Difuse
    float diffuseF = max(dot(normal, lightDir), 0.0f);

    // Combine results
    vec3 diffuse  = light.color * diffuseF * coldif;

    return diffuse;
}
#fi


#if (SLIGHTS)
vec3 calcSpotLight (vec3 VPos_viewspace, SLight light, vec3 normal, vec3 viewDir) {

    float distance = length(light.position - VPos_viewspace);
   // AMT if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);

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
    float attenuation = 1.0f; // light.decay / (light.decay + 0.01f * distance + 0.0001f * (distance * distance));

    // Combine results
    vec3 diffuse  = light.color * diffuseF  * coldif  * attenuation;

    return diffuse * intensity;
}
#fi
//FUNCTIONS
//**********************************************************************************************************************

#if (PLIGHTS)
// Calculates the point light color contribution
vec3 calcPointLight (vec3 VPos_viewspace, PLight light, vec3 normal, vec3 viewDir) {

    float distance = length(light.position - VPos_viewspace);
  // AMT  if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);

    vec3 lightDir = normalize(light.position - VPos_viewspace);

    // Difuse
    float diffuseF = max(dot(lightDir, normal), 0.0f);

    // Attenuation
    //float attenuation = 1.0f / (1.0f + 0.01f * distance + 0.0001f * (distance * distance));
    float attenuation = 1.0f;// AMT light.decay / (light.decay + 0.01f * distance + 0.0001f * (distance * distance));

    // Combine results
    // vec3 diffuse  = light.color * diffuseF  * material.diffuse  * attenuation;
    vec3 diffuse  = light.color * diffuseF  * coldif  * attenuation;

    return diffuse;
}
#fi

//MAIN
//**********************************************************************************************************************
void main() {
    // Position of the origin in viewspace.
    vec3 VPos_final;
    vec3 VPos_local = vec3(ShapeSize.x, ShapeSize.y, ShapeSize.z) * VPos;

    #if (INSTANCED)
        int iID = gl_InstanceID;
        #if (OUTLINE)
            if (u_OutlineGivenInstances)
                iID = a_OutlineInstances;
        #fi
        #if (MAT4_PER_INSTANCE)
            int pID = 4 * iID;
        #else if (SCALE_PER_INSTANCE)
            int pID = 2 * iID; // pixelID
        #else
            int pID = iID; // pixelID
        #fi
        int   tsx = textureSize(material.instanceData0, 0).x;
        ivec2 tc  = ivec2(pID % tsx, pID / tsx);
        vec4  pos = texelFetch(material.instanceData0, tc, 0);

        uint rgba = floatBitsToUint(pos.w);
        coldif.r = float((uint(0xff0000) & rgba) >> 16) / 255.0;
        coldif.g = float((uint(0xff00) & rgba) >> 8) / 255.0;
        coldif.b = float((uint(0xff) & rgba) >> 0) / 255.0;

        #if (SCALE_PER_INSTANCE)
            vec4 scale = texelFetchOffset(material.instanceData0, tc, 0, ivec2(1, 0));
            VPos_final = pos.xyz + VPos_local * scale.xyz;
        #else if (MAT4_PER_INSTANCE)
            mat3 mmat = mat3(texelFetchOffset(material.instanceData0, tc, 0, ivec2(1, 0)).xyz,
                             texelFetchOffset(material.instanceData0, tc, 0, ivec2(2, 0)).xyz,
                             texelFetchOffset(material.instanceData0, tc, 0, ivec2(3, 0)).xyz);
            VPos_final = pos.xyz + mmat * VPos_local;
        #else
            VPos_final = pos.xyz + VPos_local;
        #fi
        #if (PICK_MODE_UINT)
            InstanceID = uint(iID);
        #fi
    #else
        VPos_final = VPos_local;
        coldif = material.diffuse;
    #fi

    vec4 VPos_viewspace = MVMat * vec4(VPos_final, 1.0);

    // Assume vertices in x,y plane, z = 0; close to (0, 0) as ShapeSize
    // will scale them (for centered sprite there should be a quad with x, y = +-0.5).
    gl_Position = PMat * VPos_viewspace;

    #if (PLIGHTS)
        // Pass vertex position to fragment shader
        fragVPos = vec3(VPos_viewspace) / VPos_viewspace.w;
    #fi

    //#if (COLORS)
        // Pass vertex color to fragment shader
        fragVColor = vec4(coldif, 1.0);
    //#fi

    #if (TEXTURE)
        // Pass uv coordinate to fragment shader
        fragUV = uv;
    #fi

    #if (CLIPPING_PLANES)
        vViewPosition = -VPos_viewspace.xyz;
    #fi

    #if (OUTLINE)
        v_normal_viewspace = vec3(0.0, 0.0, -1.0);

        float dToCam = length(VPos_viewspace.xyz);
        v_ViewDirection_viewspace = -VPos_viewspace.xyz / dToCam;
    #fi

    // define colors for fragment shader
    //
    vec4 combined = vec4(ambient + material.emissive, material.alpha);
#if (MAT4_PER_INSTANCE)
    vec3 normal = normalize(NMat * mmat * VNorm);
#else
    vec3 normal = normalize(NMat * VNorm);
#fi
    vec3 viewDir = normalize(-VPos_viewspace.xyz);

    #if (DLIGHTS)
        vec3 dLight;
        float dShadow = 0.0;

        #for lightIdx in 0 to NUM_DLIGHTS
            dLight = calcDirectLight(dLights[##lightIdx], normal, viewDir);
            combined.rgb += dLight;
        #end
    #fi
    #if (PLIGHTS)
        vec3 pLight;
        float pShadow = 0.0;

        #for lightIdx in 0 to NUM_PLIGHTS
            pLight = calcPointLight(VPos_viewspace.xyz, pLights[##lightIdx], normal, viewDir);
           // combined.rgb += pLight;
        #end
    #fi
    #if (SLIGHTS)
        vec3 sLight;
        float sShadow = 0.0;

        #for lightIdx in 0 to NUM_SLIGHTS
            sLight = calcSpotLight(VPos_viewspace.xyz, sLights[##lightIdx], normal, viewDir);
            combined.rgb += sLight;
        #end
    #fi

   //  #if (!NORMAL_MAP && !NORMAL_FLAT)
    #if (NORMAL_MAP && !NORMAL_FLAT)// ?? AMT TMP HACK for the FLATNOTMAL prop bug!!!!!
        // Transform normal
        #if (!INSTANCED)
           fragVNorm = vec3(NMat * VNorm);
        #fi
        #if (INSTANCED)
           fragVNorm = vec3(NMat * mat3(MMat) * VNorm);
        #fi
    #fi
 }
