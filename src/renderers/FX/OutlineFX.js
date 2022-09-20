import { FX } from "./FX.js";
import { CustomShaderMaterial } from "../../materials/CustomShaderMaterial.js";
import { RenderPass } from "./../RenderPass.js";
import { FRONT_AND_BACK_SIDE } from "../../constants.js";
import { Mesh } from "../../RenderCore.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


export class OutlineFX extends FX {
    static MODE_DEPTH = 0;
    static MODE_DISTANCE = 1;


    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);


        this.inputs.scene = this.inputs.scene ? this.inputs.scene : undefined;
        this.inputs.camera = this.inputs.camera ? this.inputs.camera : undefined;
        this.inputs.color = this.inputs.color ? this.inputs.color : new FX.input("color_in");
        this.inputs.depth = this.inputs.depth ? this.inputs.depth : new FX.input("depthGB_outline");
        this.inputs.normal = this.inputs.normal ? this.inputs.normal : new FX.input("normal_outline");
        this.inputs.viewDir = this.inputs.viewDir ? this.inputs.viewDir : new FX.input("viewDir_outline");

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("OUTLINE_FX_OUT");

        args.scale = args.scale ? args.scale : 1.0;
        args.edgeColor = args.edgeColor ? args.edgeColor : [0.1, 0.3, 0.1, 1.0];
        args.depthThreshold = args.depthThreshold ? args.depthThreshold : 6.0;
        args.normalThreshold = args.normalThreshold ? args.normalThreshold : 0.4;
        args.depthNormalThreshold = args.depthNormalThreshold ? args.depthNormalThreshold : 0.5;
        args.depthNormalThresholdScale = args.depthNormalThresholdScale ? args.depthNormalThresholdScale : 7.0;


        this.outline = new CustomShaderMaterial("outline", {scale: args.scale, edgeColor: args.edgeColor, _DepthThreshold: args.depthThreshold, _NormalThreshold: args.normalThreshold, _DepthNormalThreshold: args.depthNormalThreshold, _DepthNormalThresholdScale: args.depthNormalThresholdScale});

        this.gaussBlurHorizontal = new CustomShaderMaterial("gaussBlur", {horizontal: true, power: 1.0});
        this.gaussBlurVertical = new CustomShaderMaterial("gaussBlur", {horizontal: false, power: 1.0});

        this.blending = new CustomShaderMaterial("blendingAdditive");


        const visibility = {};
        const origiMats = {};
        const multiMats = {};

        const RenderPass_Multi = new RenderPass(
            // Rendering pass type
            RenderPass.BASIC,
            // Initialize function
            function (textureMap, additionalData) {
                FX.iterateSceneR(INPUTS.scene, function(object){
                    if(!(object instanceof Mesh)) return;


                    visibility[object._uuid] = object.visible;
                    origiMats[object._uuid] = object.material;

                    multiMats[object._uuid] = new CustomShaderMaterial("multi");
                    multiMats[object._uuid].side = FRONT_AND_BACK_SIDE;
                });
            },
            // Preprocess function
            function (textureMap, additionalData) {
                FX.iterateSceneR(INPUTS.scene, function(object){
                    if(!(object instanceof Mesh)) return;


                    if(!origiMats[object._uuid] || !multiMats[object._uuid]){
                        visibility[object._uuid] = object.visible;
                        origiMats[object._uuid] = object.material;

                        multiMats[object._uuid] = new CustomShaderMaterial("multi");
                        multiMats[object._uuid].side = FRONT_AND_BACK_SIDE;
                    }

                    if(object.drawOutline) {
                        object.visible = true;
                        object.material = multiMats[object._uuid];
                    }else{
                        object.visible = false;
                    }
                });
                return { scene: INPUTS.scene, camera: INPUTS.camera };
            },

            function (textureMap, additionalData) {
                FX.iterateSceneR(INPUTS.scene, function(object){
                    if(!(object instanceof Mesh)) return;


                    if(!origiMats[object._uuid] || !multiMats[object._uuid]){
                        visibility[object._uuid] = object.visible;
                        origiMats[object._uuid] = object.material;

                        multiMats[object._uuid] = new CustomShaderMaterial("multi");
                        multiMats[object._uuid].side = FRONT_AND_BACK_SIDE;
                    }

                    if(object.drawOutline) {
                        object.visible = visibility[object._uuid];
                        object.material = origiMats[object._uuid];
                    }else{
                        object.visible = visibility[object._uuid];
                    }
                });
            },

            // Target
            RenderPass.TEXTURE,

            // Viewport
            { width: predef_width, height: predef_height },

            // Bind depth texture to this ID
            "depthGB_outline",

            [
                {id: "depth_outline", textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG},
                {id: "vertexPos_outline", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
                {id: "normal_outline", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
                {id: "viewDir_outline", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
                {id: "camDist_outline", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
            ]
        );

        const RenderPass_Outline = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            (textureMap, additionalData) => {},

            // Preprocess function
            (textureMap, additionalData) => {
                return {
                    material: this.outline, 
                    textures: [
                        textureMap[INPUTS.depth.name], 
                        textureMap[INPUTS.normal.name], 
                        textureMap[INPUTS.viewDir.name], 
                        textureMap[INPUTS.color.name]
                    ]
                };
            },

            (textureMap, additionalData) => {},

            // Target
            RenderPass.TEXTURE,

            // Viewport
            { width: predef_width, height: predef_height },

            // Bind depth texture to this ID
            null,

            [
                {id: "color_outline", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );

        const RenderPass_GaussH = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            (textureMap, additionalData) => {},

            // Preprocess function
            (textureMap, additionalData) => {
                return {material: this.gaussBlurHorizontal, textures: [textureMap["color_outline"]]};
            },

            (textureMap, additionalData) => {},

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
            (textureMap, additionalData) => {},

            // Preprocess function
            (textureMap, additionalData) => {
                return {material: this.gaussBlurVertical, textures: [textureMap["gauss_h"]]};
            },

            (textureMap, additionalData) => {},

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

        const RenderPass_Blend = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            (textureMap, additionalData) => {},

            // Preprocess function
            (textureMap, additionalData) => {
                return {
                    material: this.blending, 
                    textures: [
                        textureMap["gauss_hv"],
                        textureMap[INPUTS.color.name]
                    ]
                };
            },

            (textureMap, additionalData) => {},

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


        this.pushRenderPass(RenderPass_Multi);
        this.pushRenderPass(RenderPass_Outline);

        this.pushRenderPass(RenderPass_GaussH);
        this.pushRenderPass(RenderPass_GaussV);

        this.pushRenderPass(RenderPass_Blend);
    }


    get outline() { return this._outline; }
    set outline(outline) {
        this._outline = outline;
        this._outline.lights = false;
    }
    get gaussBlurVertical() { return this._gaussBlurVertical; }
    set gaussBlurVertical(gaussBlurVertical) {
        this._gaussBlurVertical = gaussBlurVertical;
        this._gaussBlurVertical.lights = false;
    }
    get gaussBlurHorizontal() { return this._gaussBlurHorizontal; }
    set gaussBlurHorizontal(gaussBlurHorizontal) {
        this._gaussBlurHorizontal = gaussBlurHorizontal;
        this._gaussBlurHorizontal.lights = false;
    }
    get blending() { return this._blending; }
    set blending(blending) {
        this._blending = blending;
        this._blending.lights = false; 
    }

    set scale(scale){
        this._outline.setUniform("scale", scale)
    }
    set edgeColor(edgeColor){
        this._outline.setUniform("edgeColor", edgeColor);
    }
    set depthThreshold(depthThreshold){
        this._outline.setUniform("_DepthThreshold", depthThreshold);
    }
    set normalThreshold(normalThreshold){
        this._outline.setUniform("_NormalThreshold", normalThreshold);
    }
    set depthNormalThreshold(depthNormalThreshold){
        this._outline.setUniform("_DepthNormalThreshold", depthNormalThreshold);
    }
    set depthNormalThresholdScale(depthNormalThresholdScale){
        this._outline.setUniform("_DepthNormalThresholdScale", depthNormalThresholdScale);
    }

};

