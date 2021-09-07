#version 300 es
precision mediump float;


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


void main() {
    // MVP position
    //gl_Position = PMat * MVMat * vec4(VPos, 1.0); //original (non-instanced)
    #if (!INSTANCED)
    gl_Position = PMat * MVMat * vec4(VPos, 1.0);
    #fi
    #if (INSTANCED)
    //gl_Position = PMat * VMat * MMat * vec4(VPos, 1.0);
    gl_Position = PMat * MVMat * MMat * vec4(VPos, 1.0);
    #fi
}