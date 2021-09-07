#version 300 es
precision mediump float;


// The minimum amount of local contrast required to apply algorithm.
//   0.333 - too little (faster)
//   0.250 - low quality
//   0.166 - default
//   0.125 - high quality           //1.0/8.0
//   0.063 - overkill (slower)
#define FXAA_EDGE_THRESHOLD 0.063 //1.0/8.0 //RelativeThreshold
// Trims the algorithm from processing darks.
//   0.0833 - upper limit (default, the start of visible unfiltered edges)
//   0.0625 - high quality (faster)                                             1.0/16.0
//   0.0312 - visible limit (slower)
#define FXAA_EDGE_THRESHOLD_MIN 0.0312 //1.0/16.0 //contrastThreshold

// Choose the amount of sub-pixel aliasing removal. //SubpixelBlending
// This can effect sharpness.
//   1.00 - upper limit (softer)                                        //1.0
//   0.75 - default amount of filtering
//   0.50 - lower limit (sharper, less sub-pixel aliasing removal)
//   0.25 - almost off
//   0.00 - completely off
#define FXAA_SUBPIX_TRIM_SCALE 1.0 //1.0
#define FXAA_SUBPIX_TRIM 1.0/8.0
#define FXAA_SUBPIX_CAP 7.0/8.0

#define FXAA_SEARCH_STEPS uint(10)//EDGE_STEP_COUNT
#define FXAA_SEARCH_ACCELERATION uint(1)
#define FXAA_SEARCH_THRESHOLD 1.0/4.0

//++
#define EDGE_STEPS 1.0, 1.5, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 4.0
//#define EDGE_STEPS 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0
#define EDGE_GUESS_STEP 8.0


struct TextureData {
    ivec2 textureSize;
    vec2 texelSize;
};
struct Material {
    #if (TEXTURE)
        sampler2D texture0; //ORIGINAL (RGBL = RGB + Luma)
    #fi
};
struct LuminanceData {
    float M, N, S, E, W;
    float NW, NE, SW, SE;
    float highest, lowest, contrast;
};
struct EdgeData {
    bool isHorizontal;
    float pixelStep;
    float oppositeLuminance, gradient;
};


uniform Material material;


#if (TEXTURE)
    in vec2 fragUV;
#fi
TextureData texture0Data;
//const vec3 lumaConstant = vec3(0.299, 0.587, 0.114);
const vec3 lumaConstant = vec3(0.3086, 0.6094, 0.0820);
const float[FXAA_SEARCH_STEPS] edgeSteps = float[FXAA_SEARCH_STEPS](EDGE_STEPS);

out vec4 color;


