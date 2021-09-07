import { FX } from "./FX.js"
import { CustomShaderMaterial } from "../../materials/CustomShaderMaterial.js";
import { IcoSphere } from "../../objects/IcoSphere.js";
import { Text2D } from "../../objects/Text2D.js";
import { RenderPass } from "./../RenderPass.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


export class SSAAFX extends FX {
    static MODE_AVERAGE = 0;
    static MODE_LERP = 1;
    static MODE_KERNEL = 2;

    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);


        this.inputs.scene = this.inputs.scene ? this.inputs.scene : undefined;
        this.inputs.camera = this.inputs.camera ? this.inputs.camera : undefined;
        this.inputs.color = this.inputs.color ? this.inputs.color : new FX.input("color_in");

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_out");

        args.SSAA = args.SSAA ? args.SSAA : 2;
        args.seperable = args.seperable ? args.seperable : false;
        args.mode = args.mode ? args.mode : SSAAFX.MODE_AVERAGE;
        args.jitter = args.jitter ? args.jitter : false;

        this.SB = "SSAAx" + args.SSAA;

        this._SSAA_LERP = new CustomShaderMaterial("copyTexture");
        this._SSAA_LERP.lights = false;
        const SSAA_LERP = this._SSAA_LERP;

        this._SSAA = new CustomShaderMaterial("SSAA", {SSAA_N: args.SSAA, MODE: args.mode, JITTER: args.jitter, horizontal: true});
        this._SSAA.lights = false;
        this._SSAA.addSBFlag("KERNEL_BOX");
        this._SSAA.addSBFlag("SSAAx" + args.SSAA);
        const SSAA = this._SSAA;

        this._SSAA_horizontal = new CustomShaderMaterial("SSAA", {SSAA_N: args.SSAA, MODE: args.mode, JITTER: args.jitter, horizontal: true});
        this._SSAA_horizontal.lights = false;
        this._SSAA_horizontal.addSBFlag("SEPERABLE");
        this._SSAA_horizontal.addSBFlag("KERNEL_BOX");
        this._SSAA_horizontal.addSBFlag("SSAAx" + args.SSAA);
        this._SSAA_horizontal.addSBValue("SSAA_N", args.SSAA);
        const SSAA_horizontal = this._SSAA_horizontal;
        this._SSAA_vertical = new CustomShaderMaterial("SSAA", {SSAA_N: args.SSAA, MODE: args.mode, JITTER: args.jitter, horizontal: false});
        this._SSAA_vertical.lights = false;
        this._SSAA_vertical.addSBFlag("SEPERABLE");
        this._SSAA_vertical.addSBFlag("KERNEL_BOX");
        this._SSAA_vertical.addSBFlag("SSAAx" + args.SSAA);
        this._SSAA_vertical.addSBValue("SSAA_N", args.SSAA);
        const SSAA_vertical = this._SSAA_vertical;


        const OriginalMats = {};

        this.RenderPass_MainSSAASupersample = new RenderPass(
            // Rendering pass type
            RenderPass.BASIC,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return { scene: INPUTS.scene, camera: INPUTS.camera };
            },

            function (textureMap, additionalData) {
            },

            // Target
            RenderPass.TEXTURE,

            // Viewport
            { width: predef_width*args.SSAA, height: predef_height*args.SSAA },

            // Bind depth texture to this ID
            "depthMAIN",

            [
                {id: "color_supersample", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
            ]
        );

        //LERP DOWNSAMPLE
        const RenderPass_SSAA_LERP_Downsample = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: SSAA_LERP, textures: [textureMap["color_supersample"]]};
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

        //TRUE DOWNSAMPLE
        this.RenderPass_SSAADownsample = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: SSAA, textures: [textureMap["color_supersample"]]};
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

        this.RenderPass_SSAA_horizontal = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: SSAA_horizontal, textures: [textureMap["color_supersample"]]};
            },

            function (textureMap, additionalData) {
            },

            // Target
            RenderPass.TEXTURE,

            // Viewport
            { width: predef_width*1, height: predef_height*args.SSAA },

            // Bind depth texture to this ID
            null,

            [
                {id: "color_ssaa_horizontal", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );

        this.RenderPass_SSAA_vertical = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: SSAA_vertical, textures: [textureMap["color_ssaa_horizontal"]]};
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


        this.pushRenderPass(this.RenderPass_MainSSAASupersample);
        if(args.seperable === false){
            this.pushRenderPass(this.RenderPass_SSAADownsample);
        }else{
            this.pushRenderPass(this.RenderPass_SSAA_vertical);
            this.pushRenderPass(this.RenderPass_SSAA_horizontal);
        }
    }


    set SSAA(SSAA){

        this._SSAA.rmSBFlag(this.SB);
        this._SSAA.setUniform("SSAA_N", SSAA);
        this._SSAA.addSBFlag("SSAAx" + SSAA);

        this._SSAA_horizontal.rmSBFlag(this.SB);
        this._SSAA_horizontal.setUniform("SSAA_N", SSAA);
        this._SSAA_horizontal.addSBFlag("SSAAx" + SSAA);
        this._SSAA_horizontal.addSBValue("SSAA_N", SSAA);

        this._SSAA_vertical.rmSBFlag(this.SB);
        this._SSAA_vertical.setUniform("SSAA_N", SSAA);
        this._SSAA_vertical.addSBFlag("SSAAx" + SSAA);
        this._SSAA_vertical.addSBValue("SSAA_N", SSAA);


        this.SB = "SSAAx" + SSAA;


        this.RenderPass_MainSSAASupersample.viewport = { width: predef_width*SSAA, height: predef_height*SSAA };
        this.RenderPass_SSAA_horizontal.viewport = { width: predef_width*1, height: predef_height*SSAA };
    }
    set seperable(seperable){
        this.removeRenderPass(this.RenderPass_SSAADownsample);
        this.removeRenderPass(this.RenderPass_SSAA_vertical);
        this.removeRenderPass(this.RenderPass_SSAA_horizontal);

        if(seperable === false){
            this.pushRenderPass(this.RenderPass_SSAADownsample);
        }else{
            this.pushRenderPass(this.RenderPass_SSAA_vertical);
            this.pushRenderPass(this.RenderPass_SSAA_horizontal);
        }
    }
    set mode(mode){
        this._SSAA.setUniform("MODE", mode);
        this._SSAA_horizontal.setUniform("MODE", mode);
        this._SSAA_vertical.setUniform("MODE", mode);
    }
    set jitter(jitter){
        this._SSAA.setUniform("JITTER", jitter);
        this._SSAA_horizontal.setUniform("JITTER", jitter);
        this._SSAA_vertical.setUniform("JITTER", jitter);
    }
};

