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
uniform int size;
uniform float separation;
uniform float minThreshold;
uniform float maxThreshold;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


TextureData texture0Data;


void main() {
	#if (TEXTURE)
		// int size = 4;
		// float separation = 2.0;
		// float minThreshold = 0.125;
		// float maxThreshold = 0.25;


		// vec2 textureSize = textureSize(material.texture0, 0).xy;
		// vec2 fragCoord = gl_FragCoord.xy;
		texture0Data.textureSize = vec2(textureSize(material.texture0, 0));
        texture0Data.texelSize = 1.0 / texture0Data.textureSize;


		// color = texture(material.texture0, fragCoord / textureSize);
		color = texture(material.texture0, fragUV);


		float max_luma = 0.0;
		vec4 max_color = color;

		for (int i = -size; i <= size; ++i) {
			for (int j = -size; j <= size; ++j) {
				// rectangular shape
				//if (false) { continue; };

				// diamond shape
				//if (!(abs(i) <= size - abs(j))) { continue; }

				// circular shape
				//if (!(distance(vec2(i, j), vec2(0, 0)) <= size)) { continue; }
				if (!(length(vec2(i, j)) <= float(size))) { continue; }


				//vec4 current_color = texture(material.texture0, (gl_FragCoord.xy + (vec2(i, j) * separation)) / textureSize);
				vec4 current_color = texture(material.texture0, (fragUV + vec2(i, j) * separation * texture0Data.texelSize));


				float current_luma = dot(current_color.rgb, vec3(0.21, 0.72, 0.07));


				if (current_luma > max_luma) {
					max_luma  = current_luma;
					max_color = current_color;
				}
			}
		}


  		color.rgb = mix(color.rgb, max_color.rgb, smoothstep(minThreshold, maxThreshold, max_luma));
	#fi
}
