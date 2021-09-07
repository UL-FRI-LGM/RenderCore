#version 300 es
precision highp float;


//#define NUM_SAMPLES 8
//#define NUM_NOISE 4


struct Material {
    #if (TEXTURE)
        sampler2D texture0; // POSITION BUFFER
        sampler2D texture1; // NORMAL BUFFER
    #fi
};


//UIO
//**********************************************************************************************************************//
uniform Material material;
uniform mat4 MVMat; // Model View Matrix
uniform mat4 VMat;
uniform mat4 PMat_o;  // Projection Matrix
uniform mat3 NMat;  // Normal Matrix

uniform float radius;
uniform float bias;
uniform float magnitude;
uniform float contrast;

uniform vec3[##NUM_SAMPLES] samples;
uniform vec3[##NUM_NOISE] noise;

#if (TEXTURE)
    in vec2 fragUV;
#fi

//out vec4 color;
out float color;


//MAIN
//**********************************************************************************************************************//
void main() {
	#if (TEXTURE)
    

        vec3 position_viewspace = texture(material.texture0, fragUV).xyz;
        vec3 normal_viewspace = texture(material.texture1, fragUV).xyz;

        //normal_viewspace = normal_viewspace * 2.0 - 1.0; //if multi

        
        ivec2 texSize  = textureSize(material.texture0, 0).xy;
        vec2 texelSize = 1.0 / vec2(texSize);
        vec2 texCoord = gl_FragCoord.xy * texelSize;




        int noiseX = int(gl_FragCoord.x - 0.5) % 2;
        int noiseY = int(gl_FragCoord.y - 0.5) % 2;
        vec3 random = noise[noiseX + (noiseY * 2)];
        // vec3 random = noise[int((gl_FragCoord.x + gl_FragCoord.y - 1.0)) % 4];


        vec3 tangent = normalize(random - normal_viewspace * dot(random, normal_viewspace));
        vec3 bitangent = cross(normal_viewspace, tangent);
        mat3 TBN = mat3(tangent, bitangent, normal_viewspace);



        float occlusion = 0.0;

        for (int i = 0; i < ##NUM_SAMPLES; i++) {
            vec3 samplePosition_viewspace = TBN * samples[i]; //samples are in tangent space, transform from tangent space to view space
            samplePosition_viewspace = position_viewspace.xyz + samplePosition_viewspace * radius;


            vec4 offset_viewpsace = vec4(samplePosition_viewspace.xyz, 1.0);
            vec4 offset_clipspace = PMat_o * offset_viewpsace;
            vec3 offset_NDC = offset_clipspace.xyz / offset_clipspace.w;
            vec2 offset_UV = offset_NDC.xy * 0.5 + 0.5;


            float sampleDepth = texture(material.texture0, offset_UV).z;


            //occlusion = occlusion + (sampleDepth >= samplePosition_viewspace.z + bias ? 1.0 : 0.0);
            float rangeCheck = smoothstep(0.0, 1.0, radius / abs(position_viewspace.z - sampleDepth));
            occlusion = occlusion + (sampleDepth >= samplePosition_viewspace.z + bias ? 1.0 : 0.0) * rangeCheck;    
        }


        occlusion = 1.0 - (occlusion / float(##NUM_SAMPLES));

        occlusion  = pow(occlusion, magnitude);
        occlusion  = contrast * (occlusion - 0.5) + 0.5;


        //color = vec4(vec3(occlusion), 1.0);
        color = occlusion;
	#fi
}