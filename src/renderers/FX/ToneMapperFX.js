import { FX } from "./FX.js";
import { CustomShaderMaterial } from "../../materials/CustomShaderMaterial.js";
import { RenderPass } from "./../RenderPass.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


export class ToneMapperFX extends FX {
    static MODE_REINHARD = 0.0;
    static MODE_EXPOSURE = 1.0;

    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);

        this.inputs.color = this.inputs.color ? this.inputs.color : new FX.input("color_in");

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_toneMapped");

        args.mode = args.mode ? args.mode : ToneMapperFX.MODE_REINHARD;
        args.gamma = args.gamma ? args.gamma : 2.2;
        args.exposure = args.exposure ? args.exposure : 1.0;

        this._toneMapping = new CustomShaderMaterial("ToneMapping", {MODE: args.mode, gamma: args.gamma, exposure: args.exposure});
        this._toneMapping.lights = false;
        const toneMapping = this._toneMapping;

        const RenderPass_ToneMapping = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: toneMapping, textures: [textureMap[INPUTS.color.name]]};
            },

            function (textureMap, additionalData) {
            },

            // Target
            RenderPass.TEXTURE,

            // Viewport
            { width: predef_width, height: predef_height },

            // Bind depth texture to this ID
            null,

            [
                {id: OUTPUTS.color.name, textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG}
            ]
        );

        this.pushRenderPass(RenderPass_ToneMapping);
    }

    set mode(mode){
        this._toneMapping.setUniform("MODE", mode)
    }
    set gamma(gamma){
        this._toneMapping.setUniform("gamma", gamma);
    }
    set exposure(exposure){
        this._toneMapping.setUniform("exposure", exposure);
    }
};

