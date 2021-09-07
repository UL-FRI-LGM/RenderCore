#version 300 es
precision mediump float;


//STRUCT
//**********************************************************************************************************************
struct Material {
    #if (CUBETEXTURES)
        #for I_TEX in 0 to NUM_CUBETEXTURES
            samplerCube cubeTexture##I_TEX;
        #end
    #fi
};


//UIO
//**********************************************************************************************************************
#if (CUBETEXTURES)
    in vec3 fragUVW;
#fi

out vec4 color;


uniform Material material;


//MAIN
//**********************************************************************************************************************
void main() {
    color = vec4(1.0, 1.0, 1.0, 1.0);

    #if (CUBETEXTURES)
        // Apply all of the textures
        #for I_TEX in 0 to NUM_CUBETEXTURES
            color *= texture(material.cubeTexture##I_TEX, fragUVW);
        #end
    #fi
}