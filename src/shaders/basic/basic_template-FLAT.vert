#version 300 es
precision mediump float;


//STRUCT
//**********************************************************************************************************************
struct Material {
    vec3 emissive;
    vec3 diffuse;
};


//UIO
//**********************************************************************************************************************

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



//out vec3 fragVPos;

flat out vec4 fragVColor;


#if (COLORS)
    in vec4 VColor;
#fi

#if (TEXTURE)
    in vec2 uv;
    out vec2 fragUV;
#fi


#if (POINTS)
    uniform float pointSize;
#fi

#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi


uniform Material material;
#if (TRANSPARENT)
uniform float alpha;
#else
float alpha = 1.0;
#fi


//MAIN
//**********************************************************************************************************************
void main() {
    // Model view position
    //vec4 VPos_viewspace = MVMat * vec4(VPos, 1.0); //original (non-instanced)
    #if (!INSTANCED)
    vec4 VPos_viewspace = MVMat * vec4(VPos, 1.0);
    #fi
    #if (INSTANCED)
    //vec4 VPos_viewspace = VMat * MMat * vec4(VPos, 1.0);
    vec4 VPos_viewspace = MVMat * MMat * vec4(VPos, 1.0);
    #fi

    // Projected position
    gl_Position = PMat * VPos_viewspace;


    // Unlit: the diffuse colour times the vertex colour, plus the emissive colour.
    fragVColor = vec4(material.diffuse, alpha);

    #if (COLORS)
        fragVColor.rgb *= VColor.rgb;
        fragVColor.a += VColor.a;
    #fi

    fragVColor.rgb += material.emissive;


    #if (TEXTURE)
        // Pass-through texture coordinate // Pass uv coordinate to fragment shader
        fragUV = uv;
    #fi


    #if (POINTS)
        #if (POINTS_SCALE)
            gl_PointSize = pointSize / length(VPos_viewspace.xyz);
        #else
            gl_PointSize = pointSize;
        #fi
        if(gl_PointSize < 1.0) gl_PointSize = 1.0;
    #fi


    #if (CLIPPING_PLANES)
        vViewPosition = -VPos_viewspace.xyz;
    #fi
 }