#version 300 es
precision mediump float;

struct Material {
    sampler2D texture0; // position
    sampler2D texture1; // normals
    sampler2D texture2;
    sampler2D texture3;
    sampler2D texture4;
    sampler2D texture5;
};

uniform Material material;
uniform int jumpLevel;
uniform int imageWidth;
uniform int imageHeight;
uniform int numberOfJumps;

in vec2 p;
in vec3 location;

layout (location = 0) out vec3 slot1;
layout (location = 1) out vec3 slot2;
layout (location = 2) out vec3 slot3;
layout (location = 3) out vec3 slot4;

vec3 scrSlot1;
vec3 scrSlot2;
vec3 scrSlot3;
vec3 scrSlot4;

vec3 coordSlot1;
vec3 coordSlot2;
vec3 coordSlot3;
vec3 coordSlot4;

vec3 normSlot1;
vec3 normSlot2;
vec3 normSlot3;
vec3 normSlot4;

float distSlot1;
float distSlot2;
float distSlot3;
float distSlot4;

float angleThreshold = 0.5;
float continuityThreshold = 0.01;

bool isOnSameLayer(vec3 coord, vec3 normal, vec3 coord2, vec3 normal2){
    return dot(normal, normal2) >= angleThreshold 
        && abs(dot(coord2.xyz - coord.xyz, normal)) < continuityThreshold;
}

float screenDst(vec2 coord, vec2 coord2){
    vec2 d = coord - coord2;
    return sqrt((d.x*d.x)+(d.y*d.y));
}

void testAndSet(vec2 v){
    vec4 coord = texture(material.texture0, v);
    vec3 norm = texture(material.texture1, v).xyz;
    float dist = screenDst(p, v);

    if(coord.w > 0.5) {
        int insert = 0;
        if(scrSlot1.z > 0.5 && isOnSameLayer(coord.xyz, norm, coordSlot1, normSlot1)){
            if(dist <= distSlot1) insert = 1;
        }
        else if(scrSlot2.z > 0.5 && isOnSameLayer(coord.xyz, norm, coordSlot2, normSlot2)){
            if(dist <= distSlot2) insert = 2;
        }
        else if(scrSlot3.z > 0.5 && isOnSameLayer(coord.xyz, norm, coordSlot3, normSlot3)){
            if(dist <= distSlot3) insert = 3;
        }
        else if(scrSlot4.z > 0.5 && isOnSameLayer(coord.xyz, norm, coordSlot4, normSlot4)){
            if(dist <= distSlot4) insert = 4;
        }
        else{ // No points on the same layer
            if(scrSlot1.z < 0.5) insert = 1; // Slot 1 is free
            else if(scrSlot2.z < 0.5) insert = 2; // Slot 2 is free
            else if(scrSlot3.z < 0.5) insert = 3; // Slot 3 is free
            else if(scrSlot4.z < 0.5) insert = 4; // Slot 4 is free
            else{
                float mindist = distSlot1;
                insert = 1;
                if(distSlot2 < mindist) {
                    insert = 2;
                    mindist = distSlot2;
                }
                else if(distSlot3 < mindist) {
                    insert = 3;
                    mindist = distSlot3;
                }
                else if(distSlot4 < mindist) {
                    insert = 4;
                    mindist = distSlot4;
                }
            }

        }
        if(insert == 1){
            scrSlot1 = vec3(v, 1.0);
            coordSlot1 = coord.xyz;
            normSlot1 = norm;
            distSlot1 = dist;
        }else if(insert == 2){
            scrSlot2 = vec3(v, 1.0);
            coordSlot2 = coord.xyz;
            normSlot2 = norm;
            distSlot2 = dist;
        }else if(insert == 3){
            scrSlot3 = vec3(v, 1.0);
            coordSlot3 = coord.xyz;
            normSlot3 = norm;
            distSlot3 = dist;
        }
        else if(insert == 4){
            scrSlot4 = vec3(v, 1.0);
            coordSlot4 = coord.xyz;
            normSlot4 = norm;
            distSlot4 = dist;
        }
    }
}

void main() {
    float dx = 1.0/float(imageWidth);
    float dy = 1.0/float(imageHeight);

    scrSlot1 = texture(material.texture2, p).xyz;
    coordSlot1 = texture(material.texture0, scrSlot1.xy).xyz;
    normSlot1 = texture(material.texture1, scrSlot1.xy).xyz;
    distSlot1 = screenDst(p, scrSlot1.xy);
    if(scrSlot1.z < 0.5) distSlot1 = 1000.0;

    scrSlot2 = texture(material.texture3, p).xyz;
    coordSlot2 = texture(material.texture0, scrSlot2.xy).xyz;
    normSlot2 = texture(material.texture1, scrSlot2.xy).xyz;
    distSlot2 = screenDst(p, scrSlot2.xy);
    if(scrSlot2.z < 0.5) distSlot2 = 1000.0;

    scrSlot3 = texture(material.texture4, p).xyz;
    coordSlot3 = texture(material.texture0, scrSlot3.xy).xyz;
    normSlot3 = texture(material.texture1, scrSlot3.xy).xyz;
    distSlot3 = screenDst(p, scrSlot3.xy);
    if(scrSlot3.z < 0.5) distSlot3 = 1000.0;

    scrSlot4 = texture(material.texture5, p).xyz;
    coordSlot4 = texture(material.texture0, scrSlot4.xy).xyz;
    normSlot4 = texture(material.texture1, scrSlot4.xy).xyz;
    distSlot4 = screenDst(p, scrSlot4.xy);
    if(scrSlot4.z < 0.5) distSlot4 = 1000.0;

    float fjl = float(jumpLevel);
    testAndSet(p+vec2(dx*fjl, 0.0));
    testAndSet(p+vec2(0.0, dy*fjl));
    testAndSet(p+vec2(-dx*fjl, 0.0));
    testAndSet(p+vec2(0.0, -dy*fjl));
    testAndSet(p+vec2(dx*fjl, dy*fjl));
    testAndSet(p+vec2(-dx*fjl, -dy*fjl));
    testAndSet(p+vec2(-dx*fjl, dy*fjl));
    testAndSet(p+vec2(dx*fjl, -dy*fjl));

    slot1 = scrSlot1;
    slot2 = scrSlot2;
    slot3 = scrSlot3;
    slot4 = scrSlot4;
}
