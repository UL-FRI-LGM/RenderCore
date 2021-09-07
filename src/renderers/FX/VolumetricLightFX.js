import { FX } from "./FX.js"
import { FlatShading, FRONT_AND_BACK_SIDE, HIGHPASS_MODE_BRIGHTNESS, HIGHPASS_MODE_DIFFERENCE } from "../../constants.js";
import { CustomShaderMaterial } from "../../materials/CustomShaderMaterial.js";
import { MeshBasicMaterial } from "../../materials/MeshBasicMaterial.js";
import { MeshPhongMaterial } from "../../materials/MeshPhongMaterial.js";
import { Color } from "../../math/Color.js";
import { IcoSphere } from "../../objects/IcoSphere.js";
import { Text2D } from "../../objects/Text2D.js";
import { RenderPass } from "./../RenderPass.js";
import { Scene } from "../../core/Scene.js";
import { Group } from "../../objects/Group.js";
import { Light } from "../../lights/Light.js";
import { GeoidSphere } from "../../objects/GeoidSphere.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


export class VolumetricLightFX extends FX {

    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);


        this.inputs.scene = this.inputs.scene ? this.inputs.scene : undefined;
        this.inputs.camera = this.inputs.camera ? this.inputs.camera : undefined;
        this.inputs.color = this.inputs.color ? this.inputs.color : new FX.input("color_in");

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("volumetric _light");

        args.samples = args.samples ? args.samples : 64;
        args.density = args.density ? args.density : 0.25;
        args.weight = args.weight ? args.weight : 0.8;
        args.decay = args.decay ? args.decay : 0.95;
        args.power = args.power ? args.power : 1.0;
        args.exposure = args.exposure ? args.exposure : 0.05;

        this._gbh = new CustomShaderMaterial("gaussBlur", {horizontal: true, power: args.power});
        this._gbh.lights = false;
        const gbh = this._gbh;
        this._gbv = new CustomShaderMaterial("gaussBlur", {horizontal: false, power: args.power});
        this._gbv.lights = false;
        const gbv = this._gbv;

        this._volumetricLight = new CustomShaderMaterial("volumetricLight", {samples: args.samples, density: args.density, weight: args.weight, decay: args.decay, exposure: args.exposure});
        this._volumetricLight.addSBValue("NUM_SAMPLES", args.samples);
        const volumetricLight = this._volumetricLight;


        const origiMats = {};
        const occlusionMats = {};
        const visibility = {};

        const RenderPass_OcclusionBuffer = new RenderPass(
            // Rendering pass type
            RenderPass.BASIC,

            // Initialize function
            function (textureMap, additionalData) {
                FX.iterateSceneR(INPUTS.scene, function(object){
                    if (object instanceof Scene || object instanceof Group || object instanceof Light) return;
                    if (object instanceof IcoSphere || object instanceof GeoidSphere) return;

                    origiMats[object._uuid] = object.material;

                    const black = new MeshBasicMaterial();
                    black.shadingType = FlatShading;
                    black.side = FRONT_AND_BACK_SIDE;

                    black.lights = false;
                    black.color = new Color(0.0, 0.0, 0.0);
                    occlusionMats[object._uuid] = black;

                    visibility[object._uuid] = object.visible;
                });
            },
            // Preprocess function
            function (textureMap, additionalData) {
                FX.iterateSceneR(INPUTS.scene, function(object){
                    if (object instanceof Scene || object instanceof Group || object instanceof Light) return;
                    if (object instanceof IcoSphere || object instanceof GeoidSphere) return;


                    if(object instanceof Text2D){
                        object.visible = false; 
                        return;
                    }

                    object.material = occlusionMats[object._uuid];
                });
                return { scene: INPUTS.scene, camera: INPUTS.camera };
            },

            function (textureMap, additionalData) {
                FX.iterateSceneR(INPUTS.scene, function(object){
                    if (object instanceof Scene || object instanceof Group || object instanceof Light) return;
                    if (object instanceof IcoSphere || object instanceof GeoidSphere) return;

                    if(object instanceof Text2D){
                        object.visible = visibility[object._uuid];
                        return;
                    }


                    object.material = origiMats[object._uuid];
                });
            },

            // Target
            RenderPass.TEXTURE,

            // Viewport
            { width: predef_width, height: predef_height },

            // Bind depth texture to this ID
            "depthOB",

            [
                {id: "occlusion_buffer", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
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
                return {material: gbh, textures: [textureMap["occlusion_buffer"]]};
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

        const RenderPass_VolumetricLight = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: volumetricLight, textures: [textureMap["gauss_hv"], textureMap[INPUTS.color.name]]};
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

        this.pushRenderPass(RenderPass_OcclusionBuffer);
        this.pushRenderPass(RenderPass_GaussH);
        this.pushRenderPass(RenderPass_GaussV);
        this.pushRenderPass(RenderPass_VolumetricLight);
    }

    set samples(samples){
        this._volumetricLight.setUniform("samples", samples);
        this._volumetricLight.addSBValue("NUM_SAMPLES", samples);
    }
    set density(density){
        this._volumetricLight.setUniform("density", density);
    }
    set weight(weight){
        this._volumetricLight.setUniform("weight", weight);
    }
    set decay(decay){
        this._volumetricLight.setUniform("decay", decay);
    }

    set power(power){
        this._gbh.setUniform("power", power);
        this._gbv.setUniform("power", power);
    }

    set exposure(exposure){
        this._volumetricLight.setUniform("exposure", exposure);
    }

};

