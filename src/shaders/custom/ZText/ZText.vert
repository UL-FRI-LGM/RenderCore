#version 300 es
precision highp float;

//DEF
//**********************************************************************************************************************
#define TEXT2D_SPACE_WORLD 0.0
#define TEXT2D_SPACE_SCREEN 1.0
#define TEXT2D_SPACE_MIXED 2.0
#define TEXT2D_SPACE_ANCHOR 3.0

#if (TEXTURE)
struct Material {
    vec3 diffuse;
    sampler2D texture0; //FONT TEXTURE
};

uniform Material material;
in vec2 uv;  // Texture coordinate
#fi

// UIO
//**********************************************************************************************************************
uniform mat4 MVPMat;
uniform float aspect;
uniform vec2 viewport;
uniform float MODE;
uniform vec2 offset;   // screen position of the text box, in (0,1) coordinates

// SDF Uniforms
uniform float sdf_text_size;
uniform float sdf_oo_N_pix_in_char;

in vec2 VPos; // Vertex position (screenspace)
// in float scale;
uniform float scale;

#if (ANCHOR3D)
// Per-vertex 3D anchor: the world point this vertex hangs off. VPos is then a
// screen-space offset from that point, exactly as in MIXED mode -- only the
// anchor is per vertex instead of per object, which is what lets one mesh hold
// a whole 3D axis (lines, ticks and glyphs) in a single buffer.
in vec3 anchor;

// Size attenuation. atten = 0 keeps every offset the same size in pixels no
// matter how far the anchor is; atten = 1 shrinks it exactly like geometry;
// in between is the readable compromise. w_ref is the clip-space w of the
// reference point the nominal size is defined at -- under an orthographic
// camera every w is 1, so the whole term collapses to 1 and attenuation
// correctly does nothing.
uniform float atten;
uniform float w_ref;
#fi

// Output quad texture coordinates
out vec2 fragUV;

//out SDF
out float doffset;
flat out vec2 sdf_texel;

