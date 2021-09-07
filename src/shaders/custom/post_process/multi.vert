#version 300 es
precision highp float;


#if (INSTANCED)
//uniform mat4 VMat;
uniform mat4 MVMat;
#fi
#if (!INSTANCED)
uniform mat4 MVMat; // Model View Matrix
#fi
uniform mat4 PMat;  // Projection Matrix
uniform mat3 NMat;  // Normal Matrix
uniform vec3 cameraPosition;

#if (INSTANCED)
in mat4 MMat;
#fi
in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal

out vec3 fragVPos;
out vec3 fragVNorm;
out vec3 vViewDirection;
out float fragVDistanceToCamera;


#if (POINTS)
    uniform float pointSize;
#fi

#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi


void main() {
    // Model view position
    //vec4 VPos4 = MVMat * vec4(VPos, 1.0); //original (non-instanced)
    #if (!INSTANCED)
    vec4 VPos4 = MVMat * vec4(VPos, 1.0);
    #fi
    #if (INSTANCED)
    //vec4 VPos4 = VMat * MMat * vec4(VPos, 1.0);
    vec4 VPos4 = MVMat * MMat * vec4(VPos, 1.0);
    #fi

    // Projected position
    gl_Position = PMat * VPos4;
    //fragVPos = vec3(VPos4) / VPos4.w; //deljenje z 1?
    fragVPos = VPos4.xyz;

    // Transform normal
    //fragVNorm = normalize(NMat * VNorm) * 0.5 + 0.5;
    #if (!INSTANCED)
    fragVNorm = normalize(NMat * VNorm) * 0.5 + 0.5;
    #fi
    #if (INSTANCED)
    fragVNorm = normalize(NMat * mat3(MMat) * VNorm) * 0.5 + 0.5;
    #fi
    // View direction
    vViewDirection = normalize(fragVPos) * 0.5 + 0.5;
    // Distance to camera
    //fragVDistanceToCamera = distance(fragVPos, cameraPosition);
    fragVDistanceToCamera = length(fragVPos); // distance(fragVPos, vec3(0.0, 0.0, 0.0)) == length(fragVPos - vec3(0.0, 0.0, 0.0));


    #if (POINTS)
        gl_PointSize = pointSize / length(VPos4.xyz);
        if(gl_PointSize < 1.0) gl_PointSize = 1.0;
    #fi

    #if (CLIPPING_PLANES)
        vViewPosition = -VPos4.xyz;
    #fi
 }