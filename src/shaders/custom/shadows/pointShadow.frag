#version 300 es
precision mediump float;


//UIO
//**********************************************************************************************************************
//uniform vec3 lightPosition_worldspace;
uniform float farPlane;

//in vec4 v_VPos_worldspace;
in vec4 v_VPos_lightspace;

//out vec4 color;
out float color;


void main() {
    // //color = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);
    // color = gl_FragCoord.z;


    //float farPlane = 128.0;
    // get distance between fragment and light source
    //float lightDistance = length(v_VPos_worldspace.xyz - lightPosition_worldspace);
    //float lightDistance = length(v_VPos_lightspace.xyz - vec3(0.0, 0.0, 0.0));
    float lightDistance = length(v_VPos_lightspace.xyz); //distance is the same in worldspace ot lightspace
    
    // map to [0;1] range by dividing by far plane
    lightDistance = lightDistance / farPlane;
    
    // write this as modified depth
    gl_FragDepth = lightDistance;
    // write this as color
    color = lightDistance;
}