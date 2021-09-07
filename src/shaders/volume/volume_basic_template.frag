#version 300 es
precision highp float;

struct Material {
    vec3 color;
};

uniform vec3 volColor;

uniform Material material;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;

void main() {
    color = vec4(material.color + volColor, 1.0);
}