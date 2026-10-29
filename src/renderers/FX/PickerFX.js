import { FX } from "./FX.js"
import { RenderPass } from "./../RenderPass.js";
import { Mesh } from "../../RenderCore.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


// Draws the pickable meshes of the scene with their picking materials into an R32UI texture
// named by outputs.color, cleared to 0xFFFFFFFF; RenderQueue.pickUINT() reads it back.
export class PickerFX extends FX {

    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);

        this.inputs.scene = this.inputs.scene ? this.inputs.scene : undefined;
        this.inputs.camera = this.inputs.camera ? this.inputs.camera : undefined;

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_picker");


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
                {id: OUTPUTS.color.name, textureConfig: RenderPass.DEFAULT_R32UI_TEXTURE_CONFIG,
                 clearColorArray: new Uint32Array([0xFFFFFFFF, 0, 0, 0])}
            ]
        );

        this.pushRenderPass(this._renderPass_Picker);
    }
};

