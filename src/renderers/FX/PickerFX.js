import { FX } from "./FX.js"
import { RenderPass } from "./../RenderPass.js";
import { Mesh, PickingShaderMaterial } from "../../RenderCore.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


export class PickerFX extends FX {
    static PICK_MODE = {
        RGB: PickingShaderMaterial.PICK_MODE.RGB,
        UINT: PickingShaderMaterial.PICK_MODE.UINT
    };


    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);

        this.inputs.scene = this.inputs.scene ? this.inputs.scene : undefined;
        this.inputs.camera = this.inputs.camera ? this.inputs.camera : undefined;

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_picker");

        this._pickMode = null;


        const origiMats = new Map();
        const pickingMats = new Map();
        const visibility = new Map();

        this._renderPass_Picker = new RenderPass(
            // Rendering pass type
            RenderPass.BASIC,

            // Initialize function
            (textureMap, additionalData) => {
                FX.iterateSceneR(INPUTS.scene, (object) => {
                    if(!(object instanceof Mesh)) return;


                    origiMats.set(object._uuid, object.material);
                    pickingMats.set(object._uuid, object.pickingMaterial);
                    visibility.set(object._uuid, object.visible);
                });
            },

            // Preprocess function
            (textureMap, additionalData) => {
                FX.iterateSceneR(INPUTS.scene, (object) => {
                    if(!(object instanceof Mesh)) return;


                    if(!object.pickable){
                        object.visible = false;
                        return;
                    }

                    if(!origiMats.get(object._uuid) || !pickingMats.get(object._uuid)){
                        origiMats.set(object._uuid, object.material);
                        pickingMats.set(object._uuid, object.pickingMaterial);
                        visibility.set(object._uuid, object.visible);
                    }

                    object.material = pickingMats.get(object._uuid);
                    // apply any changes
                    object.material.pickMode = this._pickMode;
                });

                return { scene: INPUTS.scene, camera: INPUTS.camera };
            },

            (textureMap, additionalData) => {
                FX.iterateSceneR(INPUTS.scene, (object) => {
                    if(!(object instanceof Mesh)) return;


                    if(!object.pickable){
                        object.visible = visibility.get(object._uuid);
                        return;
                    }

                    if(!origiMats.get(object._uuid) || !pickingMats.get(object._uuid)){
                        origiMats.set(object._uuid, object.material);
                        pickingMats.set(object._uuid, object.pickingMaterial);
                        visibility.set(object._uuid, object.visible);
                    }

                    object.material = origiMats.get(object._uuid);
                });
            },

            // Target
            RenderPass.TEXTURE,

            // Viewport
            { width: predef_width, height: predef_height },

            // Bind depth texture to this ID
            "depth_color_picker",

            [
                {id: OUTPUTS.color.name, textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG}
                //{id: OUTPUTS.color.name, textureConfig: RenderPass.DEFAULT_R32UI_TEXTURE_CONFIG}
            ]
        );

        this.pushRenderPass(this._renderPass_Picker);


        this.pickMode = args.pickMode ? args.pickMode : PickerFX.PICK_MODE.RGB;
    }


    get pickMode() { return this._pickMode; }
    set pickMode(pickMode){
        this._pickMode = pickMode;


        if(pickMode === PickerFX.PICK_MODE.RGB){
            this._renderPass_Picker.outTextures = [
                {id: this.outputs.color.name, textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG}
            ];
        }else if(pickMode === PickerFX.PICK_MODE.UINT){
            this._renderPass_Picker.outTextures = [
                {id: this.outputs.color.name, textureConfig: RenderPass.DEFAULT_R32UI_TEXTURE_CONFIG}
            ];
        }else{
            console.error("Unknown pick mode: [" + pickMode + "].");
        }
    }
};

