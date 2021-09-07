#version 300 es
precision mediump float;


struct Material {
    #if (TEXTURE)
        sampler2D texture0; //COLOR
    #fi
};

struct TextureData {
    vec2 textureSize;
    vec2 texelSize;
};


uniform Material material;
uniform float redOffset;
uniform float greenOffset;
uniform float blueOffset;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


//TextureData texture0Data;


void main() {
	#if (TEXTURE)
		// float redOffset = 0.009;
		// float greenOffset = 0.006;
		// float blueOffset = -0.006;
		vec4 focusPoint = vec4(vec3(0.0), 1.0);


		// vec2 texSize  = textureSize(colorTexture, 0).xy;
  		// vec2 texCoord = gl_FragCoord.xy / texSize;
		//texture0Data.textureSize = vec2(textureSize(material.texture0, 0));
        //texture0Data.texelSize = 1.0 / texture0Data.textureSize;


		vec2 direction = fragUV - vec2(0.5, 0.5);


		color.r  = texture(material.texture0, fragUV + (direction * vec2(redOffset  ))).r;
		color.g  = texture(material.texture0, fragUV + (direction * vec2(greenOffset))).g;
		color.ba = texture(material.texture0, fragUV + (direction * vec2(blueOffset ))).ba;
	#fi
}
