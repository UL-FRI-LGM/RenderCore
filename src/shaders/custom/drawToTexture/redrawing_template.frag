#version 300 es
precision highp float;
#if (TEXTURE)
struct Material {
        sampler2D texture0;
};

uniform Material material;
#fi

// We limit ourselves to up to 200 points per iteration
uniform vec2 linePoints[500];
// Number of points passed into the shader
uniform int numPoints;

// Line meta data
uniform vec3 brushColor;
uniform float thickness; // = 0.003f;
uniform float hardness; // = 0.0f;

// Aspect ratio fix
uniform float canvasWidth;
uniform float canvasHeight;

in vec2 fragUV;

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

vec2 fixPoint(vec2 point) {
    point.x = point.x * canvasHeight/canvasWidth + 0.5f;
    //point.y = point.y * canvasHeight/canvasWidth + 0.5;

    return point;
}

void main() {
    #if (TEXTURE)
        color = texture(material.texture0, fragUV).rgba;
    #fi

    for (int i = 1; i < numPoints; i++) {
        // Calculates the distance of current pixel from the line segment
        float dist = dstLineSeg(fixPoint(linePoints[i-1]), fixPoint(linePoints[i]), fragUV);


        // If distance is lower than line thicknes draw the line
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


}