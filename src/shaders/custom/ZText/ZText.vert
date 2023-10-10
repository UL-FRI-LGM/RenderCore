#version 300 es
precision mediump float;

//DEF
//**********************************************************************************************************************
#define TEXT2D_SPACE_WORLD 0.0
#define TEXT2D_SPACE_SCREEN 1.0

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
uniform vec2 offset;
uniform vec2 FinalOffset;

// SDF Uniforms
uniform float sdf_text_size;
uniform float sdf_oo_N_pix_in_char;

in vec2 VPos; // Vertex position (screenspace)
// in float scale;
uniform float scale;

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
        // vec2 VPosNew = VPos + FinalOffset;
        // if(offset.x != 0.0 && offset.y != 0.0)
        // {
        //     VPosNew = VPosNew + offset;
        // }
        vec2 VPosNew = vec2(offset.x + VPos.x/aspect, offset.y + VPos.y);
        //map [0, 1][0, 1] to [-1, 1][-1, 1]
        vec2 VPos_clipspace = 2.0 * VPosNew - vec2(1.0);

        // Vertex position in clip space
        gl_Position = vec4(VPos_clipspace, 0.0, 1.0);

        sdf_size = 2.0 * viewport.y * sdf_text_size * sdf_oo_N_pix_in_char / scale;
    }
    else if (MODE == TEXT2D_SPACE_WORLD) {

        // vec4 VPos_clipspace = MVPMat * vec4(VPos.xy, 0.0, 1.0);
        // vec3 VPos_NDC = VPos_clipspace.xyz / VPos_clipspace.w;
        // gl_Position = vec4(VPos_NDC * VPos_clipspace.w, VPos_clipspace.w);

        vec4 p1 = MVPMat * vec4(VPos.x, VPos.y, 0.0, 1.0);
        vec4 p2 = MVPMat * vec4(VPos.x, VPos.y + 0.1 * sdf_text_size, 0.0, 1.0);

        // WTH? Factor should be 5 (10 / 2 --> from clip to NDC size)! * 1 / scale ???
        sdf_size = 2.0 * viewport.y * 5.0 * length(vec2(p1.x - p2.x, p1.y - p2.y)) * sdf_oo_N_pix_in_char / scale;
        // sdf_size = 2.0 * 100.0 * length(vec2(p1.x - p2.x, p1.y - p2.y)) * sdf_oo_N_pix_in_char;

        gl_Position = p1;
    }

    #if (TEXTURE)
    // Pass-through texture coordinate
    fragUV = uv;
    // float sdf_size = 2.0 * scale * sdf_border_size;
    // Distance field delta in screen pixels
    doffset = 1.0 / sdf_size;
    ivec2 ts = textureSize(material.texture0, 0);
    sdf_texel = vec2(1.0 / float(ts.x), 1.0 / float(ts.y));
    #fi
}
