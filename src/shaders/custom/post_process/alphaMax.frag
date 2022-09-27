#version 300 es
precision mediump float;


//UIO
//**********************************************************************************************************************//
struct Material {
    #if (TEXTURE)
        sampler2D texture0;
    #fi
};


uniform Material material;
uniform bool horizontal;
uniform int size;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


//MAIN
//**********************************************************************************************************************//
void main() {
	#if (TEXTURE)
		//bool horizontal = true;


		vec2 tex_offset = 1.0 / vec2(textureSize(material.texture0, 0)); // gets size of single texel
		vec4 result = texture(material.texture0, fragUV).rgba; // current fragment's contribution


		if(horizontal) {
			for(int i = 1; i < size; i++) {
			    // result = mix(texture(material.texture0, fragUV + vec2(tex_offset.x * float(i), 0.0)).rgba, result, result.a); 
			    // result = mix(texture(material.texture0, fragUV - vec2(tex_offset.x * float(i), 0.0)).rgba, result, result.a);
				result.a = max(texture(material.texture0, fragUV + vec2(tex_offset.x * float(i), 0.0)).a, result.a); 
			    result.a = max(texture(material.texture0, fragUV - vec2(tex_offset.x * float(i), 0.0)).a, result.a);
			}
		}else {
			for(int i = 1; i < size; i++) {
			    // result = mix(texture(material.texture0, fragUV + vec2(0.0, tex_offset.y * float(i))).rgba, result, result.a);
			    // result = mix(texture(material.texture0, fragUV - vec2(0.0, tex_offset.y * float(i))).rgba, result, result.a);
				result.a = max(texture(material.texture0, fragUV + vec2(0.0, tex_offset.y * float(i))).a, result.a);
			    result.a = max(texture(material.texture0, fragUV - vec2(0.0, tex_offset.y * float(i))).a, result.a);
			}
		}


		color = result;
	#fi
}
