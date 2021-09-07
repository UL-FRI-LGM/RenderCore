#version 300 es
precision highp float;

struct Material {
    #if (TEXTURE)
        sampler2D texture0;
    #fi
};

uniform Material material;

uniform bool draw;
uniform vec2 mouseA;
uniform vec2 mouseB;
uniform vec3 brushColor;

uniform float thickness; // = 0.003f;
uniform float hardness; // = 0.0f;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


float dstLineSeg(vec2 rA, vec2 rB, vec2 p) {

    vec2 rP = p - rA;

    vec2 rC = rB - rA;

    float dt = dot(rP, rC);
    float lenSquared = dot(rC, rC);
    float ratio = -1.0;
    if (lenSquared != 0.0f) {
        ratio = dt / lenSquared;
    }

    // Constrain
    ratio = max(0.0f, ratio);
    ratio = min(1.0f, ratio);

    vec2 linePoint = rA + ratio * rC;

    return length(p - linePoint);
}

void main() {
    #if (TEXTURE)
        color = texture(material.texture0, fragUV).rgba;

        if (draw) {
            float dist = dstLineSeg(mouseA, mouseB, fragUV);

            if (dist < thickness) {

                color.rgb = brushColor;

                float fadeStart = thickness * hardness;
                float fadeLength = thickness - fadeStart;

                if (dist > fadeStart) {
                    color.a = max(1.0f - ((dist - fadeStart) / fadeLength), color.a);
                }
                else {
                    color.a = 1.0f;
                }
            }
        }
    #fi
}