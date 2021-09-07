#version 300 es
precision mediump float;

struct Material {
    vec3 diffuse;
    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi
};

uniform Material material;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;

void main() {
    color = vec4(material.diffuse, 1.0);

    #if (TEXTURE)
        // Apply all of the textures
        #for I_TEX in 0 to NUM_TEX
             float depthValue = texture(material.texture##I_TEX, fragUV).r;
             color *= vec4(depthValue, depthValue, depthValue, 1.0);
        #end
    #fi
}
