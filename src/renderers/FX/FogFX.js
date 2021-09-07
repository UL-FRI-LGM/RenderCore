import { FX } from "./FX.js";
import { CustomShaderMaterial } from "../../materials/CustomShaderMaterial.js";
import { RenderPass } from "./../RenderPass.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


export class FogFX extends FX {
    static MODE_DEPTH = 0;
    static MODE_DISTANCE = 1;

    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);


        this.inputs.color = this.inputs.color ? this.inputs.color : new FX.input("color_in");
        this.inputs.depth = this.inputs.depth ? this.inputs.depth : new FX.input("depthGB");
        this.inputs.distance = this.inputs.distance ? this.inputs.distance : new FX.input("camDist");

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_fog");

        args.mode = args.mode ? args.mode : FogFX.MODE_DEPTH;
        args.fogColor = args.fogColor ? args.fogColor : [0.5, 0.4, 0.45, 0.8];
        args.fogNear = args.fogNear ? args.fogNear : 0.9992;
        args.fogFar = args.fogFar ? args.fogFar : 1.0;
        args.fogDensity = args.fogDensity ? args.fogDensity : 0.004;
        args.fogStartDistance = args.fogStartDistance ? args.fogStartDistance : 128.0;

        this._fog = new CustomShaderMaterial("fog", {MODE: args.mode, fogColor: args.fogColor, fogNear: args.fogNear, fogFar: args.fogFar, fogDensity: args.fogDensity, fogStartDistance: args.fogStartDistance});
        this._fog.lights = false;
        const fog = this._fog;


        const RenderPass_Fog = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                switch(args.mode) {
                    case FogFX.MODE_DEPTH:
                        return {material: fog, textures: [textureMap[INPUTS.color.name], textureMap[INPUTS.depth.name]]}; //grid jumps on depth buffer
                    case FogFX.MODE_DISTANCE:
                        return {material: fog, textures: [textureMap[INPUTS.color.name], textureMap[INPUTS.distance.name]]}; //grid has specific shader for extruding geometry, even if implemented, it would jump around
                }
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


        this.pushRenderPass(RenderPass_Fog);
    }


    set mode(mode){
        this._fog.setUniform("MODE", mode)
    }
    set fogColor(fogColor){
        this._fog.setUniform("fogColor", fogColor);
    }
    set fogNear(fogNear){
        this._fog.setUniform("fogNear", fogNear);
    }
    set fogFar(fogFar){
        this._fog.setUniform("fogFar", fogFar);
    }
    set fogDensity(fogDensity){
        this._fog.setUniform("fogDensity", fogDensity);
    }
    set fogStartDistance(fogStartDistance){
        this._fog.setUniform("fogStartDistance", fogStartDistance);
    }

};

