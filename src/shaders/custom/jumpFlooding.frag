#version 300 es
precision mediump float;

struct Material {
    sampler2D texture0; // position
    sampler2D texture1; // diffuse
    sampler2D texture2; // coordinate
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
layout (location = 1) out vec3 position;
layout (location = 2) out vec3 normals;
layout (location = 3) out vec3 coordinates;

void testAndSet(vec2 v){
    vec4 coord = texture(material.texture2, v);
    if(coord.z == 1.0) {
        if(closestCoordinate.z == 1.0){
            // 2d version
            vec2 currentDelta = p - closestCoordinate.xy;
            float currentDistance = sqrt((currentDelta.x*currentDelta.x)+(currentDelta.y*currentDelta.y));

            vec2 delta = p - coord.xy;
            float d = sqrt((delta.x*delta.x)+(delta.y*delta.y));

            // 3d version
            /*vec3 closestPosition = texture(material.texture0, closestCoordinate.xy).rgb;
            float currentDistance = sqrt((closestPosition.x*closestPosition.x)+(closestPosition.y*closestPosition.y)+(closestPosition.z*closestPosition.z));

            vec3 thisPosition = texture(material.texture0, coord.xy).rgb;
            float d = sqrt((thisPosition.x*thisPosition.x)+(thisPosition.y*thisPosition.y)+(thisPosition.z*thisPosition.z));*/

            if(/*d > 0.1 && */d < currentDistance){
                closestCoordinate = vec3(coord.xy, 1.0);
            }
        }
        else{
            closestCoordinate = vec3(coord.xy, 1.0);
        }
    }
}

void main() {
    float dx = 1.0/float(imageWidth);
    float dy = 1.0/float(imageHeight);
    if(jumpLevel == 0){
        vec4 coord = texture(material.texture2, p);
        
        if(coord.b == 1.0){
            vec3 clr = texture(material.texture1, coord.xy).rgb;
            albedoSpec = vec4(clr, 1.0);
        }
        else albedoSpec = vec4(0.5, 0, 0.5, 1.0);
    }
    else{
        closestCoordinate = texture(material.texture2, p).xyz;
        if(jumpLevel == numberOfJumps) closestCoordinate = vec3(0);

        vec4 clr = texture(material.texture1, p);
        //albedoSpec = clr;
        if(clr.w == 1.0) closestCoordinate = vec3(p, 1.0);
        //position = texture(material.texture0, p).rgb;

        float fjl = float(jumpLevel);
        testAndSet(p+vec2(dx*fjl, 0.0));
        testAndSet(p+vec2(0.0, dy*fjl));
        testAndSet(p+vec2(-dx*fjl, 0.0));
        testAndSet(p+vec2(0.0, -dy*fjl));
        testAndSet(p+vec2(dx*fjl, dy*fjl));
        testAndSet(p+vec2(-dx*fjl, -dy*fjl));
        testAndSet(p+vec2(-dx*fjl, dy*fjl));
        testAndSet(p+vec2(dx*fjl, -dy*fjl));

        if(clr.w == 1.0) closestCoordinate = vec3(p, 1.0);

        coordinates = closestCoordinate;
    }
}
