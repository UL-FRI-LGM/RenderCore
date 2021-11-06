import { FX } from "./FX.js"
import { RenderPass } from "./../RenderPass.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


export class PickerFX extends FX {

    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);

        this.inputs.scene = this.inputs.scene ? this.inputs.scene : undefined;
        this.inputs.camera = this.inputs.camera ? this.inputs.camera : undefined;

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_picker");

        const origiMats = {};
        const pickingMats = {};
        const visibility = {};

        const RenderPass_Picker = new RenderPass(
            // Rendering pass type
            RenderPass.BASIC,

            // Initialize function
            function (textureMap, additionalData) {
                FX.iterateSceneR(INPUTS.scene, function(object){
                    origiMats[object._uuid] = object.material;
                    pickingMats[object._uuid] = object.pickingMaterial;
                    visibility[object._uuid] = object.visible;
                });
            },

            // Preprocess function
            function (textureMap, additionalData) {
                FX.iterateSceneR(INPUTS.scene, function(object){
                    if(!object.pickable){
                        object.visible = false;
                        return;
                    }

                    if(!origiMats[object._uuid] || !pickingMats[object._uuid]){
                        origiMats[object._uuid] = object.material;
                        pickingMats[object._uuid] = object.pickingMaterial;
                        visibility[object._uuid] = object.visible;
                    }

                    object.material = pickingMats[object._uuid];
                });

                return { scene: INPUTS.scene, camera: INPUTS.camera };
            },

            function (textureMap, additionalData) {
                FX.iterateSceneR(INPUTS.scene, function(object){
                    if(!object.pickable){
                        object.visible = visibility[object._uuid];
                        return;
                    }

                    if(!origiMats[object._uuid] || !pickingMats[object._uuid]){
                        origiMats[object._uuid] = object.material;
                        pickingMats[object._uuid] = object.pickingMaterial;
                        visibility[object._uuid] = object.visible;
                    }

                    object.material = origiMats[object._uuid];
                });
            },

            // Target
            RenderPass.TEXTURE,

            // Viewport
            { width: predef_width, height: predef_height },

            // Bind depth texture to this ID
            "depth_color_picker",

            [
                {id: OUTPUTS.color.name, textureConfig: RenderPass.DEFAULT_R32UI_TEXTURE_CONFIG},
            ]
        );

        this.pushRenderPass(RenderPass_Picker);
    }

};

