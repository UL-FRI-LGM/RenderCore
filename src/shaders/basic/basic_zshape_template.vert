#version 300 es
precision highp float;


//DEF
//**********************************************************************************************************************

#if (INSTANCED)
struct Material {
    vec3 emissive;
    vec3 diffuse;
    float alpha;
    sampler2D instanceData0;
    // The following one could actually be instanced in int (or it has to be float?)
    // #if (OUTLINE)
    //    sampler2D instance_indices;
    // #fi
    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi

    // AMT ADD
    vec3 specular;
    float shininess;

    bool blinn;
};
#fi

//UIO
//**********************************************************************************************************************
uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform vec2 viewport;
uniform vec3 ShapeSize;

in vec3 VPos;       // Vertex position
in vec3 VNorm;      // Vertex normal
uniform mat3 NMat;  // Normal Matrix

out vec4 fragVColor;

out vec3 fragVPos;

#if (!NORMAL_FLAT)
    out vec3 fragVNorm;
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

#if (INSTANCED)
    uniform Material material;
    #if (PICK_MODE_UINT)
        flat out uint InstanceID;
    #fi
    #if (OUTLINE)
        uniform bool u_OutlineGivenInstances;
        in  int  a_OutlineInstances;
    #fi

#fi

#if (OUTLINE)
out vec3 v_normal_viewspace;
out vec3 v_ViewDirection_viewspace;
#fi

//MAIN
//**********************************************************************************************************************
void main() {
    // Position of the origin in viewspace.
    vec3 VPos_final;
    vec3 VPos_local = vec3(ShapeSize.x, ShapeSize.y, ShapeSize.z) * VPos;
    // Diffuse color
    vec3 coldif;

    #if (INSTANCED)
        int iID = gl_InstanceID;
        #if (OUTLINE)
            if (u_OutlineGivenInstances)
                iID = a_OutlineInstances;
        #fi
        #if (MAT4_PER_INSTANCE)
            int pID = 4 * iID;
        #else if (SCALE_PER_INSTANCE)
            int pID = 2 * iID; // pixelID
        #else
            int pID = iID; // pixelID
        #fi
        int   tsx = textureSize(material.instanceData0, 0).x;
        ivec2 tc  = ivec2(pID % tsx, pID / tsx);
        vec4  pos = texelFetch(material.instanceData0, tc, 0);

        uint rgba = floatBitsToUint(pos.w);
        coldif.r = float((uint(0xff0000) & rgba) >> 16) / 255.0;
        coldif.g = float((uint(0xff00) & rgba) >> 8) / 255.0;
        coldif.b = float((uint(0xff) & rgba) >> 0) / 255.0;

        mat3 mmat = mat3(1.0);
        #if (SCALE_PER_INSTANCE)
            vec4 scale = texelFetchOffset(material.instanceData0, tc, 0, ivec2(1, 0));
            VPos_final = pos.xyz + VPos_local * scale.xyz;
        #else if (MAT4_PER_INSTANCE)
            mmat = mat3(texelFetchOffset(material.instanceData0, tc, 0, ivec2(1, 0)).xyz,
                        texelFetchOffset(material.instanceData0, tc, 0, ivec2(2, 0)).xyz,
                        texelFetchOffset(material.instanceData0, tc, 0, ivec2(3, 0)).xyz);
            VPos_final = pos.xyz + mmat * VPos_local;
        #else
            VPos_final = pos.xyz + VPos_local;
        #fi

        #if (!NORMAL_FLAT)
            fragVNorm = vec3(NMat * mmat * VNorm);
        #fi

        #if (PICK_MODE_UINT)
            InstanceID = uint(iID);
        #fi
    #else
        VPos_final = VPos_local;
        coldif = material.diffuse;
        #if (!NORMAL_FLAT)
            fragVNorm = vec3(NMat * VNorm);
        #fi
    #fi

    vec4 VPos_viewspace = MVMat * vec4(VPos_final, 1.0);

    // Assume vertices in x,y plane, z = 0; close to (0, 0) as ShapeSize
    // will scale them (for centered sprite there should be a quad with x, y = +-0.5).
    gl_Position = PMat * VPos_viewspace;

    // Pass vertex position to fragment shader
    fragVPos = vec3(VPos_viewspace) / VPos_viewspace.w;

    // Pass vertex color to fragment shader
    fragVColor = vec4(coldif, 1.0);

    #if (TEXTURE)
        // Pass uv coordinate to fragment shader
        fragUV = uv;
    #fi

    #if (CLIPPING_PLANES)
        vViewPosition = -VPos_viewspace.xyz;
    #fi

    #if (OUTLINE)
        v_normal_viewspace = vec3(0.0, 0.0, -1.0);

        float dToCam = length(VPos_viewspace.xyz);
        v_ViewDirection_viewspace = -VPos_viewspace.xyz / dToCam;
    #fi
 }
