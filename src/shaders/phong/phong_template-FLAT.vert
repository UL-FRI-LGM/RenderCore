#version 300 es
precision mediump float;


//STRUCT
//**********************************************************************************************************************
#if (DLIGHTS)
struct DLight {
    //bool directional;
    vec3 direction;
    vec3 color;
};
#fi
#if (PLIGHTS)
struct PLight {
    //bool directional;
    vec3 position;
    vec3 color;
    float distance;
    //float decay;

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
    //float decay;
    float cutoff;
    float outerCutoff;
    vec3 direction;

    float constant;
    float linear;
    float quadratic;
};
#fi

struct Material {
    vec3 diffuse;
    vec3 specular;
    float shininess;
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
uniform mat3 NMat;  // Normal Matrix

#if (INSTANCED)
in mat4 MMat;
#fi
in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal

// Output transformed vertex position, normal and texture coordinate
//out vec3 fragVPos;
//out vec3 fragVNorm;
flat out vec4 fragVColor;


#if (COLORS)
    in vec4 VColor;
#fi

#if (TEXTURE)
    in vec2 uv;          // Texture coordinate
    out vec2 fragUV;
#fi


#if (POINTS)
    uniform float pointSize;
#fi

#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi



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
uniform Material material;
#if (TRANSPARENT)
uniform float alpha;
#else
    float alpha = 1.0;
#fi


//FUNCTIONS
//**********************************************************************************************************************
#include light_shading_decl


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


    vec3 P = VPos_viewspace.xyz;
    vec3 N = normalize(NMat * VNorm);
    vec3 V = normalize(-VPos_viewspace.xyz);

    // Calculate combined light contribution
    vec3 kd = material.diffuse;
    vec3 ks = material.specular;
    float shin = material.shininess;
    // Phong reflection only: this Material has no blinn.
    bool blinn = false;
    vec3 combined = ambient;
    #include light_shading_stmt

    fragVColor = vec4(combined, alpha);


    #if (COLORS)
        fragVColor += VColor;
    #fi

    #if (TEXTURE)
        // Pass-through texture coordinate
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
