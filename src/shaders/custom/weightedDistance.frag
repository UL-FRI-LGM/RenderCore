#version 300 es
precision mediump float;

struct Material {
    sampler2D texture0;
    sampler2D texture1;
};

uniform Material material;

out vec4 color;
in vec2 p;
in vec3 location;

#define FLT_MAX 3.402823466e+20

const int MAX_LEVEL = 5;
const int DIMENSION = MAX_LEVEL * 2;
const int MAX_VALUES = DIMENSION * DIMENSION;
const float exp_p = 1.5;
vec3 FoundValues[MAX_VALUES];
float FoundDistances[MAX_VALUES];
float nearestDistance = FLT_MAX;

void testAndSet(vec2 v, int idx){
    vec4 clr = texture(material.texture1, v);
    if(clr.w == 1.0) {
        //float distance = length(v);
        vec4 pos = texture(material.texture0, v);
        float distance = sqrt((pos.x*pos.x)+(pos.y*pos.y)+(pos.z*pos.z));
        FoundValues[idx] = clr.rgb;
        FoundDistances[idx] = distance;
        if(distance < nearestDistance) nearestDistance = distance;
    }
    else{ 
        FoundValues[idx] = vec3(0.0, 0.0, 0.0);
        FoundDistances[idx] = -10.0;
    }
}

void main() {
    float dx = 1.0/1920.0;
    float dy = 1.0/1080.0;
    int idx = 0;
    for(int x = -MAX_LEVEL; x < MAX_LEVEL; x++){
        float xf = float(x);
        for(int y = -MAX_LEVEL; y < MAX_LEVEL; y++){
            testAndSet(p+vec2(dx*xf, dy*float(y)), idx);
            idx++;
        }
    }
    nearestDistance -= 0.01;
    vec3 result = vec3(0.0, 0.0, 0.0);
    float sumInvWeight = 0.0;
    for(int i = 0; i < MAX_VALUES; i++){
        if(FoundDistances[i] > 0.0){
            float distance = FoundDistances[i] - nearestDistance;
            if(distance > 0.0){
                float invWeight = 1.0/pow(distance, exp_p);
                result += (FoundValues[i] * invWeight);
                sumInvWeight += invWeight;
            }
        }
    }
    result /= sumInvWeight;
    color = vec4(result, 1);
}
