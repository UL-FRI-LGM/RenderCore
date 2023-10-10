#version 300 es
precision mediump float;

#if (TEXTURE)
struct Material {
    vec3 diffuse;
    sampler2D texture0; //FONT TEXTURE
};

uniform Material material;
in vec2 fragUV;
#fi

// In SDF
in float doffset;
flat in vec2 sdf_texel;

out vec4 color;

uniform float hint_amount;

// doffset, hint_amount
float sdf_alpha( float sdf, float horz_scale, float vert_scale, float vgrad ) {
    float hdoffset = mix( doffset * horz_scale, doffset * vert_scale, vgrad );
    float rdoffset = mix( doffset, hdoffset, hint_amount );
    float alpha = smoothstep( 0.5 - rdoffset, 0.5 + rdoffset, sdf );
    alpha = pow( alpha, 1.0 + 0.2 * vgrad * hint_amount );
    return alpha;
}

void main() {
	#if (TEXTURE)
    // Sampling the texture, L pattern
    float sdf       = texture(material.texture0, fragUV).r;
    float sdf_north = texture(material.texture0, fragUV + vec2( 0.0, sdf_texel.y ) ).r;
    float sdf_east  = texture(material.texture0, fragUV + vec2( sdf_texel.x, 0.0 ) ).r;

    // Estimating stroke direction by the distance field gradient vector
    vec2  sgrad     = vec2( sdf_east - sdf, sdf_north - sdf );
    float sgrad_len = max( length( sgrad ), 1.0 / 128.0 );
    vec2  grad      = sgrad / vec2( sgrad_len );
    float vgrad = abs( grad.y ); // 0.0 - vertical stroke, 1.0 - horizontal one

    float horz_scale  = 1.1;
    float vert_scale  = 0.6;

    float alpha = sdf_alpha( sdf, horz_scale, vert_scale, vgrad );
    if (alpha < 0.05)
        discard;

    color = vec4( material.diffuse, alpha );

    //vec4 texel = texture(material.texture0, sdf);
    //color = vec4(texel.rgb * material.diffuse, texel.a);
	#fi
}
