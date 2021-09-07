#version 300 es
precision mediump float;


uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform mat3 NMat;

#if (INSTANCED)
in mat4 MMat;
#fi
in vec3 VPos;       // Vertex position
in vec3 VNorm;
in float vertexNormalIndicators;


void main() {
    // MVP position
    //gl_Position = PMat * MVMat * vec4(VPos, 1.0); //original (non-instanced)
    
    #if (!INSTANCED)
    gl_Position = PMat * (MVMat * vec4(VPos, 1.0) + vec4(normalize(NMat * VNorm) * vertexNormalIndicators, 0.0));
    #fi
    #if (INSTANCED)
    //gl_Position = PMat * VMat * MMat * vec4(VPos, 1.0);
    gl_Position = PMat * (MVMat * MMat * vec4(VPos, 1.0) + vec4(normalize(NMat * mat3(MMat) * VNorm) * vertexNormalIndicators, 0.0));
    #fi
}