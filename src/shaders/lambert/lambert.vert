#version 300 es
precision mediump float;
precision mediump int;


//STRUCT
//**********************************************************************************************************************
// #if (DLIGHTS)
// struct DLight {
//     vec3 position;
//     vec3 direction;
//     vec3 color;
// };
// #fi
// #if (PLIGHTS)
// struct PLight {
//     vec3 position;
//     vec3 color;
//     float distance;
//     float decay;
// };
// #fi
// #if (SLIGHTS)
// struct SLight {
//     vec3 position;
//     vec3 color;
//     float distance;
//     float decay;
//     float cutoff;
//     float outerCutoff;
//     vec3 direction;
// };
// #fi

// struct Material {
//     vec3 emissive;
//     vec3 diffuse;
//     float alpha;
// };


//UIO
//**********************************************************************************************************************
#if (INSTANCED)
in mat4 MMat;
#fi
uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform mat3 NMat;  // Normal Matrix

in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal

out vec3 v_position_viewspace;
out vec3 v_normal_viewspace;
out vec3 v_ViewDirection_viewspace;


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


    vec3 normal_viewspace = normalize(NMat * VNorm);
    vec3 viewDir_viewspace = normalize(-VPos_viewspace.xyz);


    v_position_viewspace = VPos_viewspace.xyz;
    v_normal_viewspace = normal_viewspace;
    v_ViewDirection_viewspace = viewDir_viewspace;
}