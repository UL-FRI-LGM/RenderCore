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
#if (!NORMAL_FLAT)
in vec3 VNorm;      // Vertex normal
#fi

out vec3 v_position_viewspace;
#if (!NORMAL_FLAT)
out vec3 v_normal_viewspace;
#fi
out vec3 v_ViewDirection_viewspace;
out float v_distanceToCamera_viewspace;
#if (CLIPPING_PLANES)
out vec3 v_ViewPosition;
#fi


//MAIN
//**********************************************************************************************************************//
void main() {
    #if (!INSTANCED)
        vec4 position_viewspace = MVMat * vec4(VPos, 1.0);
        #if (!NORMAL_FLAT)
            vec3 normal_viewspace = normalize(NMat * VNorm);
        #fi
    #else if (INSTANCED)
        //vec4 VPos4 = VMat * MMat * vec4(VPos, 1.0);
        vec4 position_viewspace = MVMat * MMat * vec4(VPos, 1.0);
        #if (!NORMAL_FLAT)
            vec3 normal_viewspace = normalize(NMat * mat3(MMat) * VNorm);
        #fi
    #fi


    //******************************************************************************************************************//
    // Position
    //fragVPos = vec3(VPos4) / VPos4.w;
    v_position_viewspace = position_viewspace.xyz;

    // Transform normal
    //fragVNorm = normalize(NMat * VNorm) * 0.5 + 0.5;
    #if (!NORMAL_FLAT)
    v_normal_viewspace = normal_viewspace;
    #fi

    // View direction
    v_ViewDirection_viewspace = normalize(-position_viewspace.xyz);

    // Distance to camera
    // fragVDistanceToCamera = distance(fragVPos, u_CameraPosition);
    // fragVDistanceToCamera = distance(fragVPos, vec3(0.0, 0.0, 0.0));
    // fragVDistanceToCamera = length(fragVPos - vec3(0.0, 0.0, 0.0));
    v_distanceToCamera_viewspace = length(position_viewspace.xyz);
    //******************************************************************************************************************//


    #if (POINTS)
    gl_PointSize = pointSize / length(position_viewspace.xyz);
    if(gl_PointSize < 1.0) gl_PointSize = 1.0;
    #fi

    #if (CLIPPING_PLANES)
    v_ViewPosition = -position_viewspace.xyz;
    #fi


    // Projected position
    gl_Position = PMat * position_viewspace;
 }