/*float FXAA_luma(vec2 color){
    return color.y * (0.587/0.299) + color.x;
}
vec4 FXAA_luma2(vec4 color){
    vec3 lumaConstant = vec3(0.299, 0.587, 0.114);

    color.a = dot(color.rgb, lumaConstant);

    return color; 

}*/
vec4 SampleTex(vec2 uv){//sample
    //return texture(material.texture0, uv).rgba;
    return textureLod(material.texture0, uv, 0.0).rgba;
}
float RGBToLuminance(vec3 RGBSample){
    //Luminance Conversion
    //vec3 lumaConstant = vec3(0.299, 0.587, 0.114);
    vec3 saturatedRGBSample = clamp(RGBSample, 0.0, 1.0);

    return dot(saturatedRGBSample, lumaConstant);
}
float SampleLuminance(vec2 uv){
    //TODO FLAGS
    //return RGBToLuminance(SampleTex(uv).rgb);
    return SampleTex(uv).a;
}
float SampleLuminance(vec2 uv, float uOffset, float vOffset){
    vec2 texelSize = texture0Data.texelSize;

    uv = uv + texelSize * vec2(uOffset, vOffset);
    return SampleLuminance(uv);
}
LuminanceData SampleLuminanceNeighbourhood(vec2 uv){
    //Local Contrast Check (edge detection)
    LuminanceData ld;

    ld.M = SampleLuminance(uv);

    ld.N = SampleLuminance(uv, +0.0, +1.0);
    ld.S = SampleLuminance(uv, +0.0, -1.0);
    ld.E = SampleLuminance(uv, +1.0, +0.0);
    ld.W = SampleLuminance(uv, -1.0, +0.0);

    ld.NW = SampleLuminance(uv, -1.0, +1.0);
    ld.NE = SampleLuminance(uv, +1.0, +1.0);
    ld.SW = SampleLuminance(uv, -1.0, -1.0);
    ld.SE = SampleLuminance(uv, +1.0, -1.0);

    ld.highest = max(ld.M, max(max(ld.N, ld.S), max(ld.E, ld.W)));
    ld.lowest = min(ld.M, min(min(ld.N, ld.S), min(ld.E, ld.W)));
    ld.contrast = ld.highest - ld.lowest;

    return ld;
}
bool SkipPixel(LuminanceData ld){
    float threshold = max(FXAA_EDGE_THRESHOLD_MIN, ld.highest * FXAA_EDGE_THRESHOLD);
    return ld.contrast < threshold;
}
float DeterminePixelBlendFactor(LuminanceData ld){
    //Sub-pixel Aliasing Test
    float kernel = 2.0 * (ld.N + ld.S + ld.E + ld.W);
    kernel = kernel + ld.NW + ld.NE + ld.SW + ld.SE;
    kernel = kernel/12.0;// == low pass filter
    //return kernel; //low pass on high contrast regions

    kernel = abs(kernel - ld.M); //== high pass filter
    //return kernel; //high pass filter
    kernel = clamp(kernel / ld.contrast, 0.0, 1.0);
    //return kernel; //normalized filter;

    float blendFactor = smoothstep(0.0, 1.0, kernel);

    return blendFactor * blendFactor * FXAA_SUBPIX_TRIM_SCALE;
}
EdgeData DetermineEdge(LuminanceData ld){
    vec2 texelSize = texture0Data.texelSize;
    EdgeData ed;

    float horizontal =
        abs(ld.N + ld.S - 2.0 * ld.M) * 2.0 +
        abs(ld.NE + ld.SE - 2.0 * ld.E) +
        abs(ld.NW + ld.SW - 2.0 * ld.W);
    float vertical =
        abs(ld.E + ld.W - 2.0 * ld.M) * 2.0 +
        abs(ld.NE + ld.NW - 2.0 * ld.N) +
        abs(ld.SE + ld.SW - 2.0 * ld.S);
    ed.isHorizontal = horizontal >= vertical;

    ed.pixelStep = ed.isHorizontal ? texelSize.y : texelSize.x;

    float pLuminance = ed.isHorizontal ? ld.N : ld.E;
    float nLuminance = ed.isHorizontal ? ld.S : ld.W;
    float pGradient = abs(pLuminance - ld.M);
    float nGradient = abs(nLuminance - ld.M);

    if(pGradient < nGradient){
        ed.pixelStep = -ed.pixelStep;

        ed.oppositeLuminance = nLuminance;
        ed.gradient = nGradient;
    }else{
        ed.oppositeLuminance = pLuminance;
        ed.gradient = pGradient;
    }
    
    return ed;
}
float DetermineEdgeBlendFactor(LuminanceData ld, EdgeData ed, vec2 uv){
    vec2 texelSize = texture0Data.texelSize;
    vec2 edgeUV = uv;
    vec2 edgeStep;

    if(ed.isHorizontal){
        edgeUV.y = edgeUV.y + ed.pixelStep * 0.5;
        edgeStep = vec2(texelSize.x, 0.0);
    }else{
        edgeUV.x = edgeUV.x + ed.pixelStep * 0.5;
        edgeStep = vec2(0.0, texelSize.y);
    }

    float edgeLuminance = (ld.M + ed.oppositeLuminance) * 0.5;
    float gradientThreshold = ed.gradient * 0.25;

    vec2 puv = edgeUV + edgeStep * edgeSteps[0];
    float pLuminanceDelta = SampleLuminance(puv) - edgeLuminance;
    bool pAtEnd = abs(pLuminanceDelta) >= gradientThreshold;

    for (uint i = uint(1); i < FXAA_SEARCH_STEPS && !pAtEnd; i++) {
        puv += edgeStep * edgeSteps[i];
        pLuminanceDelta = SampleLuminance(puv) - edgeLuminance;
        pAtEnd = abs(pLuminanceDelta) >= gradientThreshold;
    }
    /*#for i in 1 to ##FXAA_SEARCH_STEPS
        if(!pAtEnd){
        puv += edgeStep * edgeSteps[##i];
        pLuminanceDelta = SampleLuminance(puv) - edgeLuminance;
        pAtEnd = abs(pLuminanceDelta) >= gradientThreshold;
        }
    #end*/
    if(!pAtEnd){
        puv += edgeStep * EDGE_GUESS_STEP;
    }

    vec2 nuv = edgeUV - edgeStep * edgeSteps[0];
    float nLuminanceDelta = SampleLuminance(nuv) - edgeLuminance;
    bool nAtEnd = abs(nLuminanceDelta) >= gradientThreshold;

    for (uint i = uint(1); i < FXAA_SEARCH_STEPS && !nAtEnd; i++) {
        nuv -= edgeStep * edgeSteps[i];
        nLuminanceDelta = SampleLuminance(nuv) - edgeLuminance;
        nAtEnd = abs(nLuminanceDelta) >= gradientThreshold;
    }
    /*#for i in 1 to ##FXAA_SEARCH_STEPS
        if(!nAtEnd){
        nuv -= edgeStep * edgeSteps[##i];
        nLuminanceDelta = SampleLuminance(nuv) - edgeLuminance;
        nAtEnd = abs(nLuminanceDelta) >= gradientThreshold;
        }
    #end*/
    if(!nAtEnd){
        nuv -= edgeStep * EDGE_GUESS_STEP;
    }

    float pDistance;
    float nDistance;
    if(ed.isHorizontal){
        pDistance = puv.x - uv.x;
        nDistance = uv.x - nuv.x;
    }else{
        pDistance = puv.y - uv.y;
        nDistance = uv.y - nuv.y;
    }

    float shortestDistance;
    bool deltaSign;
    if(pDistance <= nDistance){
        shortestDistance = pDistance;
        deltaSign = pLuminanceDelta >= 0.0;
    }else{
        shortestDistance = nDistance;
        deltaSign = nLuminanceDelta >= 0.0;
    }

    if(deltaSign == (ld.M - edgeLuminance >= 0.0)){
        return 0.0;
    }


    return 0.5 - shortestDistance / (pDistance + nDistance); //blend more at the ends of the edge
}
vec4 ApplyFXAA(vec2 uv){
    //FXAA works by blending high-contrast pixels.
    //This is not a straightforward blurring of the image.
    //First, the local contrast has to be calculated.
    //Second—if there is enough contrast—a blend factor has to be chosen based on the contrast.
    //Third, the local contrast gradient has to be investigated to determine a blend direction.
    //Finally, a blend is performed between the original pixel and one of its neighbors.


    //Luma conversion
    LuminanceData ld = SampleLuminanceNeighbourhood(uv);
    ///return vec4(vec3(SampleTex(uv).g), 1.0); //luma as green
    ///return vec4(vec3(SampleTex(uv).a), 1.0); //luma as alpha
    ///return vec4(vec3(ld.M), 1.0); //lumas as any
    ///return vec4(vec3(ld.contrast), 1.0); //contrast
    if(SkipPixel(ld)) {
        ///return vec4(0.0, 0.0, 0.0, 1.0); //skipped 
        return SampleTex(uv);
    }
    ///return vec4(vec3(ld.contrast), 1.0); //contrast skipped


    float pixelBlend = DeterminePixelBlendFactor(ld);
    ///return vec4(vec3(pixelBlend), 1.0); //low pass on high contrast regions//high pass on high contrast regions//blend factor

    EdgeData ed = DetermineEdge(ld);
    //return ed.isHorizontal ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(1.0, 1.0, 1.0, 1.0); //horizontal vs veertical edges
    //return ed.pixelStep < 0.0 ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(1.0, 1.0, 1.0, 1.0); //pos/neg blend

    float edgeBlend = DetermineEdgeBlendFactor(ld, ed, uv);
    ///return vec4(vec3(ed.gradient), 1.0); //edge gradients
    ///return vec4(vec3(edgeBlend), 1.0); //edge blend factor
    float finalBlend = max(pixelBlend, edgeBlend);


    if(ed.isHorizontal){
        uv.y = uv.y + ed.pixelStep * finalBlend;
    }else{
        uv.x = uv.x + ed.pixelStep * finalBlend;
    }


    return SampleTex(uv);
}

