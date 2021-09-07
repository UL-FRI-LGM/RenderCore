import { FX } from "./FX.js"
import { RenderPass } from "./../RenderPass.js";
import { DirectionalShadowMaterial } from "../../materials/DirectionalShadowMaterial.js";
import { PointLight } from "../../lights/PointLight.js";
import { PointShadowMaterial } from "../../materials/PointShadowMaterial.js";
import { Light } from "../../lights/Light.js";
import { AmbientLight } from "../../lights/AmbientLight.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


export class ShadowMapFX extends FX {
    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);

        this.inputs.scene = this.inputs.scene ? this.inputs.scene : undefined;
        this._quality = args.quality ? args.quality : 1;

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_shadow");

        const lights = [];
        FX.iterateSceneR(INPUTS.scene, function(object){
            if(object instanceof Light && !(object instanceof AmbientLight)){
                if(object.castShadows) lights.push(object);
            }
        });

        for (let l = 0; l < lights.length; l++){
            const light = lights[l];

            if(light instanceof PointLight){
                const origiMats = {};
                const shadowMats = {};

                for (let side = 0; side < 6; side++){
                    const RenderPass_ShadowMap = new RenderPass(
                        // Rendering pass type
                        RenderPass.BASIC,

                        // Initialize function
                        function (textureMap, additionalData) {
                            if(side === 0){
                                FX.iterateSceneR(INPUTS.scene, function(object){
                                    origiMats[object._uuid] = object.material;
                                    shadowMats[object._uuid] = new PointShadowMaterial({farPlane: () => {return light.shadowFar}});
                                });
                            }
                        },

                        // Preprocess function
                        function (textureMap, additionalData) {
                            if(side === 0){
                                FX.iterateSceneR(INPUTS.scene, function(object){
                                    if(!origiMats[object._uuid] || !shadowMats[object._uuid]){
                                        origiMats[object._uuid] = object.material;
                                        shadowMats[object._uuid] = new PointShadowMaterial({farPlane: () => {return light.shadowFar}});
                                    }
                                    object.material = shadowMats[object._uuid];
                                });
                            }

                            return { scene: INPUTS.scene, camera: light.cameraGroup.children[side] };
                        },

                        function (textureMap, additionalData) {
                            if(side === 5){
                                //light.shadowmap = textureMap[OUTPUTS.color.name + l];
                                light.shadowmap = textureMap["depth_shadow" + l];

                                FX.iterateSceneR(INPUTS.scene, function(object){
                                    if(!origiMats[object._uuid] || !shadowMats[object._uuid]){
                                        origiMats[object._uuid] = object.material;
                                        shadowMats[object._uuid] = new PointShadowMaterial({farPlane: () => {return light.shadowFar}});
                                    }
                                    object.material = origiMats[object._uuid];
                                    //object.material._cubemaps = [textureMap["depth_shadow" + l]];
                                });
                            }
                        },

                        // Target
                        RenderPass.TEXTURE_CUBE_MAP,

                        // Viewport
                        { width: 1024*this._quality, height: 1024*this._quality },

                        // Bind depth texture to this ID
                        "depth_shadow" + l,

                        [
                            {id: OUTPUTS.color.name + l, textureConfig: RenderPass.DEFAULT_R16F_TEXTURE_CUBE_MAP_CONFIG}
                        ],

                        side
                    );


                    this.pushRenderPass(RenderPass_ShadowMap);
                }
            }else{
                const origiMats = {};
                const shadowMats = {};


                const RenderPass_ShadowMap = new RenderPass(
                    // Rendering pass type
                    RenderPass.BASIC,

                    // Initialize function
                    function (textureMap, additionalData) {
                        FX.iterateSceneR(INPUTS.scene, function(object){
                            origiMats[object._uuid] = object.material;
                            shadowMats[object._uuid] = new DirectionalShadowMaterial();
                        });
                    },

                    // Preprocess function
                    function (textureMap, additionalData) {
                        FX.iterateSceneR(INPUTS.scene, function(object){
                            if(!origiMats[object._uuid] || !shadowMats[object._uuid]){
                                origiMats[object._uuid] = object.material;
                                shadowMats[object._uuid] = new DirectionalShadowMaterial();
                            }
                            object.material = shadowMats[object._uuid];
                        });

                        return { scene: INPUTS.scene, camera: light.cameraGroup.children[0] };
                    },

                    function (textureMap, additionalData) {
                        //light.shadowmap = textureMap[OUTPUTS.color.name + l];
                        light.shadowmap = textureMap["depth_shadow" + l];

                        FX.iterateSceneR(INPUTS.scene, function(object){
                            if(!origiMats[object._uuid] || !shadowMats[object._uuid]){
                                origiMats[object._uuid] = object.material;
                                shadowMats[object._uuid] = new DirectionalShadowMaterial();
                            }
                            object.material = origiMats[object._uuid];
                        });
                    },

                    // Target
                    RenderPass.TEXTURE,

                    // Viewport
                    { width: predef_width*this._quality, height: predef_height*this._quality },

                    // Bind depth texture to this ID
                    "depth_shadow" + l,

                    [
                        {id: OUTPUTS.color.name + l, textureConfig: RenderPass.DEFAULT_R16F_TEXTURE_CONFIG}
                    ]
                );

                this.pushRenderPass(RenderPass_ShadowMap);
            }
        }
    }

    set quality(quality){
        for(let i = 0; i < this._renderQueue.length; i++){
            const renderPass = this._renderQueue[i];
            renderPass.viewport = { width: 1024*quality, height: 1024*quality };
        }
    }
};

