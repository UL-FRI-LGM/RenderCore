#version 300 es
precision mediump float;


uniform vec3 pickingColor;

out vec4 color;


void main() {
    color = vec4(pickingColor, 1.0);
}