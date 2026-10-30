#version 300 es
precision mediump float;


//STRUCT
//**********************************************************************************************************************
#if (DLIGHTS)
struct DLight {
    //bool directional;
    vec3 position;
    vec3 color;
};
#fi
#if (PLIGHTS)
struct PLight {
    //bool directional;
    vec3 position;
    vec3 color;
    float distance;
    float decay;

    float constant;
    float linear;
    float quadratic;
};
#fi
#if (SLIGHTS)
struct SLight {
    //bool directional;
    vec3 position;
    vec3 color;
    float distance;
    float decay;
    float cutoff;
    float outerCutoff;
    vec3 direction;

    float constant;
    float linear;
    float quadratic;
};
#fi

struct Material {
    vec3 emissive;
    vec3 diffuse;
};


//UIO
//**********************************************************************************************************************
#if (DLIGHTS)
uniform DLight dLights[##NUM_DLIGHTS];
#fi
#if (PLIGHTS)
uniform PLight pLights[##NUM_PLIGHTS];
#fi
#if (SLIGHTS)
uniform SLight sLights[##NUM_SLIGHTS];
#fi
uniform vec3 ambient;


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


//FUNCTIONS
//**********************************************************************************************************************
#include light_falloff_decl


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


    // Calculate combined light contribution
    vec3 P = VPos_viewspace.xyz;
    vec3 kd = material.diffuse;
    #if (COLORS)
        kd *= VColor.rgb;
    #fi
    vec3 combined = ambient * kd + material.emissive;
    #include light_falloff_stmt

    fragVColor = vec4(combined, alpha);


    #if (COLORS)
        fragVColor.a += VColor.a;
    #fi


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