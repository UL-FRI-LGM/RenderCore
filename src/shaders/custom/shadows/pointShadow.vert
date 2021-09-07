#version 300 es
precision mediump float;


uniform mat4 u_MMat;
#if (INSTANCED)
//uniform mat4 VMat;
uniform mat4 MVMat;
#fi
#if (!INSTANCED)
uniform mat4 MVMat; // Model View Matrix
#fi
uniform mat4 PMat;  // Projection Matrix

#if (INSTANCED)
in mat4 MMat;
#fi
in vec3 VPos;       // Vertex position

//out vec4 v_VPos_worldspace;
out vec4 v_VPos_lightspace;


void main() {

    #if (!INSTANCED)
    // v_VPos_worldspace = u_MMat * vec4(VPos, 1.0);
    // gl_Position = PMat * MVMat * vec4(VPos, 1.0);
    v_VPos_lightspace = MVMat * vec4(VPos, 1.0);
    gl_Position = PMat * v_VPos_lightspace;
    #fi
    #if (INSTANCED)
    // v_VPos_worldspace = u_MMat * MMat * vec4(VPos, 1.0);
    // gl_Position = PMat * MVMat * MMat * vec4(VPos, 1.0);
    v_VPos_lightspace = MVMat * MMat * vec4(VPos, 1.0);
    gl_Position = PMat * v_VPos_lightspace;
    #fi
}