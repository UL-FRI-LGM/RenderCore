#version 300 es
precision highp float;

in vec3 VPos; // Vertex position

in vec2 uv;  // Texture coordinate

// Output quad texture coordinates
out vec2 fragUV;

void main() {
    gl_Position = vec4(VPos, 1.0);

    // Pass-through texture coordinate
    fragUV = uv;
}