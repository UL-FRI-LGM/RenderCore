#version 300 es
precision highp float;
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

in vec3 v_position_viewspace;
in vec3 v_normal_viewspace;
in vec3 v_ViewDirection_viewspace;

out vec4 color;


//FUNCTIONS
//**********************************************************************************************************************
#include light_shading_decl


//MAIN
//**********************************************************************************************************************
void main() {
   vec3 P = v_position_viewspace;
   vec3 N = v_normal_viewspace;
   vec3 V = v_ViewDirection_viewspace;
   vec3 kd = material.diffuse;
   // Diffuse only: ks is 0, and shin 1 with Phong reflection keeps the unused specular factor finite.
   vec3 ks = vec3(0.0);
   float shin = 1.0;
   bool blinn = false;
   vec3 combined = ambient * kd + material.emissive;
   #include light_shading_stmt

   color = vec4(combined, material.alpha);
}