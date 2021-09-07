#version 300 es
//#extension GL_EXT_frag_depth : enable
precision highp float;

struct Material {
    vec3 diffuse;

    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi
};

uniform mat4 PMat;  // Projection Matrix
uniform Material material;

// From vertex shader
in vec3 fragVNorm;
in vec3 fragVPos;

in vec3 fragVNormOriginal;      // Vertex normal

#if (TEXTURE)
    in vec2 fragUV;
#fi

in vec4 fragVColor;

layout (location = 0) out vec4 albedoSpec;
//layout (location = 1) out vec4 position;
layout (location = 1) out vec3 position;
layout (location = 2) out vec3 normals;
layout (location = 3) out vec3 coordinates;

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
    albedoSpec = fragVColor;
    
    float u = 2.0 * gl_PointCoord.x - 1.0;
    float v = 2.0 * gl_PointCoord.y - 1.0;
    float vRadius = 1.0;
    float wi = 0.0 - ( u*u + v*v);
    vec4 pp = vec4(fragVPos, 1.0);
    pp.z += wi * vRadius;

    pp = PMat * pp;
    pp = pp / pp.w;

    //gl_FragDepth = (pp.z + 1.0) / 2.0;

    // Write positions
    //position = vec4(fragVPos.xyz, 1.0);
    position = fragVPos.xyz;
    //albedoSpec.xyz = albedoSpec.xyz * (1.0+(wi*0.1));
    // Write normals
    normals = normalize(fragVNormOriginal);
}