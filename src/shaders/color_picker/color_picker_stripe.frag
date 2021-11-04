#version 300 es
precision mediump float;


uniform vec4 pickingColor;

out vec4 color;


void main() {
    color = pickingColor;
}
