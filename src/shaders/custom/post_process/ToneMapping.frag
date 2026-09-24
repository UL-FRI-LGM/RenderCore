#version 300 es
precision mediump float;


//DEF
//**********************************************************************************************************************//
#define MODE_REINHARD 0.0
#define MODE_EXPOSURE 1.0
// No tone curve at all: rendered colours pass through and the 8-bit output clamps.
// Note the tone curve only ever sees *rendered* content. The viewport background
// is not tone mapped: cleared pixels hold premultiplied black with alpha 0, and
// the final mix() below returns u_clearColor for them whatever MODE is set to.
// So the cost of a curve is paid by geometry and text, not by the backdrop --
// under MODE_EXPOSURE with exposure 2 a rendered colour c becomes 1-exp(-2c), so
// ROOT's kBlue+2 (0.6) renders as 0.70 and a white object as 0.865.
#define MODE_LINEAR   2.0
// Identity below `knee`, smooth roll-off above it, asymptotic to 1 and never
// clipping. Continuous in value and slope at the knee. This is the only mode that
// is faithful to LDR ROOT colours *and* copes with lit surfaces going over white:
// in event_demo.C the buffer reaches 1.9 with ~32% of lit channels above 1.0,
// so neither a plain clamp nor a curve that bends the whole range will do.
//
// The trade-off is unavoidable: a curve cannot be the identity on [0,1] and also
// map anything above 1 into [0,1] without clipping. `knee` is where you place it.
// At 0.85 every colour up to 0.85 is exact and a pure white object renders 0.945;
// raising the knee buys white fidelity and spends highlight gradient.
#define MODE_KNEE     3.0


struct Material {
    #if (TEXTURE)
        sampler2D texture0; //color texture
    #fi
};


uniform Material material;
uniform vec4 u_clearColor;
uniform float MODE;
uniform float gamma;
uniform float exposure;
uniform float knee;      // MODE_KNEE: colours below this are passed through exactly

// 0: composite over u_clearColor and force alpha to 1 -- what goes to screen.
// 1: keep straight (un-premultiplied) alpha and do NOT composite the background,
//    so the result can be grabbed and placed over any background later.
uniform int u_keep_alpha;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 ldrColor;


//MAIN
//**********************************************************************************************************************//
void main() {
    #if (TEXTURE)
        //FINAL SHADER
        //const float gamma = 2.2;
        //const float exposure = 1.0;
        vec4 hdrColor = texture(material.texture0, fragUV).rgba; //input color
        float alpha = clamp(hdrColor.a, 0.0, 1.0);

        // The scene is blended into a zero-cleared buffer, so rgb arrives
        // premultiplied by coverage. Undo that before tone mapping -- otherwise
        // the tone curve is applied to a coverage-scaled colour and partially
        // covered pixels come out dark.
        //
        // This is needed on BOTH paths, not just for a grabbed image. The screen
        // path finishes with mix(clearColor, mapped, alpha), which is the correct
        // over-operator for a *straight* colour; feeding it a premultiplied one
        // applies coverage twice, so a translucent pixel is composited as
        // bg*(1-a) + a*a*C. The error vanishes at a=0 and a=1 and peaks near
        // a=0.5, which is why it reads as translucent things being muddy rather
        // than as anything obviously broken.
        vec3 src = hdrColor.rgb;
        if (alpha > 0.0)
            src = src / alpha;

        vec3 mapped;
        if (MODE == MODE_REINHARD){
            // reinhard tone mapping
            mapped = src / (src + vec3(1.0));
        }else if (MODE == MODE_EXPOSURE){
            // exposure tone mapping
            mapped = vec3(1.0) - exp(-src * exposure);
        }else if (MODE == MODE_KNEE){
            float k = clamp(knee, 0.0, 0.99);
            float r = 1.0 - k;
            vec3  over = max(src - vec3(k), vec3(0.0));
            // Below the knee this is src; above it, k + r*(1 - exp(-over/r)).
            mapped = min(src, vec3(k)) + r * (vec3(1.0) - exp(-over / r));
        }else{
            // MODE_LINEAR -- pass the colour through untouched (8-bit output clamps)
            mapped = src;
        }
        
        // gamma correction 
        mapped = pow(mapped, vec3(1.0 / gamma));

        if (u_keep_alpha == 1)
            ldrColor = vec4(mapped, alpha);
        else
            ldrColor = vec4(mix(u_clearColor.rgb, mapped, alpha), 1.0);
    #fi
}