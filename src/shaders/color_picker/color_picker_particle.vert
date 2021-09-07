#version 300 es
precision mediump float;
precision highp int;


uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform vec3 cameraPosition;
uniform float particle_size;


in vec3 VPos;       // Vertex position
in float nhits;


void main() {
    gl_Position = PMat * MVMat * vec4(VPos, 1.0);


    gl_PointSize = nhits * particle_size;
    if(distance(VPos, cameraPosition) <= 4.0){
        gl_PointSize = gl_PointSize * 4.0/distance(VPos, cameraPosition);
    }
}