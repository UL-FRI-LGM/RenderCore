#version 300 es
precision mediump float;


//DEF
//**********************************************************************************************************************
#define SPRITE_SPACE_WORLD 0.0
#define SPRITE_SPACE_SCREEN 1.0


//UIO
//**********************************************************************************************************************
uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform vec2 spriteSize;
uniform float aspect;
uniform vec2 viewport;
uniform float MODE;

in vec3 VPos;       // Vertex position
in vec2 deltaOffset;
//in vec3 center;
#if (INSTANCED)
in mat4 a_MMat;
#fi
#if (INSTANCED_TRANSLATION)
in vec4 a_Translation;
#fi

#if (CIRCLES)
out vec2 VCenter;
out vec2 deltaVPos;
#fi

#if (COLORS)
    in vec4 VColor;
    out vec4 fragVColor;
#fi

#if (TEXTURE)
    in vec2 uv;
    out vec2 fragUV;
#fi

#if (PLIGHTS)
    out vec3 fragVPos;
#fi

#if (POINTS)
    uniform float pointSize;
#fi

#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi


//MAIN
//**********************************************************************************************************************
void main() {
    // // Model view position
    // vec4 VPos_viewspace = MVMat * vec4(VPos, 1.0);
    // //vec4 VCenter_viewspace = MVMat * vec4(center, 1.0);
    #if (!INSTANCED && !INSTANCED_TRANSLATION)
    vec4 VPos_viewspace = MVMat * vec4(VPos, 1.0);
    #fi
    #if (INSTANCED)
    vec4 VPos_viewspace = MVMat * a_MMat * vec4(VPos, 1.0);
    #fi
    #if (INSTANCED_TRANSLATION)
    vec4 VPos_viewspace = MVMat * vec4(VPos + a_Translation.xyz, 1.0);
    #fi


    if(MODE == SPRITE_SPACE_WORLD){
        // position + delta offset
        vec4 delta_viewspace = vec4(deltaOffset * spriteSize.xy, 0.0, 0.0);

        vec4 deltaVPos_viewspace = (VPos_viewspace + delta_viewspace);


        // world space size position
        //gl_Position = (PMat * VPos_viewspace) + delta; //v1
        gl_Position = PMat * deltaVPos_viewspace; //v2


        #if (CIRCLES)
        // set for circle shape
        vec4 VCenter_viewspace = VPos_viewspace;

        deltaVPos = deltaVPos_viewspace.xy;
        VCenter = VCenter_viewspace.xy;
        #fi
    }else if(MODE == SPRITE_SPACE_SCREEN){
        // Projected position + delta offset
        vec2 delta_screenspace = deltaOffset * spriteSize.xy;
        vec3 delta_NDC = vec3(delta_screenspace.xy / viewport, 0.0);

        vec4 VPos_clipspace = PMat * VPos_viewspace;
        vec3 VPos_NDC = VPos_clipspace.xyz / VPos_clipspace.w;
        vec3 deltaVPos_NDC = VPos_NDC + delta_NDC;


        // screen space size position
        //gl_Position = deltaVPos_NDC;
        gl_Position = vec4(deltaVPos_NDC * VPos_clipspace.w, VPos_clipspace.w);


        #if (CIRCLES)
        // set for circle shape
        vec4 VCenter_viewspace = VPos_viewspace;

        deltaVPos = deltaVPos_NDC.xy * viewport;
        vec4 VCenter_clipspace = PMat * VCenter_viewspace;
        VCenter = VCenter_clipspace.xy / VCenter_clipspace.w * viewport;
        #fi
    }


    #if (PLIGHTS)
        // Pass vertex position to fragment shader
        fragVPos = vec3(VPos_viewspace) / VPos_viewspace.w;
    #fi

    #if (COLORS)
        // Pass vertex color to fragment shader
        fragVColor = VColor;
    #fi

    #if (TEXTURE)
        // Pass uv coordinate to fragment shader
        fragUV = uv;
    #fi

    #if (POINTS)
        gl_PointSize = pointSize / length(VPos_viewspace.xyz);
        if(gl_PointSize < 1.0) gl_PointSize = 1.0;
    #fi

    #if (CLIPPING_PLANES)
        vViewPosition = -VPos_viewspace.xyz;
    #fi
 }