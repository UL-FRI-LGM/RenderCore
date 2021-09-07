import { FX } from "./FX.js"
import { HIGHPASS_MODE_BRIGHTNESS, HIGHPASS_MODE_DIFFERENCE } from "../../constants.js";
import { CustomShaderMaterial } from "../../materials/CustomShaderMaterial.js";
import { RenderPass } from "./../RenderPass.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


export class FXAAFX extends FX {

    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);

        this.inputs.color = this.inputs.color ? this.inputs.color : new FX.input("color_out");

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_fxaa");

        this._lumaConversion = new CustomShaderMaterial("lumaConversion");
        this._lumaConversion.lights = false;
        const lumaConversion = this._lumaConversion;

        this._FXAA = new CustomShaderMaterial("FXAA");
        this._FXAA.lights = false;
        const FXAA = this._FXAA;


        const RenderPass_FXAALumaConversion = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: lumaConversion, textures: [textureMap[INPUTS.color.name]]};
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
                {id: "RGBL", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );

        const RenderPass_FXAARender = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: FXAA, textures: [textureMap["RGBL"]]};
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
                {id: OUTPUTS.color.name, textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );

        this.pushRenderPass(RenderPass_FXAALumaConversion);
        this.pushRenderPass(RenderPass_FXAARender);
    }

};

