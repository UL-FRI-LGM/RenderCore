#version 300 es
precision mediump float;


struct Material {
    #if (TEXTURE)
		sampler2D texture0; //ORIGINAL
        sampler2D texture1; //OUT OF FOCUS IMAGE
		sampler2D texture2; //POSITION
    #fi
};


uniform Material material;
uniform float minDistance;
uniform float maxDistance;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


void main() {
	#if (TEXTURE)

		// float minDistance = 2.0;
  		// float maxDistance = 8.0;


		vec4 focusColor = texture(material.texture0, fragUV);
  		vec4 outOfFocusColor = texture(material.texture1, fragUV);
		vec4 position_viewspace = texture(material.texture2, fragUV);
		//vec4 focusPoint = texture(material.texture2, vec2(0.5, 0.5));
		vec4 focusPoint_viewspace = vec4(vec3(0.0, 0.0, -8.0), 1.0);

		float distance = abs(position_viewspace.z - focusPoint_viewspace.z);
		float blur = smoothstep(minDistance, maxDistance, distance);


		color = mix(focusColor, outOfFocusColor, blur);
	#fi
}
