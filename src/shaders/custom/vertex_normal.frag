#version 300 es
precision mediump float;


uniform vec3 color;
#if (TRANSPARENT)
uniform float alpha;
#else
float alpha = 1.0;
#fi

out vec4 fragColor;


void main() {
    fragColor = vec4(color, alpha);
}