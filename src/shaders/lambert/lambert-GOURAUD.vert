#version 300 es
precision mediump float;
precision mediump int;


//STRUCT
//**********************************************************************************************************************
#if (DLIGHTS)
struct DLight {
    vec3 position;
    vec3 direction;
    vec3 color;
};
#fi
#if (PLIGHTS)
struct PLight {
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
    float alpha;
};


//UIO
//**********************************************************************************************************************
#if (INSTANCED)
in mat4 MMat;
#fi
uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform mat3 NMat;  // Normal Matrix

#if (DLIGHTS)
uniform DLight dLights[##NUM_DLIGHTS];
#fi
#if (PLIGHTS)
uniform PLight pLights[##NUM_PLIGHTS];
#fi
#if (SLIGHTS)
uniform SLight sLights[##NUM_SLIGHTS];
#fi

uniform Material material;
uniform vec3 ambient;

in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal

out vec4 v_VColor;



//FUNCTIONS
//**********************************************************************************************************************
#include light_shading_decl


//MAIN
//**********************************************************************************************************************
void main() {
    #if (!INSTANCED)
    vec4 VPos_viewspace = MVMat * vec4(VPos, 1.0);
    #fi
    #if (INSTANCED)
    //vec4 VPos_viewspace = VMat * MMat * vec4(VPos, 1.0);
    vec4 VPos_viewspace = MVMat * MMat * vec4(VPos, 1.0);
    #fi

    // Projected position
    gl_Position = PMat * VPos_viewspace;


    vec3 P = VPos_viewspace.xyz;
    vec3 N = normalize(NMat * VNorm);
    vec3 V = normalize(-VPos_viewspace.xyz);
    vec3 kd = material.diffuse;
    // Diffuse only: ks is 0, and shin 1 with Phong reflection keeps the unused specular factor finite.
    vec3 ks = vec3(0.0);
    float shin = 1.0;
    bool blinn = false;
    vec3 combined = ambient + material.emissive;
    #include light_shading_stmt

    v_VColor = vec4(combined, material.alpha);
}