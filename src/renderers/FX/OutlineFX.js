import { FX } from "./FX.js";
import { CustomShaderMaterial } from "../../materials/CustomShaderMaterial.js";
import { RenderPass } from "./../RenderPass.js";
import { FRONT_AND_BACK_SIDE } from "../../constants.js";
import { Scene } from "../../core/Scene.js";
import { Group } from "../../objects/Group.js";
import { Light } from "../../lights/Light.js";


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

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_outline");

        args.scale = args.scale ? args.scale : 1.0;
        args.edgeColor = args.edgeColor ? args.edgeColor : [0.1, 0.3, 0.1, 1.0];
        args.depthThreshold = args.depthThreshold ? args.depthThreshold : 6.0;
        args.normalThreshold = args.normalThreshold ? args.normalThreshold : 0.4;
        args.depthNormalThreshold = args.depthNormalThreshold ? args.depthNormalThreshold : 0.5;
        args.depthNormalThresholdScale = args.depthNormalThresholdScale ? args.depthNormalThresholdScale : 7.0;


        this._outline = new CustomShaderMaterial("outline", {scale: args.scale, edgeColor: args.edgeColor, _DepthThreshold: args.depthThreshold, _NormalThreshold: args.normalThreshold, _DepthNormalThreshold: args.depthNormalThreshold, _DepthNormalThresholdScale: args.depthNormalThresholdScale});
        this._outline.lights = false;
        const outline = this._outline;


        const visibility = {};
        const origiMats = {};
        const multiMats = {};

        const RenderPass_Multi = new RenderPass(
            // Rendering pass type
            RenderPass.BASIC,
            // Initialize function
            function (textureMap, additionalData) {
                FX.iterateSceneR(INPUTS.scene, function(object){
                    if (object instanceof Scene || object instanceof Group || object instanceof Light) return;

                    visibility[object._uuid] = object.visible;
                    origiMats[object._uuid] = object.material;

                    multiMats[object._uuid] = new CustomShaderMaterial("multi");
                    multiMats[object._uuid].side = FRONT_AND_BACK_SIDE;
                });
            },
            // Preprocess function
            function (textureMap, additionalData) {
                FX.iterateSceneR(INPUTS.scene, function(object){
                    if (object instanceof Scene || object instanceof Group || object instanceof Light) return;

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
                    if (object instanceof Scene || object instanceof Group || object instanceof Light) return;

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
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {material: outline, textures: [textureMap[INPUTS.depth.name], textureMap[INPUTS.normal.name], textureMap[INPUTS.viewDir.name], textureMap[INPUTS.color.name]]};
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
                {id: "color_outline", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );


        this.pushRenderPass(RenderPass_Multi);
        this.pushRenderPass(RenderPass_Outline);
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

