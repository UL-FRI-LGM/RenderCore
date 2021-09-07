#version 300 es
precision highp float;

uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform mat3 NMat;  // Normal Matrix

in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal

#if (TEXTURE)
    in vec2 uv;          // Texture coordinate
#fi

// Output transformed vertex position, normal and texture coordinate
out vec3 fragVPos;
out vec3 fragVNorm;
out vec2 fragUV;
out vec3 fragVNormOriginal;

in vec4 VColor;
out vec4 fragVColor;

uniform float pointSize;

void main() {
    
    // Model view position
    vec4 VPos4 = MVMat * vec4(VPos, 1.0);

    // Projected position
    gl_Position = PMat * VPos4;
    fragVPos = vec3(VPos4) / VPos4.w;

    float distance = sqrt((fragVPos.x*fragVPos.x)+(fragVPos.y*fragVPos.y)+(fragVPos.z*fragVPos.z));
    if(pointSize < 0.0) gl_PointSize = 1.0;
    else gl_PointSize = pointSize/distance;
    //gl_PointSize = 10.0;

    // Transform normal
    fragVNorm = vec3(NMat * VNorm);
    fragVNormOriginal = VNorm;
    fragVColor = VColor;

    #if (TEXTURE)
        // Pass-through texture coordinate
        fragUV = uv;
    #fi
}