void main()
{
    float sdf_size;

    if (MODE == TEXT2D_SPACE_SCREEN)
    {
        vec2 VPosNew = vec2(offset.x + VPos.x/aspect, offset.y + VPos.y);
        //map [0, 1][0, 1] to [-1, 1][-1, 1]
        vec2 VPos_clipspace = 2.0 * VPosNew - vec2(1.0);

        // Vertex position in clip space
        gl_Position = vec4(VPos_clipspace, 0.0, 1.0);

        sdf_size = 2.0 * viewport.y * sdf_text_size * sdf_oo_N_pix_in_char;
    }
    else if (MODE == TEXT2D_SPACE_WORLD)
    {
        // vec4 VPos_clipspace = MVPMat * vec4(VPos.xy, 0.0, 1.0);
        // vec3 VPos_NDC = VPos_clipspace.xyz / VPos_clipspace.w;
        // gl_Position = vec4(VPos_NDC * VPos_clipspace.w, VPos_clipspace.w);

        vec4 p1 = MVPMat * vec4(VPos.x, VPos.y, 0.0, 1.0);
        vec4 p2 = MVPMat * vec4(VPos.x, VPos.y + 0.1 * sdf_text_size, 0.0, 1.0);
        gl_Position = p1;

        // The probe p2 is offset by 0.1 * sdf_text_size in object space, so the
        // factor is 2 (full sdf value range) * 0.5 * viewport.y (NDC -> pixels)
        // / 0.1 (probe length) = 10. The probe has to be measured in NDC, i.e.
        // after the perspective divide; using clip-space deltas made this wrong
        // by a factor of w -- distance-dependent under perspective, and a
        // constant collapse under ortho, where w == 1.
        float w1 = abs(p1.w) < 1e-6 ? 1e-6 : p1.w;
        float w2 = abs(p2.w) < 1e-6 ? 1e-6 : p2.w;
        vec2 dndc = p2.xy / w2 - p1.xy / w1;
        sdf_size = 10.0 * viewport.y * length(dndc) * sdf_oo_N_pix_in_char;
    }
    else if (MODE == TEXT2D_SPACE_MIXED)
    {
        vec4 orig_clip = MVPMat * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 orig_scrn = 0.5 * (orig_clip.xy / orig_clip.w + vec2(1.0));
        // vec2 VPos_scrn = vec2(offset.x + VPos.x/aspect, offset.y + VPos.y);
        vec2 VPos_scrn = vec2(orig_scrn.x + offset.x + VPos.x/aspect,
                              orig_scrn.y + offset.y + VPos.y);
        vec2 VPos_clip = orig_clip.w * (2.0 * VPos_scrn - vec2(1.0));
        gl_Position = vec4(VPos_clip, orig_clip.z, orig_clip.w);
        // gl_Position = vec4(orig.x + VPos_clip.x, orig.y + VPos_clip.y, orig.z, 1.0);

        sdf_size = 2.0 * viewport.y * sdf_text_size * sdf_oo_N_pix_in_char;
    }
#if (ANCHOR3D)
    else if (MODE == TEXT2D_SPACE_ANCHOR)
    {
        vec4 a_clip = MVPMat * vec4(anchor, 1.0);

        // Behind the camera: w <= 0 turns the perspective divide inside out and
        // the offset would be mirrored across the viewport rather than clipped.
        // Send the vertex somewhere the clipper will certainly discard.
        if (a_clip.w <= 0.0)
        {
            gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
            sdf_size = 1.0;
        }
        else
        {
            vec2 a_scrn = 0.5 * (a_clip.xy / a_clip.w + vec2(1.0));
            float s = pow(w_ref / a_clip.w, atten);
            vec2 VPos_scrn = a_scrn + s * vec2(VPos.x / aspect, VPos.y);
            vec2 VPos_clip = a_clip.w * (2.0 * VPos_scrn - vec2(1.0));

            // Depth is CLAMPED into the frustum rather than allowed to clip.
            //
            // An axis annotates a scene from just outside it, so its anchors
            // sit beyond the bounding box the near and far planes are fitted
            // to -- and those planes are fitted tightly on purpose, to spend
            // the whole z-buffer on the scene. Widening them to admit the
            // labels would pay for a few text anchors with the depth precision
            // of everything else.
            //
            // So a label outside the frustum is pinned just inside the nearer
            // plane instead of vanishing. Inside the frustum the depth is
            // exact, so it still occludes and is occluded correctly; only past
            // the planes does it flatten, which is where the alternative was
            // not drawing it at all. All six vertices of a glyph share the
            // anchor's z and w, so the clamp cannot skew a quad.
            float ndc_z = clamp(a_clip.z / a_clip.w, -0.999, 0.999);
            gl_Position = vec4(VPos_clip, ndc_z * a_clip.w, a_clip.w);

            // s belongs here too: the SDF smoothing width is in glyph pixels, so
            // an attenuated glyph that kept the unattenuated sdf_size would be
            // antialiased for a size it is not drawn at -- soft when shrunk,
            // hard-edged when enlarged.
            sdf_size = 2.0 * viewport.y * sdf_text_size * s * sdf_oo_N_pix_in_char;
        }
    }
#fi

    #if (TEXTURE)
    // Pass-through texture coordinate
    fragUV = uv;
    // float sdf_size = 2.0 * scale * sdf_border_size;
    // Distance field delta in screen pixels
    doffset = 1.0 / max(sdf_size, 1e-4);
    ivec2 ts = textureSize(material.texture0, 0);
    sdf_texel = vec2(1.0 / float(ts.x), 1.0 / float(ts.y));
    #fi
}

// NOTES:
// - SCREEN - what should be z_clip? Set as offset.z?
// - WORLD - should take into account w_clip to calculate sdf_size?
// - WORLD - Why doesn't this work with ortho
// - FinalOffset is gone; `offset` is the position (done).
