#version 300 es
precision mediump float;

uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix

in vec3 VPos;       // Vertex position

out vec2 p;
out vec3 position;

void main() {
    // Model view position
    //vec4 VPos4 = MVMat * vec4(VPos, 1.0);
    p = (VPos.xy*0.5)+vec2(0.5, 0.5);

    // Projected position
    //gl_Position = PMat * VPos4;
    gl_Position = vec4(VPos, 1.0);
 }