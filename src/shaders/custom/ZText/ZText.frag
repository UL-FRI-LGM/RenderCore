#version 300 es
precision highp float;

#if (TEXTURE)
struct Material {
    vec3 diffuse;
    sampler2D texture0; //FONT TEXTURE
};

uniform Material material;
in vec2 fragUV;
#fi
uniform float alpha;



// In SDF
in float doffset;
flat in vec2 sdf_texel;

// Picking variant of this same program: ZText is the only place that knows how to
// place its vertices (see the MODE branches in ZText.vert), so picking has to go
// through this shader rather than a generic one. No alpha test -- the whole text
// box, frame included, is the pick target, which is what makes it grabbable.
//
// NOTE: written as #if/#else, NOT #if (!FLAG). ShaderBuilder only rewrites the
// negation of flags that are actually present, so "#if (!PICK_MODE_UINT)" fails
// to strip this declaration in the picking variant -- leaving a float output
// bound to the R32UI pick attachment, which makes every draw fail with
// GL_INVALID_OPERATION and picking silently return nothing.
#if (PICK_MODE_UINT)
uniform uint u_UINT_ID;
layout(location = 0) out uint objectID;
#else
out vec4 color;
#fi

uniform float hint_amount;
// Stroke weight. The SDF threshold is what decides how much of the field counts
// as inside, so lowering it dilates every glyph -- continuous synthetic bold, at
// any size, from the one atlas. Needed because a label a few pixels tall has
// strokes about one pixel wide, where coverage varies along the stroke and the
// glyph reads as thin and ragged. 0 is the font as authored.
uniform float weight;
uniform int   u_use_fixed_color;
uniform vec4  u_fixed_color;

// dofs = sdf-value change per screen pixel; hint_amount from the material.
float sdf_alpha( float sdf, float dofs, float horz_scale, float vert_scale, float vgrad ) {
    float hdoffset = mix( dofs * horz_scale, dofs * vert_scale, vgrad );
    float rdoffset = mix( dofs, hdoffset, hint_amount );
    // Clamped so a large weight cannot drag the threshold to zero, which would
    // flood the whole quad rather than embolden the glyph.
    float thr = clamp( 0.5 - weight, 0.05, 0.95 );
    float alpha = smoothstep( thr - rdoffset, thr + rdoffset, sdf );
    alpha = pow( alpha, 1.0 + 0.2 * vgrad * hint_amount );
    return alpha;
}

void main() {
#if (PICK_MODE_UINT)
    // Picking variant. Everything in the #else branch must be excluded, not just
    // skipped with an early return: it references `color`, `material` and
    // `fragUV`, none of which are declared in this variant, so leaving it in
    // fails to compile -- and a program that never links shows up only as
    // GL_INVALID_OPERATION at useProgram and draw, with picking silently empty.
    // No alpha test: the whole box is the pick target, which is what makes it
    // grabbable for dragging.
    objectID = u_UINT_ID;
#else
    if (u_use_fixed_color == 1) {
        color = u_fixed_color;
        return;
    }
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

    // Screen-space gradient of the sampled distance field: the sdf-value change
    // per pixel. Exact under any projection, rotation or anisotropic scale, so
    // it needs no per-vertex probe and behaves identically in SCREEN, WORLD and
    // MIXED modes. The interpolated `doffset` from the vertex shader remains as
    // the analytic alternative.
    //   length() and not fwidth(): fwidth is |dFdx| + |dFdy|, which overstates a
    //   diagonal gradient by up to sqrt(2) and visibly softens diagonal strokes.
    //   The floor guards the flat regions beyond the SDF spread, where the
    //   gradient is zero and smoothstep would get equal edges.
    float dofs = max( length( vec2( dFdx( sdf ), dFdy( sdf ) ) ), 1.0e-4 );

    float salpha = sdf_alpha( sdf, dofs, horz_scale, vert_scale, vgrad );
    if (salpha < 0.05)
        discard;

    color = vec4( material.diffuse, salpha * alpha);

    //vec4 texel = texture(material.texture0, sdf);
    //color = vec4(texel.rgb * material.diffuse, texel.a);
	#fi
#fi
}
