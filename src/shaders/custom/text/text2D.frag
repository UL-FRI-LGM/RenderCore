#version 300 es
precision mediump float;


#if (TEXTURE)
struct Material {
    sampler2D texture0; //FONT TEXTURE
};
#fi


#if (TEXTURE)
uniform Material material;
#fi

#if (TEXTURE)
in vec2 fragUV;
#fi

out vec4 color;


void main() {
	#if (TEXTURE)
    color = texture(material.texture0, fragUV);
	#fi
}
