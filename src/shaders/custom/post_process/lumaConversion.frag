#version 300 es
precision mediump float;


struct Material {
    #if (TEXTURE)
        sampler2D texture0; //ORIGINAL
    #fi
};


uniform Material material;


#if (TEXTURE)
    in vec2 fragUV;
#fi


out vec4 color;


//const vec3 lumaConstant = vec3(0.299, 0.587, 0.114); //Whitepaper
const vec3 lumaConstant = vec3(0.2126729, 0.7151522, 0.0721750); //Uni
//const vec3 lumaConstant = vec3(0.3086, 0.6094, 0.0820); //opengl


/*float FXAA_luma(vec2 color){
    return color.y * (0.587/0.299) + color.x;
}
vec4 FXAA_luma2(vec4 color){
    vec3 lumaConstant = vec3(0.299, 0.587, 0.114);

    color.a = dot(color.rgb, lumaConstant);

    return color; 

}*/
vec4 SampleTex(vec2 uv){//sample
    return texture(material.texture0, uv).rgba;
}
//Luminance Conversion
float RGBToLuminance(vec3 RGBSample){
    vec3 saturatedRGBSample = clamp(RGBSample, 0.0, 1.0);

    return dot(saturatedRGBSample, lumaConstant);
}


void main() {
	#if (TEXTURE)
        vec3 fragmentRGB = SampleTex(fragUV).rgb;

        color = vec4(fragmentRGB, RGBToLuminance(fragmentRGB));
    #fi
}