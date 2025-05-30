#version 300 es
precision mediump float;


//STRUCT
//**********************************************************************************************************************


//UIO
//**********************************************************************************************************************
in vec3 v_position_viewspace;
vec3 v_normal_viewspace = vec3(0.0, 0.0, 1.0);
in vec3 v_ViewDirection_viewspace;
in float v_distanceToCamera_viewspace;

layout (location = 0) out vec4 de_viewspace;
layout (location = 1) out vec4 vp_viewspace;
layout (location = 2) out vec4 vn_viewspace;
layout (location = 3) out vec4 vd_viewspace;
layout (location = 4) out vec4 dc_viewspace;


//FUNCTIONS
//**********************************************************************************************************************
// float linearizeDepth_1(float depth){
//     return (-depth - u_Near) / (u_Far - u_Near); //linearizaiton [0-1]
// }
// float linearizeDepth_2(float depth) {
//     float z_NDC = depth * 2.0 - 1.0; // back to NDC 

//     return (2.0 * u_Near * u_Far) / (u_Far + u_Near - z_NDC * (u_Far - u_Near));	
// }


//MAIN
//**********************************************************************************************************************
void main() {
    //******************************************************************************************************************//
    float depth = gl_FragCoord.z;
    //depth = linearizeDepth_1(fragVPos.z);
    //depth = linearizeDepth_2(gl_FragCoord.z) / u_Far;
    de_viewspace = vec4(depth, 0.0, 0.0, 1.0);

    //vp_viewspace = vec4(v_position_viewspace * 0.5 + 0.5, 1.0);
    vp_viewspace = vec4(v_position_viewspace, 1.0);

    //vn_viewspace = vec4(normalize(v_normal_viewspace) * 0.5 + 0.5, 0.0);
    vn_viewspace = vec4(v_normal_viewspace, 1.0);

    //vd_viewspace = vec4(normalize(v_ViewDirection_viewspace) * 0.5 + 0.5, 0.0);
    vd_viewspace = vec4(v_ViewDirection_viewspace, 1.0);

    dc_viewspace = vec4(v_distanceToCamera_viewspace, 0.0, 0.0, 1.0);
    //******************************************************************************************************************//
}