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
//in vec2 fragUV;
float flag;
float distance;

void testAndSetDepth(vec2 v){
    vec4 clr = texture(material.texture1, v);
    if(clr.w == 1.0) {
        vec4 pos = texture(material.texture0, v);
        float d = sqrt((pos.x*pos.x)+(pos.y*pos.y)+(pos.z*pos.z));
        if(d < distance){
            color = vec4(clr.rgb, 1);
            distance = d;
        }
    }
}

void testAndSet(vec2 v){
    if(flag == 0.0){
        vec4 clr = texture(material.texture1, v);
        if(clr.w == 1.0) {
            flag = 1.0;
            color = vec4(clr.rgb, 1);
        }
    }
}

void main() {
    float dx = 1.0/1920.0;
    float dy = 1.0/1080.0;
    distance = 1000.0;
    flag = 0.0;
    color = vec4(0, 0, 0, 1);
    for(int level = 0; level < 10; level++){
        float l = float(level);
        for(int i = 0; i <= level; i++){
            testAndSetDepth(p+vec2(dx*l, dy*float(i)));
            testAndSetDepth(p+vec2(dx*l, -dy*float(i)));
            testAndSetDepth(p+vec2(-dx*l, dy*float(i)));
            testAndSetDepth(p+vec2(-dx*l, -dy*float(i)));
            testAndSetDepth(p+vec2(dx*float(i), dy*l));
            testAndSetDepth(p+vec2(-dx*float(i), dy*l));
            testAndSetDepth(p+vec2(dx*float(i), -dy*l));
            testAndSetDepth(p+vec2(-dx*float(i), -dy*l));
        }
    }
    
    
}
