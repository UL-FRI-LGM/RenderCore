import { FX } from "./FX.js"
import { RenderPass } from "./../RenderPass.js";
import { MeshRenderer } from "../MeshRenderer.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


/**
 * The pick image of a scene: one pass that renders the scene with the renderer in
 * MeshRenderer.MODE.PICK, which draws every pickable mesh with its pick pass material, see
 * Mesh.passMaterial(), into an R32UI texture named by outputs.color and cleared to 0xFFFFFFFF.
 * Each mesh writes its UINT_ID; RenderQueue.pickUINT() reads a pixel back.
 */
export class PickerFX extends FX {

    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);

        this.inputs.scene = this.inputs.scene ? this.inputs.scene : undefined;
        this.inputs.camera = this.inputs.camera ? this.inputs.camera : undefined;

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_picker");

        let previousMode = MeshRenderer.MODE.COLOR;

        this._renderPass_Picker = new RenderPass(
            // Rendering pass type
            RenderPass.BASIC,

            // Initialize function
            (textureMap, additionalData) => {},

            // Preprocess function
            (textureMap, additionalData) => {
                previousMode = renderer.renderMode;
                renderer.renderMode = MeshRenderer.MODE.PICK;
                return { scene: INPUTS.scene, camera: INPUTS.camera };
            },

            // Postprocess function
            (textureMap, additionalData) => {
                renderer.renderMode = previousMode;
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

