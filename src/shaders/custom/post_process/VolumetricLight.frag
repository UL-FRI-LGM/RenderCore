#version 300 es
precision mediump float;


//DEF
//**********************************************************************************************************************//
//#define samples 64
//#define density 0.25
//#define weight 0.8
//#define decay 0.95
//#define exposure 0.05


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
    vec3 position_screenspace;
    vec3 color;
    float distance;
    float decay;
};
#fi

struct Material {
    #if (TEXTURE)
        sampler2D texture0; //occlusion buffer
        sampler2D texture1; //color buffer
    #fi
};
struct TextureData {
    ivec2 textureSize;
    vec2 texelSize;
};


//UIO
//**********************************************************************************************************************
#if (DLIGHTS)
uniform DLight dLights[##NUM_DLIGHTS];
#fi
#if (PLIGHTS)
uniform PLight pLights[##NUM_PLIGHTS];
#fi

uniform Material material;
//uniform vec2 lightPosition;
uniform int samples;
uniform float density;
uniform float weight;
uniform float decay;
uniform float exposure;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


TextureData texture0Data;


//FUNCTIONS
//**********************************************************************************************************************
vec2 rand2(vec2 vec){
    vec2 comp = vec2(12.9898f, 78.233f);
    return vec2(fract(sin(dot(vec.x, comp.x)) * 43758.5453f), fract(sin(dot(vec.y, comp.y)) * 43758.5453f));
}


#if (DLIGHTS)
vec4 calcDirectLight (DLight light) {
    // //ROLLED
    // vec2 lightDirection = -light.position.xy;

    // vec2 texCoord = fragUV;
    // vec2 deltaTexCoord = lightDirection / float(samples) * density; //lightPosition cutting of geometry

    // float illuminationDecay = 1.0;

    // vec4 vol_light = vec4(0.0, 0.0, 0.0, 0.0);

    // for(int s = 0; s < samples; s++){
    //     texCoord = texCoord - deltaTexCoord;

    //     //vec4 newSmaple = texture(material.texture0, texCoord) * illuminationDecay * weight;
    //     vec4 newSmaple = texture(material.texture0, texCoord + rand2(texCoord) * texture0Data.texelSize) * illuminationDecay * weight;


    //     vol_light = vol_light + newSmaple;


    //     illuminationDecay = illuminationDecay * decay;
    // }


    // return vol_light;


    //UNROLLED
    vec2 lightDirection = -light.position.xy;

    vec2 texCoord = fragUV;
    vec2 deltaTexCoord = lightDirection / float(##NUM_SAMPLES) * density; //lightPosition cutting of geometry

    float illuminationDecay = 1.0;

    vec4 vol_light = vec4(0.0, 0.0, 0.0, 0.0);

    vec4 newSmaple;
    #for s in 0 to NUM_SAMPLES
        texCoord = texCoord - deltaTexCoord;

        //newSmaple = texture(material.texture0, texCoord) * illuminationDecay * weight;
        newSmaple = texture(material.texture0, texCoord + rand2(texCoord) * texture0Data.texelSize) * illuminationDecay * weight;


        vol_light = vol_light + newSmaple;


        illuminationDecay = illuminationDecay * decay;
    #end


    return vol_light;
}
#fi

#if (PLIGHTS)
// Calculates the point light color contribution
vec4 calcPointLight (PLight light) {
    // //ROLLED
    // vec2 lightPosition = light.position_screenspace.xy;//todo direction based on depth texture of occlusion buffer, then normalize, then get direction

    // vec2 texCoord = fragUV;
    // vec2 lightDirection = (texCoord - lightPosition);
    // vec2 deltaTexCoord = lightDirection / float(samples) * density;

    // float illuminationDecay = 1.0;

    // vec4 vol_light = vec4(0.0, 0.0, 0.0, 0.0);

    // for(int s = 0; s < samples; s++){
    //     texCoord = texCoord - deltaTexCoord;

    //     //vec4 newSmaple = texture(material.texture0, texCoord) * illuminationDecay * weight;
    //     vec4 newSmaple = texture(material.texture0, texCoord + rand2(texCoord) * texture0Data.texelSize) * illuminationDecay * weight;


    //     vol_light = vol_light + newSmaple;


    //     illuminationDecay = illuminationDecay * decay;
    // }


    // return vol_light;


    //UNROLLED (4ms improvement)
    vec2 lightPosition = light.position_screenspace.xy;//todo direction based on depth texture of occlusion buffer, then normalize, then get direction

    vec2 texCoord = fragUV;
    vec2 lightDirection = (texCoord - lightPosition);// vec2 lightDirection = normalize(texCoord - lightPosition)*0.02;
    vec2 deltaTexCoord = lightDirection / float(##NUM_SAMPLES) * density;

    float illuminationDecay = 1.0;

    vec4 vol_light = vec4(0.0, 0.0, 0.0, 0.0);

    vec4 newSmaple;
    #for s in 0 to NUM_SAMPLES
        texCoord = texCoord - deltaTexCoord;

        //newSmaple = texture(material.texture0, texCoord) * illuminationDecay * weight;
        newSmaple = texture(material.texture0, texCoord + rand2(texCoord) * texture0Data.texelSize) * illuminationDecay * weight;


        vol_light = vol_light + newSmaple;


        illuminationDecay = illuminationDecay * decay;
    #end


    return vol_light;
}
#fi


//MAIN
//**********************************************************************************************************************//
void main() {
    #if (TEXTURE)
        texture0Data.textureSize = textureSize(material.texture0, 0);
        texture0Data.texelSize = 1.0 / vec2(texture0Data.textureSize.x, texture0Data.textureSize.y);


        vec4 combined = vec4(0.0, 0.0, 0.0, 0.0);

        // #if (DLIGHTS)
        // #for lightIdx in 0 to NUM_DLIGHTS
        //     combined += calcDirectLight(dLights[##lightIdx]);
        // #end
        // #fi

        #if (PLIGHTS)
        #for lightIdx in 0 to NUM_PLIGHTS
            combined += calcPointLight(pLights[##lightIdx]);
        #end
        #fi

        combined = combined * exposure;


        //color = clamp (combined, 0.0, 1.0);
        //color = texture(material.texture1, fragUV) + 0.5*clamp (combined, 0.0, 1.0);
        color = texture(material.texture1, fragUV) + 0.5*combined;
        //color = texture(material.texture1, fragUV) * 0.125*combined;
        //color = combined;
    #fi
}