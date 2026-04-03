#version 300 es
precision mediump float;


//DEF
//**********************************************************************************************************************


//STRUCT
//**********************************************************************************************************************

// SHADOWS
// #if (DLIGHTS)
// struct DLight {
//     vec3 direction;
//     vec3 color;
//     mat4 VPMat;
// };
// #fi
// #if (PLIGHTS)
// struct PLight {
//     //bool directional;
//     vec3 position;
//     vec3 position_worldspace;
//     vec3 color;
//     float distance;
//     // float decay;

//     mat4 VPMat;

//     float constant;
//     float linear;
//     float quadratic;
// };
// #fi
// #if (SLIGHTS)
// struct SLight {
//     vec3 position;
//     vec3 color;
//     float distance;
//     // float decay;
//     float cutoff;
//     float outerCutoff;
//     vec3 direction;

//     mat4 VPMat;

//     float constant;
//     float linear;
//     float quadratic;
// };
// #fi

//UIO
//**********************************************************************************************************************

// ALWAYS INSTANCED and maybe also NORMAL_FLAT.

uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
// XXXX uniform vec2 viewport;

uniform mat4 u_MMat; // model matrix
uniform mat4 u_IMat; // instance matrix

in  vec3 VPos;       // Vertex position
out vec3 fragVPos;
// out vec3 fragVPos_worldspace;

// This is a note, if we wanted to support vertex normals ... well, let me try to schlep this
#if (!NORMAL_FLAT)
    uniform mat3 NMat;      // Normal Matrix
    in      vec3 VNorm;     // Vertex normal
    out     vec3 fragVNorm;
#fi

#if (COLORS)
    in  vec4 VColor;
    out vec4 fragVColor;
#fi

#if (TEXTURE)
    in  vec2 uv;
    out vec2 fragUV;
#fi

// SHADOWS
// #if (DLIGHTS)
//     uniform DLight dLights[##NUM_DLIGHTS];
//     // out     vec4   fragVPos_dlightspace[##NUM_DLIGHTS];
// #fi

// #if (PLIGHTS)
//     uniform PLight pLights[##NUM_PLIGHTS];
//     // out     vec4   fragVPos_plightspace[##NUM_PLIGHTS];
// #fi
// #if (SLIGHTS)
//     uniform SLight sLights[##NUM_SLIGHTS];
//     // out     vec4   fragVPos_slightspace[##NUM_SLIGHTS];
// #fi

#if (CLIPPING_PLANES)
    out vec3 v_pos_for_clip;
#fi

#if (PICK_MODE_UINT)
    flat out uint InstanceID;
#fi
#if (OUTLINE)
        uniform bool u_OutlineGivenInstances;
        in  int  a_OutlineInstances;
#fi

#if (OUTLINE)
    #if (NORMAL_FLAT)
        out vec3 v_position_viewspace;
    #else
        out vec3 v_normal_viewspace;
    #fi
    out vec3 v_ViewDirection_viewspace;
#fi


//MAIN
//**********************************************************************************************************************
void main()
{
    vec4 VPos4 = MVMat * u_IMat * vec4(VPos, 1.0);
    // vec4 VPos4_worldspace = u_MMat * u_IMat * vec4(VPos, 1.0);

    gl_Position         = PMat * VPos4;
    fragVPos            = vec3(VPos4); /// ??? WAS / VPos4.w;
    // fragVPos_worldspace = vec3(VPos4_worldspace);

    #if (CLIPPING_PLANES)
        // View space ... why? And why - ?
        // vViewPosition = -VPos4.xyz;
        // World space
        v_pos_for_clip = vec3(u_MMat * u_IMat * vec4(VPos, 1.0));
    #fi

    #if (OUTLINE)

        #if (NORMAL_FLAT)
            v_position_viewspace = VPos4.xyz; // XXXX equal to fragVPos
        #else
            v_normal_viewspace = normalize(NMat * VNorm);
        #fi
        v_ViewDirection_viewspace = normalize(-VPos4.xyz);

    #else if (PICK_MODE_UINT)

        // Nothing to do, all in fragment
        fragVPos            = vec3(VPos4); // XXXX clone to avoid empty block

    #else

    // SHADOWS
    // #if (DLIGHTS)
    //     #for lightIdx in 0 to NUM_DLIGHTS
    //         fragVPos_dlightspace[##lightIdx] = dLights[##lightIdx].VPMat * VPos4_worldspace;
    //     #end
    // #fi
    // #if (PLIGHTS)
    //     #for lightIdx in 0 to NUM_PLIGHTS
    //         fragVPos_plightspace[##lightIdx] = pLights[##lightIdx].VPMat * VPos4_worldspace;
    //     #end
    // #fi
    // #if (SLIGHTS)
    //     #for lightIdx in 0 to NUM_SLIGHTS
    //         fragVPos_slightspace[##lightIdx] = sLights[##lightIdx].VPMat * VPos4_worldspace;
    //     #end
    // #fi

    #if (!NORMAL_FLAT)
        fragVNorm = vec3(NMat * mat3(u_IMat) * VNorm);
    #fi

    #if (TEXTURE)
        fragUV = uv;
    #fi

    #if (COLORS)
        fragVColor = VColor;
    #fi

    #fi
 }
