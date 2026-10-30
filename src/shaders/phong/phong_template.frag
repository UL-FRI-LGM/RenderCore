#version 300 es
precision mediump float;


//STRUCT
//**********************************************************************************************************************
#if (DLIGHTS)
struct DLight {
    //bool directional;
    vec3 position;
    vec3 direction;
    vec3 color;

    mat4 VPMat;
    sampler2D shadowmap;
    bool castShadows;
    bool hardShadows;
    float minBias;
    float maxBias;
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
#if (SLIGHTS)
struct SLight {
    //bool directional;
    vec3 position;
    vec3 color;
    float distance;
    //float decay;
    float cutoff;
    float outerCutoff;
    vec3 direction;

    mat4 VPMat;
    sampler2D shadowmap;
    bool castShadows;
    bool hardShadows;
    float minBias;
    float maxBias;

    float constant;
    float linear;
    float quadratic;
};
#fi

struct Material {
    vec3 diffuse;
    vec3 specular;
    float shininess;

    bool blinn;

    #if (DIFFUSE_MAP)
    sampler2D diffuseMap;
    #fi
    #if (SPECULAR_MAP)
    sampler2D specularMap;
    #fi
    #if (NORMAL_MAP)
    sampler2D normalMap;
    #fi 
    #if (HEIGHT_MAP)
    sampler2D heightMap;
    float heightScale;
    #fi 
    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi
    #if (CUBETEXTURES)
        #for I_TEX in 0 to NUM_CUBETEXTURES
            samplerCube cubeTexture##I_TEX;
        #end
    #fi

    bool receiveShadows;
};

// array of offset direction for sampling
vec3 sampleOffsetDirections[20] = vec3[]
(
   vec3(1.0, 1.0,  1.0), vec3( 1.0, -1.0,  1.0), vec3(-1.0, -1.0,  1.0), vec3(-1.0, 1.0,  1.0), 
   vec3(1.0, 1.0, -1.0), vec3( 1.0, -1.0, -1.0), vec3(-1.0, -1.0, -1.0), vec3(-1.0, 1.0, -1.0),
   vec3(1.0, 1.0,  0.0), vec3( 1.0, -1.0,  0.0), vec3(-1.0, -1.0,  0.0), vec3(-1.0, 1.0,  0.0),
   vec3(1.0, 0.0,  1.0), vec3(-1.0,  0.0,  1.0), vec3( 1.0,  0.0, -1.0), vec3(-1.0, 0.0, -1.0),
   vec3(0.0, 1.0,  1.0), vec3( 0.0, -1.0,  1.0), vec3( 0.0, -1.0, -1.0), vec3( 0.0, 1.0, -1.0)
);


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
uniform Material material;
uniform mat4 PMat;
#if (TRANSPARENT)
uniform float alpha;
#else
float alpha = 1.0;
#fi

// From vertex shader
in vec3 fragVPos;
#if (!NORMAL_MAP && !NORMAL_FLAT)
in vec3 fragVNorm;
#fi

#if (TEXTURE || DIFFUSE_MAP || SPECULAR_MAP || NORMAL_MAP)
    in vec2 fragUV;
#fi
in vec3 fragVPos_worldspace;
#if (CUBETEXTURES)
    uniform vec3 cameraPosition;
    //uniform samplerCube skybox_tex;
    uniform mat4 VMat;
    //in vec3 fragVPos_worldspace;
    in vec3 fragVNorm_worldspace;
#fi

#if (COLORS)
    in vec4 fragVColor;
#fi

#if (CLIPPING_PLANES)
    struct ClippingPlane {
        vec3 normal;
        float constant;
    };

    uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];

    in vec3 vViewPosition;
#fi

out vec4 color[3];


