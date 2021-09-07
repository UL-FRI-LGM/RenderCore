#version 300 es
precision mediump float;


//DEF
//**********************************************************************************************************************//
#define MODE_REINHARD 0.0
#define MODE_EXPOSURE 1.0


struct Material {
    #if (TEXTURE)
        sampler2D texture0; //color texture
    #fi
};


uniform Material material;
uniform float MODE;
uniform float gamma;
uniform float exposure;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


//MAIN
//**********************************************************************************************************************//
void main() {
    #if (TEXTURE)
        //FINAL SHADER
        //const float gamma = 2.2;
        //const float exposure = 1.0;
        vec3 hdrColor = texture(material.texture0, fragUV).rgb; //input color
    
        vec3 mapped;
        if (MODE == MODE_REINHARD){
            // reinhard tone mapping
            mapped = hdrColor / (hdrColor + vec3(1.0));
        }else if (MODE == MODE_EXPOSURE){
            // exposure tone mapping
            mapped = vec3(1.0) - exp(-hdrColor * exposure);
        }
        
        // gamma correction 
        mapped = pow(mapped, vec3(1.0 / gamma));
    
        color = vec4(mapped, 1.0);
    #fi
}