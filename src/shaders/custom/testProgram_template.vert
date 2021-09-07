#version 300 es
precision mediump float;

uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix

in vec3 VPos;       // Vertex position

#if (TEXTURE)
    in vec2 uv;
    out vec2 fragUV;
#fi

#if (LIGHTS)
    out vec3 fragVPos;
#fi

in vec3 displacement;

#if (POINTS)
    uniform float pointSize;
#fi

#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi

void main() {
    // Model view position
    vec4 VPos4 = MVMat * vec4(VPos, 1.0) + vec4(displacement, 1.0);

    // Projected position
    gl_Position = PMat * VPos4;

    #if (LIGHTS)
        // Pass vertex position to fragment shader
        fragVPos = vec3(VPos4) / VPos4.w;
    #fi

    #if (TEXTURE)
        // Pass uv coordinate to fragment shader
        fragUV = uv;
    #fi

    #if (POINTS)
        gl_PointSize = pointSize / length(VPos4.xyz);
        if(gl_PointSize < 1.0) gl_PointSize = 1.0;
    #fi

    #if (CLIPPING_PLANES)
        vViewPosition = -VPos4.xyz;
    #fi
 }