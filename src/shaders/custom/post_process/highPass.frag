#version 300 es
precision mediump float;


//DEF
//**********************************************************************************************************************
#define HIGHPASS_MODE_BRIGHTNESS 0.0
#define HIGHPASS_MODE_DIFFERENCE 1.0
#define SQRT3 1.7321


struct Material {
    #if (TEXTURE)
        sampler2D texture0;
    #fi
};


uniform Material material;
uniform float MODE;
uniform vec3 targetColor;
uniform float threshold;

#if (TEXTURE)
    in vec2 fragUV;
#fi

//out vec4 color[2];
out vec4 color;


void main() {
	if(MODE == HIGHPASS_MODE_BRIGHTNESS){
		// check whether fragment output is higher than threshold, if so output as brightness color
		//float brightness = dot(texture(material.texture0, fragUV).rgb, vec3(0.2126, 0.7152, 0.0722));
		float brightness = dot(texture(material.texture0, fragUV).rgb, targetColor);

		//if(brightness > 0.75){
		if(brightness > threshold){
			color = texture(material.texture0, fragUV); //texture(material.texture##I_TEX, fragUV)
		}else{
			color = vec4(0.0, 0.0, 0.0, 1.0);
		}
	}else if(MODE == HIGHPASS_MODE_DIFFERENCE){
		vec3 delta = abs(texture(material.texture0, fragUV).rgb - targetColor);
		float difference = length(delta);

		if(difference <= threshold*SQRT3){
			color = texture(material.texture0, fragUV); //texture(material.texture##I_TEX, fragUV)
		}else{
			color = vec4(0.0, 0.0, 0.0, 1.0);
		}
	}


	//COPY
	//color[1] = texture(material.texture0, fragUV);
}
