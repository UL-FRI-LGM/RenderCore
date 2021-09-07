#version 300 es
precision highp float;

struct Material {
    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi
};

uniform Material material;

uniform bool mouseDown;
uniform vec2 mousePos;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


void main() {
    #if (TEXTURE)
        color = texture(material.texture0, fragUV).rgba;

        #for I_TEX in 1 to NUM_TEX
             vec4 tex##I_TEX = texture(material.texture##I_TEX, fragUV).rgba;

             color = mix(color, tex##I_TEX, tex##I_TEX.a);
        #end
    #fi
}