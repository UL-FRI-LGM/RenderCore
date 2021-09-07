#version 300 es
precision mediump float;


struct Material {
    #if (TEXTURE)
        sampler2D texture0; //MODIFIABLE, VOLATILE!
        sampler2D texture1; //ORIGINAL
    #fi
};


uniform Material material;

#if (TEXTURE)
    in vec2 fragUV;
#fi

//out vec4 color[2];
out vec4 color;


void main() {
	#if (TEXTURE)

		//const float gamma = 2.2;
		//const float exposure = 2.0;
		vec3 originalColor = texture(material.texture1, fragUV).rgb;
		vec3 bloomColor = texture(material.texture0, fragUV).rgb;
		originalColor += bloomColor; // additive blending

		// tone mapping
		//vec3 result = vec3(1.0) - exp(-originalColor * exposure);

		// gamma correction
		//result = pow(result, vec3(1.0 / gamma));


		//color[0] = vec4(result, 1.0);
		//color = vec4(result, 1.0);
		color = vec4(originalColor, 1.0);
	#fi
}
