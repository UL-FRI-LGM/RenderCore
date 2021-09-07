#version 300 es
precision highp float;

struct Material {
    vec3 diffuse;

    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi
};

uniform Material material;

// From vertex shader
in vec3 fragVNorm;
in vec3 fragVPos;

#if (TEXTURE)
    in vec2 fragUV;
#fi

layout (location = 0) out vec4 albedoSpec;
layout (location = 1) out vec3 position;
layout (location = 2) out vec3 normals;


void main() {

    // Diffuse color and shininess as alpha
    albedoSpec.rgb = material.diffuse;


    #if (DIFFUSE_TEXTURE)
        albedoSpec *= texture(material.texture0, fragUV);
    #fi

    #if (SPECULAR_TEXTURE)
        albedoSpec.a = texture(material.texture1, fragUV).r;
    #else
        albedoSpec.a = 1.0;
    #fi


    // Write positions
    position = fragVPos;
    // Write normals
    normals = normalize(fragVNorm);
}