void main() {
	#if (TEXTURE)
        texture0Data.textureSize = textureSize(material.texture0, 0);
        texture0Data.texelSize = 1.0 / vec2(texture0Data.textureSize.x, texture0Data.textureSize.y);


        color = vec4(ApplyFXAA(fragUV).rgb, 1.0);


        /*float border = float(texture0Data.textureSize.x) / 2.0;
        if(gl_FragCoord.x < border - 2.0){

            color = vec4(ApplyFXAA(fragUV).rgb, 1.0);

        }else if(gl_FragCoord.x > border + 2.0){

            color = vec4(texture(material.texture0, fragUV).rgb, 1.0);

        }else{

            color = vec4(0.5, 0.5, 0.5, 1.0);

        }*/
        

        //ORIGINAL VERSION
        /*ivec2 textureSize = textureSize(material.texture0, 0);
        float texelSizeX = 1.0 / float(textureSize.x);
        float texelSizeY = 1.0 / float(textureSize.y);

        vec2 NUV = fragUV + vec2(0.0, +texelSizeY);
        vec2 SUV = fragUV + vec2(0.0, -texelSizeY);  
        vec2 EUV = fragUV + vec2(+texelSizeX, 0.0);
        vec2 WUV = fragUV + vec2(-texelSizeX, 0.0);*/


        //Luminance Conversion
        //float luma = FXAA_luma(texture(material.texture0, fragUV).rg);
        //float luma = RGBToLuminance(SampleTex(fragUV).rgb);//todo pre pass optimization luma
        ///color = vec4(vec3(luma), SampleTex(fragUV).a);


        //Local Contrast Check (edge detection)
        /*vec4 rgbN  = texture(material.texture0, NUV).rgba;//3!!
        vec4 rgbS  = texture(material.texture0, SUV).rgba;
        vec4 rgbE  = texture(material.texture0, EUV).rgba;
        vec4 rgbW  = texture(material.texture0, WUV).rgba;
        vec4 rgbM  = texture(material.texture0, fragUV).rgba;

        float lumaN  = FXAA_luma(rgbN.rg);
        float lumaS  = FXAA_luma(rgbS.rg);
        float lumaE  = FXAA_luma(rgbE.rg);
        float lumaW  = FXAA_luma(rgbW.rg);
        float lumaM  = FXAA_luma(rgbM.rg);

        float rangeMin = min(lumaM, min(min(lumaN, lumaW), min(lumaS, lumaE)));
        float rangeMax = max(lumaM, max(max(lumaN, lumaW), max(lumaS, lumaE)));
        float range = rangeMax - rangeMin;
        if(range < max(FXAA_EDGE_THRESHOLD_MIN, rangeMax * FXAA_EDGE_THRESHOLD)) {
            color = rgbM;
            return;
        }else{
            color = FXAA_luma2(rgbM);
        }*/


        //Sub-pixel Aliasing Test
        /*float lumaL = (lumaN + lumaS + lumaE + lumaW) * 0.25; // = x/4
        float rangeL = abs(lumaL - lumaM);
        float blendL = max(0.0, (rangeL / range) - FXAA_SUBPIX_TRIM) * FXAA_SUBPIX_TRIM_SCALE; 
        blendL = min(FXAA_SUBPIX_CAP, blendL);

        vec4 rgbL = rgbN + rgbS + rgbE + rgbW + rgbM;//3!!
        // ...

        vec2 NWUV = fragUV + vec2(-texelSizeX, +texelSizeY);
        vec2 NEUV = fragUV + vec2(+texelSizeX, +texelSizeY);  
        vec2 SWUV = fragUV + vec2(-texelSizeX, -texelSizeY);
        vec2 SEUV = fragUV + vec2(+texelSizeX, -texelSizeY);

        vec4 rgbNW = texture(material.texture0, NWUV).rgba;//3!!
        vec4 rgbNE = texture(material.texture0, NEUV).rgba;
        vec4 rgbSW = texture(material.texture0, SWUV).rgba;
        vec4 rgbSE = texture(material.texture0, SEUV).rgba;

        float lumaNW  = FXAA_luma(rgbNW.rg);
        float lumaNE = FXAA_luma(rgbNE.rg);
        float lumaSW = FXAA_luma(rgbSW.rg);
        float lumaSE = FXAA_luma(rgbSE.rg);

        rgbL += (rgbNW + rgbNE + rgbSW + rgbSE);
        rgbL *= vec4(1.0/9.0);//3!!


        //Vertical/Horizontal Edge Test
        float edgeVert = abs((0.25 * lumaNW) + (-0.5 * lumaN) + (0.25 * lumaNE)) +
                         abs((0.50 * lumaW ) + (-1.0 * lumaM) + (0.50 * lumaE )) +
                         abs((0.25 * lumaSW) + (-0.5 * lumaS) + (0.25 * lumaSE));
        float edgeHorz = abs((0.25 * lumaNW) + (-0.5 * lumaW) + (0.25 * lumaSW)) +
                         abs((0.50 * lumaN ) + (-1.0 * lumaM) + (0.50 * lumaS )) +
                         abs((0.25 * lumaNE) + (-0.5 * lumaE) + (0.25 * lumaSE));
        bool horzSpan = edgeHorz >= edgeVert;


        //End-of-edge Search
        bool doneN, doneP;
        float lumaEndN, lumaEndP;
        vec2 posN, posP;
        vec2 offNP = vec2(1.0, 1.0);

        posN = fragUV;
        posP = fragUV;
        float lumaPos = horzSpan ? lumaN : lumaE;
        float lumaNeg = horzSpan ? lumaS : lumaW;
        float gradientP = abs(lumaPos - lumaM);
        float gradientN = abs(lumaNeg - lumaM);
        float gradient = max(gradientP, gradientN)/4.0;

        for(uint i = uint(0); i < FXAA_SEARCH_STEPS; i++) {
            if (FXAA_SEARCH_ACCELERATION == uint(1)){
                if(!doneN) lumaEndN = FXAA_luma(texture(material.texture0, posN.xy).rg);
                if(!doneP) lumaEndP = FXAA_luma(texture(material.texture0, posP.xy).rg);
            }else{
                //if(!doneN) lumaEndN = FXAA_luma(textureGrad(material.texture0, posN.xy, offNP).rg);
                //if(!doneP) lumaEndP = FXAA_luma(textureGrad(material.texture0, posP.xy, offNP).rg);
            }
            
            doneN = doneN || (abs(lumaEndN - lumaNeg) >= gradientN);
            doneP = doneP || (abs(lumaEndP - lumaPos) >= gradientP);
            if(doneN && doneP) break;
            if(!doneN) posN -= offNP;
            if(!doneP) posP += offNP;
        }


        float distanceP = posP - fragUV;
        float distnaceN = fragUV - posN;
        float shortestDistance = min(distanceP, distnaceN);
        //Apply color
        float pixelOffset = -shortestDistance/(distanceP + distnaceN) + 0.5;*/
	#fi
}

