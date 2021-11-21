#version 300 es
precision mediump float;



//UIO
//**********************************************************************************************************************//
uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform mat3 NMat;  // Normal Matrix

// uniform vec3 cameraPosition;
#if (POINTS)
uniform float pointSize;
#fi

#if (INSTANCED)
in mat4 MMat;
#fi
in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal

out vec3 v_position_viewspace;
out vec3 v_normal_viewspace;
out vec3 v_ViewDirection_viewspace;
out float v_distanceToCamera_viewspace;
#if (CLIPPING_PLANES)
out vec3 v_ViewPosition;
#fi


//MAIN
//**********************************************************************************************************************//
void main() {
    #if (!INSTANCED)
    vec4 VPos4 = MVMat * vec4(VPos, 1.0);
    #fi
    #if (INSTANCED)
    //vec4 VPos4 = VMat * MMat * vec4(VPos, 1.0);
    vec4 VPos4 = MVMat * MMat * vec4(VPos, 1.0);
    #fi


    //******************************************************************************************************************//
    // Position
    //fragVPos = vec3(VPos4) / VPos4.w;
    v_position_viewspace = VPos4.xyz;

    // Transform normal
    //fragVNorm = normalize(NMat * VNorm) * 0.5 + 0.5;
    #if (!INSTANCED)
    v_normal_viewspace = normalize(NMat * VNorm);
    #fi
    #if (INSTANCED)
    v_normal_viewspace = normalize(NMat * mat3(MMat) * VNorm);
    #fi

    // View direction
    v_ViewDirection_viewspace = normalize(-VPos4.xyz);

    // Distance to camera
    // fragVDistanceToCamera = distance(fragVPos, u_CameraPosition);
    // fragVDistanceToCamera = distance(fragVPos, vec3(0.0, 0.0, 0.0));
    // fragVDistanceToCamera = length(fragVPos - vec3(0.0, 0.0, 0.0));
    v_distanceToCamera_viewspace = length(VPos4.xyz);
    //******************************************************************************************************************//


    #if (POINTS)
    gl_PointSize = pointSize / length(VPos4.xyz);
    if(gl_PointSize < 1.0) gl_PointSize = 1.0;
    #fi

    #if (CLIPPING_PLANES)
    v_ViewPosition = -VPos4.xyz;
    #fi


    // Projected position
    gl_Position = PMat * VPos4;
 }