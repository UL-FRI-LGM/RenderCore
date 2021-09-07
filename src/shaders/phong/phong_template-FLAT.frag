#version 300 es
precision mediump float;


// From vertex shader
//in vec3 fragVNorm;
//in vec3 fragVPos;
flat in vec4 fragVColor;


#if (TEXTURE)
    in vec2 fragUV;

    #for I_TEX in 0 to NUM_TEX
    sampler2D texture##I_TEX;
    #end
#fi


#if (CLIPPING_PLANES)
    struct ClippingPlane {
        vec3 normal;
        float constant;
    };

    uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];

    in vec3 vViewPosition;
#fi


out vec4 color;


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


    color = fragVColor;


    #if (TEXTURE)
        // Apply all of the textures
        #for I_TEX in 0 to NUM_TEX
             color *= texture(material.texture##I_TEX, fragUV);
        #end
    #fi
}