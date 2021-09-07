#version 300 es
precision mediump float;


//UIO
//**********************************************************************************************************************
uniform mat4 MVMat;  // View Matrix
uniform mat4 PMat;  // Projection Matrix

in vec3 VPos;       // Vertex position

#if (CUBETEXTURES)
    //in vec3 uvw;
    out vec3 fragUVW;
#fi


//MAIN
//**********************************************************************************************************************
void main() {
    gl_Position = PMat * MVMat * vec4(VPos, 1.0);
    gl_Position.xyzw = gl_Position.xyww; //optimization

    #if (CUBETEXTURES)
        // Pass uvw coordinate to fragment shader
        fragUVW = VPos;
    #fi
 }