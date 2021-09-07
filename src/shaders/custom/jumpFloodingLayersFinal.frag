#version 300 es
precision mediump float;

struct Material {
    sampler2D texture0; // diffuse
    sampler2D texture1; // normals
    sampler2D texture2; // positions
    sampler2D texture3;
    sampler2D texture4;
    sampler2D texture5;
    sampler2D texture6;
};

uniform Material material;
uniform int jumpLevel;
uniform int imageWidth;
uniform int imageHeight;
uniform int numberOfJumps;

in vec2 p;
in vec3 location;
//in vec2 fragUV;
vec3 closestCoordinate;

layout (location = 0) out vec4 albedoSpec;

float angleThreshold = 0.5;
float continuityThreshold = 0.01;

bool isOnSameLayer(vec3 coord, vec3 normal, vec3 coord2, vec3 normal2){
    return dot(normal, normal2) >= angleThreshold 
        && abs(dot(coord2.xyz - coord.xyz, normal)) < continuityThreshold;
}

void main() {

    vec2 c1 = texture(material.texture3, p).xy;
    vec2 c2 = texture(material.texture4, p).xy;
    vec3 pos1 = texture(material.texture2, c1).rgb;
    vec3 pos2 = texture(material.texture2, c2).rgb;
    vec3 nor1 = texture(material.texture1, c1).rgb;
    vec3 nor2 = texture(material.texture1, c2).rgb;
    vec3 nor =  texture(material.texture1, p).rgb;
    vec3 pos = texture(material.texture2, p).rgb;
    bool i1 = isOnSameLayer(pos1, nor1, pos, nor);
    bool i2 = isOnSameLayer(pos2, nor2, pos, nor);
    albedoSpec = vec4(0, 0, 0, 1);
    if(i1) albedoSpec.x = 1.0;
    if(i2) albedoSpec.y = 1.0;
    //albedoSpec = vec4(texture(material.texture0, c.xy).rgb, 1.0);
}
