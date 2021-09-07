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
uniform int pixelSize;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


TextureData texture0Data;


void main() {
	#if (TEXTURE)
		texture0Data.textureSize = vec2(textureSize(material.texture0, 0));
        texture0Data.texelSize = 1.0 / texture0Data.textureSize;


		//int pixelSize = 5;


		float x = float(int(gl_FragCoord.x) % pixelSize);
		float y = float(int(gl_FragCoord.y) % pixelSize);

		x = floor(float(pixelSize) / 2.0) - x;
		y = floor(float(pixelSize) / 2.0) - y;

		x = gl_FragCoord.x + x;
		y = gl_FragCoord.y + y;


		color  = texture(material.texture0, vec2(x, y) / texture0Data.textureSize);
	#fi
}
