#version 300 es
precision highp float;

uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform mat3 NMat;  // Normal Matrix

#if (INSTANCED)
in mat4 MMat;
#fi
in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal

#if (TEXTURE)
    in vec2 uv;          // Texture coordinate
#fi

// Output transformed vertex position, normal and texture coordinate
out vec3 fragVPos;
out vec3 fragVNorm;
out vec2 fragUV;

void main() {
    // Model view position
    //vec4 VPos4 = MVMat * vec4(VPos, 1.0);
    #if (!INSTANCED)
    vec4 VPos4 = MVMat * vec4(VPos, 1.0);
    #fi
    #if (INSTANCED)
    vec4 VPos4 = MVMat * MMat * vec4(VPos, 1.0);
    #fi

    // Projected position
    gl_Position = PMat * VPos4;
    //fragVPos = vec3(VPos4) / VPos4.w;
    fragVPos = VPos4.xyz;

    // Transform normal
    //fragVNorm = vec3(NMat * VNorm);
    #if (!INSTANCED)
    fragVNorm = vec3(NMat * VNorm);
    #fi
    #if (INSTANCED)
    fragVNorm = vec3(NMat * mat3(MMat) * VNorm);
    #fi

    #if (TEXTURE)
        // Pass-through texture coordinate
        fragUV = uv;
    #fi
}