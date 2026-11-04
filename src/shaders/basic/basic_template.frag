#version 300 es
precision highp float;


//STRUCT
//**********************************************************************************************************************
struct Material {
    vec3 emissive;
    vec3 diffuse;
    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi
    #if (CUBETEXTURES)
        #for I_TEX in 0 to NUM_CUBETEXTURES
            samplerCube cubeTexture##I_TEX;
        #end
    #fi
};


//UIO
//**********************************************************************************************************************
uniform Material material;
#if (TRANSPARENT)
uniform float alpha;
#else
float alpha = 1.0;
#fi


#if (COLORS)
    in vec4 fragVColor;
#fi

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;

#if (CLIPPING_PLANES)
    struct ClippingPlane {
        vec3 normal;
        float constant;
    };

    uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];

    in vec3 vViewPosition;
#fi

#if (CUBETEXTURES)
    uniform vec3 cameraPosition;
    //uniform samplerCube skybox_tex;
    uniform mat4 VMat;
    in vec3 fragVPos_worldspace;
    in vec3 fragVNorm_worldspace;
#fi


//MAIN
//**********************************************************************************************************************
void main() {
    #if (CLIPPING_PLANES)
        bool clipped = true;
        for(int i = 0; i < ##NUM_CLIPPING_PLANES; i++){
                clipped = ( dot( vViewPosition, clippingPlanes[i].normal ) > clippingPlanes[i].constant ) && clipped;
        }
        if ( clipped ) discard;
    #fi


    #if (CIRCLES)
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float pct = dot(cxy, cxy);
        if (pct > 1.0) {
            discard; //performance trap
            //color = vec4(1.0, 1.0, 1.0, 0.0);
        }
    #fi


    // Unlit: the diffuse colour times the vertex colour and the textures, plus the emissive colour.
    color = vec4(material.diffuse, alpha);

    #if (COLORS)
        color.rgb *= fragVColor.rgb;
        color.a += fragVColor.a;
    #fi


    #if (TEXTURE)
        // Apply all of the textures
        #for I_TEX in 0 to NUM_TEX
            color *= texture(material.texture##I_TEX, fragUV);
        #end
    #fi

    #if (CUBETEXTURES)
        vec3 I = normalize(fragVPos_worldspace - cameraPosition);
        vec3 R = reflect(I, normalize(fragVNorm_worldspace));

        // float ratio = 1.00 / 1.52;
        // vec3 I = normalize(fragVPos_worldspace - cameraPosition);
        // vec3 R = refract(I, normalize(fragVNorm_worldspace), ratio);

        // Apply all of the textures
        #for I_TEX in 0 to NUM_CUBETEXTURES
            color *= texture(material.cubeTexture##I_TEX, R);
        #end
    #fi

    color.rgb += material.emissive;
}
