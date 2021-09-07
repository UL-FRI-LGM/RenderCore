#version 300 es
precision mediump float;


//out vec4 color;
out float color;


void main() {
    //color = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);
    color = gl_FragCoord.z;
}