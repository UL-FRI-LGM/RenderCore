import { FX } from "./FX.js"
import { HIGHPASS_MODE_BRIGHTNESS, HIGHPASS_MODE_DIFFERENCE } from "../../constants.js";
import { CustomShaderMaterial } from "../../materials/CustomShaderMaterial.js";
import { RenderPass } from "./../RenderPass.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


export class BloomFX extends FX {
    static MODE_BRIGHTNESS = 1;
    static MODE_DIFFERENCE = 2;

    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);

        this.inputs.color = this.inputs.color ? this.inputs.color : new FX.input("color_out");

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_bloom");

        args.mode = args.mode ? args.mode : BloomFX.MODE_BRIGHTNESS;
        args.targetColor = args.targetColor ? args.targetColor : [0.2126, 0.7152, 0.0722];
        args.threshold = args.threshold ? args.threshold : 0.75;
        args.power = args.power ? args.power : 1.0;

        args.size = args.size ? args.size : 4;
        args.separation = args.separation ? args.separation : 2.0;
        args.minThreshold = args.minThreshold ? args.minThreshold : 0.125;
        args.maxThreshold = args.maxThreshold ? args.maxThreshold : 0.25;

        this._hp = (args.mode === BloomFX.MODE_BRIGHTNESS)
            ? new CustomShaderMaterial("highPass", {MODE: HIGHPASS_MODE_BRIGHTNESS, targetColor: args.targetColor, threshold: args.threshold})
            : new CustomShaderMaterial("highPass", {MODE: HIGHPASS_MODE_DIFFERENCE, targetColor: args.targetColor, threshold: args.threshold});
        this._hp.lights = false;
        const hp = this._hp;

        this._dilation = new CustomShaderMaterial("dilation", {size: args.size, separation: args.separation, minThreshold: args.minThreshold, maxThreshold: args.maxThreshold});
        this._dilation.lights = false;
        const dilation = this._dilation;
        this._gbh = new CustomShaderMaterial("gaussBlur", {horizontal: true, power: args.power});
        this._gbh.lights = false;
        const gbh = this._gbh;
        this._gbv = new CustomShaderMaterial("gaussBlur", {horizontal: false, power: args.power});
        this._gbv.lights = false;
        const gbv = this._gbv;

        this._bloom = new CustomShaderMaterial("bloom");
        this._bloom.lights = false;
        const bloom = this._bloom;


        const RenderPass_HighPass = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: hp, textures: [textureMap[INPUTS.color.name]]};
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
                {id: "high_pass", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );

        const RenderPass_Dilation = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: dilation, textures: [textureMap[INPUTS.color.name]]};
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
                {id: "dilation", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );

        const RenderPass_GaussH = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: gbh, textures: [textureMap["high_pass"]]};
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
                {id: "gauss_h", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );

        const RenderPass_GaussV = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: gbv, textures: [textureMap["gauss_h"]]};
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
                {id: "gauss_hv", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );

        const RenderPass_Bloom = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: bloom, textures: [textureMap["gauss_hv"], textureMap[INPUTS.color.name]]};
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


        this.pushRenderPass(RenderPass_HighPass);

        this.pushRenderPass(RenderPass_GaussH);
        this.pushRenderPass(RenderPass_GaussV);

        this.pushRenderPass(RenderPass_Bloom);
    }



    get highPass(){
        return this._hp;
    }

    set mode(mode){
        this._hp.setUniform("MODE", mode);
    }
    set targetColor(targetColor){
        this._hp.setUniform("targetColor", targetColor)
    }
    set threshold(threshold){
        this._hp.setUniform("threshold", threshold);
    }
    set power(power){
        this._gbh.setUniform("power", power);
        this._gbv.setUniform("power", power);
    }

};

