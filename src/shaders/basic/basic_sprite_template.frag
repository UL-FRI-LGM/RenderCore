#version 300 es
precision highp float;


//DEF
//**********************************************************************************************************************
#define SPRITE_SPACE_WORLD 0.0
#define SPRITE_SPACE_SCREEN 1.0


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
};


//UIO
//**********************************************************************************************************************
uniform Material material;
#if (TRANSPARENT)
uniform float alpha;
#else
float alpha = 1.0;
#fi

#if (CIRCLES)
uniform vec2 spriteSize;
uniform vec2 viewport;
uniform float MODE;
#fi


#if (COLORS)
    in vec4 fragVColor;
#fi

#if (TEXTURE)
    in vec2 fragUV;
#fi

in vec2 VCenter;
in vec2 deltaVPos;

out vec4 color;

#if (CLIPPING_PLANES)
    struct ClippingPlane {
        vec3 normal;
        float constant;
    };

    uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];

    in vec3 vViewPosition;
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
    //DEPRECATED
    // if(MODE == SPRITE_SPACE_WORLD){
    //     //if (distance(deltaVPos.xy, VCenter.xy) > 4.0) {
    //     if (distance(deltaVPos.xy, VCenter.xy) > spriteSize.x) {
    //         discard; //performance trap
    //         //color = vec4(1.0, 1.0, 1.0, 0.0);
    //     }
    // }else if(MODE == SPRITE_SPACE_SCREEN){
    //     if (distance(deltaVPos.xy, VCenter.xy) > spriteSize.x) {
    //         discard; //performance trap
    //         //color = vec4(1.0, 1.0, 1.0, 0.0);
    //     }
    // }
    if (distance(deltaVPos.xy, VCenter.xy) > spriteSize.x) {
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

    color.rgb += material.emissive;
}