#if (DLIGHTS)
in vec4 fragVPos_dlightspace[##NUM_DLIGHTS];
#fi
#if (PLIGHTS)
in vec4 fragVPos_plightspace[##NUM_PLIGHTS];
#fi
#if (SLIGHTS)
in vec4 fragVPos_slightspace[##NUM_SLIGHTS];
#fi


#if (NORMAL_MAP)
#if (DLIGHTS)
//in vec3 v_dLightPosition_tangentspace[##NUM_DLIGHTS];
in vec3 v_dLightDirection_tangentspace[##NUM_DLIGHTS];
#fi
#if (PLIGHTS)
in vec3 v_pLightPosition_tangentspace[##NUM_PLIGHTS];
#fi
#if (SLIGHTS)
in vec3 v_sLightPosition_tangentspace[##NUM_SLIGHTS];
in vec3 v_sLightDirection_tangentspace[##NUM_SLIGHTS];
#fi

in vec3 v_position_tangentspace;
#fi


//FUNCTIONS
//**********************************************************************************************************************
#include light_shading_decl
#include projection_decl

#if (DLIGHTS)
float calcDirectShadow(vec4 fragPos_light_clipspace, DLight light, vec3 normal) {
    vec3 lightDir = normalize(-light.direction);


    // perform perspective divide
    vec3 fragPos_light_NDC = fragPos_light_clipspace.xyz / fragPos_light_clipspace.w;
    // transform to [0,1] range
    vec3 projCoords = fragPos_light_NDC * 0.5 + 0.5;
    // get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
    float closestDepth = texture(light.shadowmap, projCoords.xy).r; 
    // get depth of current fragment from light's perspective
    float currentDepth = projCoords.z;
    // check whether current frag pos is in shadow
    //float shadow = currentDepth > closestDepth  ? 1.0 : 0.0;


    //fix shadow acne
    // hard modulation
    //float bias = 0.005;
    // steep modulated
    // float bias = max(0.05 * (1.0 - dot(normal, lightDir)), 0.005);
    float bias = max(light.maxBias * (1.0 - dot(normal, lightDir)), light.minBias);


    float shadow;
    if(light.hardShadows){
        shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;
    }else{
        //soft shadows
        shadow = 0.0;
        vec2 texelSize = 1.0 / vec2(textureSize(light.shadowmap, 0));
        for(int x = -1; x <= 1; ++x){
            for(int y = -1; y <= 1; ++y){
                vec2 offset = vec2(x, y);
                float pcfDepth = texture(light.shadowmap, projCoords.xy + offset * texelSize).r; 
                shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;        
            }    
        }
        shadow /= 9.0;
    }


    shadow = mix(shadow, 0.0, currentDepth); //cutoff (linear)


    // if further than far plane
    // if(projCoords.z > 1.0)
    //     shadow = 0.0;
    if(projCoords.x < 0.0 || projCoords.x > 1.0) shadow = 0.0;
    if(projCoords.y < 0.0 || projCoords.y > 1.0) shadow = 0.0;
    if(projCoords.z < 0.0 || projCoords.z > 1.0) shadow = 0.0;

    return shadow;
}
#fi
#if (PLIGHTS)
float calcPointShadow(vec4 fragPos_light_clipspace, PLight light, vec3 normal) {
    vec3 lightDir = normalize(light.position - fragVPos);


    // get vector between fragment position and light position
    vec3 fragToLight_worldspace = fragVPos_worldspace - light.position_worldspace;
    // use the light to fragment vector to sample from the depth map    
    float closestDepth = texture(light.shadowmap, fragToLight_worldspace).r;
    // it is currently in linear range between [0,1]. Re-transform back to original value
    //closestDepth *= 128.0;
    closestDepth *= light.shadowFar;
    // now get current linear depth as the length between the fragment and light position
    float currentDepth = length(fragToLight_worldspace);


    //float bias = 0.05; 
    //float bias = max(0.4 * (1.0 - dot(normal, lightDir)), 0.04);
    float bias = max(light.maxBias * (1.0 - dot(normal, lightDir)), light.minBias);


    // now test for shadows
    //float shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;

    float shadow;
    if(light.hardShadows){
        shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;
    }else{
        int samples = 20;
        float viewDistance = length(fragVPos);
        //float diskRadius = 0.05; //constant disc radius
        //float diskRadius = (1.0 + (viewDistance / 128.0)) / 25.0; //distance modulated disc radius
        float diskRadius = (1.0 + (viewDistance / light.shadowFar)) / 25.0; //distance modulated disc radius
        for(int i = 0; i < samples; ++i){
            float closestDepth = texture(light.shadowmap, fragToLight_worldspace + sampleOffsetDirections[i] * diskRadius).r;
            //closestDepth *= 128.0;   // undo mapping [0;1]
            closestDepth *= light.shadowFar;
            if(currentDepth - bias > closestDepth) shadow += 1.0;
        }
        shadow /= float(samples); 
    }


    shadow = mix(shadow, 0.0, currentDepth/light.shadowFar); //cutoff (linear)


    // if further than far plane
    //if(currentDepth > 128.0) shadow = 0.0;
    if(currentDepth > light.shadowFar) shadow = 0.0;

    return shadow;
}
#fi
#if (SLIGHTS)
float calcSpotShadow(vec4 fragPos_light_clipspace, SLight light, vec3 normal) {
    vec3 lightDir = normalize(light.position - fragVPos);
    //lightDir = normalize(-light.direction);


    // perform perspective divide
    vec3 fragPos_light_NDC = fragPos_light_clipspace.xyz / fragPos_light_clipspace.w;
    // transform to [0,1] range
    vec3 projCoords = fragPos_light_NDC * 0.5 + 0.5;
    // get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
    float closestDepth = texture(light.shadowmap, projCoords.xy).r; 
    // get depth of current fragment from light's perspective
    float currentDepth = projCoords.z;
    // check whether current frag pos is in shadow
    //float shadow = currentDepth > closestDepth  ? 1.0 : 0.0;


    //fix shadow acne
    // hard modulation
    //float bias = 0.005;
    // steep modulated
    float bias = max(light.maxBias * (1.0 - dot(normal, lightDir)), light.minBias);


    float shadow;
    if(light.hardShadows){
        shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;
    }else{
        //soft shadows
        shadow = 0.0;
        vec2 texelSize = 1.0 / vec2(textureSize(light.shadowmap, 0));
        for(int x = -1; x <= 1; ++x){
            for(int y = -1; y <= 1; ++y){
                vec2 offset = vec2(x, y);
                float pcfDepth = texture(light.shadowmap, projCoords.xy + offset * texelSize).r; 
                shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;        
            }    
        }
        shadow /= 9.0;
    }


    shadow = mix(shadow, 0.0, currentDepth); //cutoff (non-linear)


    // if further than far plane
    // if(projCoords.z > 1.0)
    //     shadow = 0.0;
    if(projCoords.x < 0.0 || projCoords.x > 1.0) shadow = 0.0;
    if(projCoords.y < 0.0 || projCoords.y > 1.0) shadow = 0.0;
    if(projCoords.z < 0.0 || projCoords.z > 1.0) shadow = 0.0;

    return shadow;
}
#fi


#if (HEIGHT_MAP)
//float heightScale = 0.125;
vec2 parallaxOffset(vec2 texCoords, vec3 viewDir){
    //basic mode
    // float height = 1.0 - texture(material.heightMap, texCoords).r;
    // vec2 p = viewDir.xy / viewDir.z * (height * material.heightScale);

    // return texCoords - p;


    //steep mode
    // number of depth layers
    //const float numLayers = 10.0;
    const float minLayers = 8.0;
    const float maxLayers = 64.0;
    float numLayers = mix(maxLayers, minLayers, max(dot(vec3(0.0, 0.0, 1.0), viewDir), 0.0));
    // calculate the size of each layer
    float layerDepth = 1.0 / numLayers;
    // depth of current layer
    float currentLayerDepth = 0.0;
    // the amount to shift the texture coordinates per layer (from vector P)
    vec2 P = viewDir.xy * material.heightScale; 
    vec2 deltaTexCoords = P / numLayers;

    // get initial values
    vec2  currentTexCoords = texCoords;
    float currentDepthMapValue = 1.0 - texture(material.heightMap, currentTexCoords).r;
    
    while(currentLayerDepth < currentDepthMapValue){
        // shift texture coordinates along direction of P
        currentTexCoords -= deltaTexCoords;
        // get depthmap value at current texture coordinates
        currentDepthMapValue = 1.0 - texture(material.heightMap, currentTexCoords).r;
        // get depth of next layer
        currentLayerDepth += layerDepth;
    }

    //return currentTexCoords;


    //occlusion mode addition
    // get texture coordinates before collision (reverse operations)
    vec2 prevTexCoords = currentTexCoords + deltaTexCoords;

    // get depth after and before collision for linear interpolation
    float afterDepth = currentDepthMapValue - currentLayerDepth;
    float beforeDepth = (1.0 - texture(material.heightMap, prevTexCoords).r) - currentLayerDepth + layerDepth;
    
    // interpolation of texture coordinates
    float weight = afterDepth / (afterDepth - beforeDepth);
    vec2 finalTexCoords = prevTexCoords * weight + currentTexCoords * (1.0 - weight);

    return finalTexCoords;
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


    #if (CIRCLES)
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float pct = dot(cxy, cxy);
        if (pct > 1.0) {
            discard; //performance trap
            //color = vec4(1.0, 1.0, 1.0, 0.0);
        }
    #fi


    #if (TEXTURE || DIFFUSE_MAP || SPECULAR_MAP || NORMAL_MAP)
        vec2 texCoords = fragUV;
    #fi


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

 


    #if (!NORMAL_MAP)
        vec3 kd = material.diffuse;
        #if (COLORS)
            kd *= fragVColor.rgb;
        #fi
        vec3 ks = material.specular;
    #else
        // In tangent space the maps modulate the lights and the vertex colour does not.
        vec3 kd = material.diffuse;
        vec3 ks = material.specular;
        #if (DIFFUSE_MAP)
            kd *= texture(material.diffuseMap, texCoords).rgb;
        #fi
        #if (SPECULAR_MAP)
            ks *= texture(material.specularMap, texCoords).rgb;
        #fi
    #fi

    // No specular under an orthographic projection: with the same view direction everywhere, the
    // highlight would depend on the normal alone and tint all faces of one orientation alike.
    if (isOrthographic(PMat)) ks = vec3(0.0);

    // Calculate combined light contribution
    #if (DIFFUSE_MAP && !NORMAL_MAP)
        // Without a normal map kd leaves out the diffuse map, which modulates the ambient term only.
        vec3 combined = ambient * kd * texture(material.diffuseMap, texCoords).rgb;
    #else
        vec3 combined = ambient * kd;
    #fi

    // The loops of light_shading_stmt, with each light times one minus its shadow.
    #if (DLIGHTS)
        float dShadow = 0.0;

        #for lightIdx in 0 to NUM_DLIGHTS
        {
            #if (!NORMAL_MAP)
            vec2 f = dirLightDS(dLights[##lightIdx].direction, normal, viewDir,
                                material.shininess, material.blinn);
            #else
            vec2 f = dirLightDS(v_dLightDirection_tangentspace[##lightIdx], normal, viewDir,
                                material.shininess, material.blinn);
            #fi

            if(dLights[##lightIdx].castShadows && material.receiveShadows)
                dShadow = calcDirectShadow(fragVPos_dlightspace[##lightIdx], dLights[##lightIdx], normal);

            combined += (dLights[##lightIdx].color * f.x * kd + dLights[##lightIdx].color * f.y * ks) *
                        (1.0 - dShadow);
        }
        #end
    #fi
    #if (PLIGHTS)
        float pShadow = 0.0;

        #for lightIdx in 0 to NUM_PLIGHTS
        {
            vec3 k = vec3(pLights[##lightIdx].constant, pLights[##lightIdx].linear,
                          pLights[##lightIdx].quadratic);
            #if (!NORMAL_MAP)
            vec2 f = pointLightDS(pLights[##lightIdx].position, pLights[##lightIdx].distance, k, fragVPos,
                                  normal, viewDir, material.shininess, material.blinn);
            #else
            vec2 f = pointLightDS(v_pLightPosition_tangentspace[##lightIdx], pLights[##lightIdx].distance, k,
                                  v_position_tangentspace, normal, viewDir, material.shininess, material.blinn);
            #fi

            if(pLights[##lightIdx].castShadows && material.receiveShadows)
                pShadow = calcPointShadow(fragVPos_plightspace[##lightIdx], pLights[##lightIdx], normal);

            combined += (pLights[##lightIdx].color * f.x * kd + pLights[##lightIdx].color * f.y * ks) *
                        (1.0 - pShadow);
        }
        #end
    #fi
    #if (SLIGHTS)
        float sShadow = 0.0;

        #for lightIdx in 0 to NUM_SLIGHTS
        {
            vec3 k = vec3(sLights[##lightIdx].constant, sLights[##lightIdx].linear,
                          sLights[##lightIdx].quadratic);
            #if (!NORMAL_MAP)
            vec2 f = spotLightDS(sLights[##lightIdx].position, sLights[##lightIdx].direction,
                                 sLights[##lightIdx].cutoff, sLights[##lightIdx].outerCutoff, sLights[##lightIdx].distance,
                                 k, fragVPos, normal, viewDir, material.shininess, material.blinn);
            #else
            vec2 f = spotLightDS(v_sLightPosition_tangentspace[##lightIdx], v_sLightDirection_tangentspace[##lightIdx],
                                 sLights[##lightIdx].cutoff, sLights[##lightIdx].outerCutoff, sLights[##lightIdx].distance,
                                 k, v_position_tangentspace, normal, viewDir, material.shininess, material.blinn);
            #fi

            if(sLights[##lightIdx].castShadows && material.receiveShadows)
                sShadow = calcSpotShadow(fragVPos_slightspace[##lightIdx], sLights[##lightIdx], normal);

            combined += (sLights[##lightIdx].color * f.x * kd + sLights[##lightIdx].color * f.y * ks) *
                        (1.0 - sShadow);
        }
        #end
    #fi

    color[0] = vec4(combined, alpha);

    #if (TEXTURE)
        // Apply all of the textures
        #for I_TEX in 0 to NUM_TEX
             color[0] *= texture(material.texture##I_TEX, texCoords);
        #end

    #fi
    #if (CUBETEXTURES)
        vec3 I = normalize(fragVPos_worldspace - cameraPosition);
        vec3 R = reflect(I, normalize(fragVNorm_worldspace));

        // float ratio = 1.00 / 1.33;
        // vec3 I = normalize(fragVPos_worldspace - cameraPosition);
        // vec3 R = inverse(mat3(VMat)) * refract(I, normalize(fragVNorm_worldspace), ratio);

        // Apply all of the textures
        #for I_TEX in 0 to NUM_CUBETEXTURES
            color[0] *= texture(material.cubeTexture##I_TEX, R);
        #end
    #fi


    color[1] = vec4(normal, 1.0);
    color[2] = vec4(abs(fragVPos), 1.0);
}
