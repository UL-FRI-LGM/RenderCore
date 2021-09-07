#version 300 es
precision mediump float;
precision highp int;


uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform vec3 cameraPosition; //
uniform float hit_size;


in vec3 VPos;       // Vertex position


void main() {
    gl_Position = PMat * MVMat * vec4(VPos, 1.0);


    gl_PointSize = hit_size;
    if(distance(VPos, cameraPosition) <= 500.0){
        gl_PointSize = gl_PointSize * 500.0/distance(VPos, cameraPosition); //near clipping plane poreze zelo bliznje   /// + ali *
    }
}