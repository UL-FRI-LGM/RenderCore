import { FX } from "./FX.js"
import { HIGHPASS_MODE_BRIGHTNESS, HIGHPASS_MODE_DIFFERENCE } from "../../constants.js";
import { CustomShaderMaterial } from "../../materials/CustomShaderMaterial.js";
import { RenderPass } from "./../RenderPass.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


export class DoFFX extends FX {
    static MODE_DILATION = 1;
    static MODE_BLUR = 2;

    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);

        this.inputs.color = this.inputs.color ? this.inputs.color : new FX.input("color_out");
        this.inputs.position = this.inputs.position ? this.inputs.position : new FX.input("vertexPos");

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_DoF");

        args.minDistance = args.minDistance ? args.minDistance : 2.0;
        args.maxDistance = args.maxDistance ? args.maxDistance : 8.0;
        args.power = args.power ? args.power : 1.0;

        args.size = args.size ? args.size : 4;
        args.separation = args.separation ? args.separation : 2.0;
        args.minThreshold = args.minThreshold ? args.minThreshold : 0.125;
        args.maxThreshold = args.maxThreshold ? args.maxThreshold : 0.25;

        this._dilation = new CustomShaderMaterial("dilation", {size: args.size, separation: args.separation, minThreshold: args.minThreshold, maxThreshold: args.maxThreshold});
        this._dilation.lights = false;
        const dilation = this._dilation;
        this._gbh = new CustomShaderMaterial("gaussBlur", {horizontal: true, power: args.power});
        this._gbh.lights = false;
        const gbh = this._gbh;
        this._gbv = new CustomShaderMaterial("gaussBlur", {horizontal: false, power: args.power});
        this._gbv.lights = false;
        const gbv = this._gbv;

        this._DoF = new CustomShaderMaterial("DoF", {minDistance: args.minDistance, maxDistance: args.maxDistance});
        this._DoF.lights = false;
        const DoF = this._DoF;

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
                return {material: gbh, textures: [textureMap[INPUTS.color.name]]};
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

        const RenderPass_DoF = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {
                    material: DoF,
                    textures: [
                        textureMap[INPUTS.color.name],
                        // textureMap["dilation"],
                        textureMap["gauss_hv"],
                        textureMap[INPUTS.position.name]
                    ]
                };
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

        const RenderPass_ChromaticAberration = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: chromaticAberration, textures: [textureMap[INPUTS.color.name]]};
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


        // this.pushRenderPass(RenderPass_Dilation);
        this.pushRenderPass(RenderPass_GaussH);
        this.pushRenderPass(RenderPass_GaussV);

        this.pushRenderPass(RenderPass_DoF);
    }

    set power(power){
        this._gbh.setUniform("power", power);
        this._gbv.setUniform("power", power);
    }

    set minDistance(minDistance){
        this._DoF.setUniform("minDistance", minDistance);
    }

    set maxDistance(maxDistance){
        this._DoF.setUniform("maxDistance", maxDistance);
    }
};

