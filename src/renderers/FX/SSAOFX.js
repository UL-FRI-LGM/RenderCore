import { FX } from "./FX.js"
import { CustomShaderMaterial } from "../../materials/CustomShaderMaterial.js";
import { _Math } from "../../math/Math.js";
import { Vector3 } from "../../math/Vector3.js";
import { RenderPass } from "./../RenderPass.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;


export class SSAOFX extends FX {


    constructor(renderer, INPUTS = {}, args = {}, OUTPUTS = {}) {
        super(renderer, INPUTS, OUTPUTS);


        this.inputs.color = this.inputs.color ? this.inputs.color : new FX.input("color_in");
        this.inputs.normal = this.inputs.normal ? this.inputs.normal : new FX.input("normal");
        this.inputs.position = this.inputs.position ? this.inputs.position : new FX.input("vertexPos");

        this.outputs.color = this.outputs.color ? this.outputs.color : new FX.output("color_out_SSAO");


        args.numberOfSamples = args.numberOfSamples ? args.numberOfSamples : 8;
        args.numberOfNoise = args.numberOfNoise ? args.numberOfNoise : 4;

        args.radius = args.radius ? args.radius : 1.0;
        args.bias = args.bias ? args.bias : 0.05;
        args.magnitude = args.magnitude ? args.magnitude : 1.0;
        args.contrast = args.contrast ? args.contrast : 0.5;


        const ssaoSamples = SSAOFX.generateSamples(args.numberOfSamples);
        const ssaoNoise = SSAOFX.generateNoise(args.numberOfNoise);


        this._SSAO = new CustomShaderMaterial("SSAO",
            {
                radius: args.radius,
                bias: args.bias,
                magnitude: args.magnitude,
                contrast: args.contrast,
                "samples[0]": ssaoSamples,
                "noise[0]": ssaoNoise,
                PMat_o: [1.7886792452830194, 0, 0, 0, 0, 1.0000000000000002, 0, 0, 0, 0, -1.0000152589054787, -1, 0, 0, -0.12500095368159242, 0]
            }
        );
        this._SSAO.addSBValue("NUM_SAMPLES", args.numberOfSamples);
        this._SSAO.addSBValue("NUM_NOISE", args.numberOfNoise);
        const SSAO = this._SSAO;

        this._sb = new CustomShaderMaterial("simpleBlur");
        const sb = this._sb;


        const RenderPass_SSAO = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {
                    material: SSAO,
                    textures: [
                        textureMap[INPUTS.position.name],
                        textureMap[INPUTS.normal.name]
                    ]
                };
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
                {id: "SSAO_out", textureConfig: RenderPass.DEFAULT_R8_TEXTURE_CONFIG}
            ]
        );

        const RenderPass_SimpleBlur = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {
                    material: sb, 
                    textures: [
                        textureMap["SSAO_out"], 
                        textureMap[INPUTS.color.name]
                    ]
                };
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


        this.pushRenderPass(RenderPass_SSAO);
        this.pushRenderPass(RenderPass_SimpleBlur);
    }


    set numberOfSamples(numberOfSamples){
        const ssaoSamples = SSAOFX.generateSamples(numberOfSamples);

        this._SSAO.setUniform("samples[0]", ssaoSamples);
        this._SSAO.addSBValue("NUM_SAMPLES", numberOfSamples);
    }
    set numberOfNoise(numberOfNoise){
        const ssaoNoise = SSAOFX.generateNoise(numberOfNoise);

        this._SSAO.setUniform("noise[0]", ssaoNoise);
        this._SSAO.addSBValue("NUM_NOISE", numberOfNoise); //TODO apply in shader
    }

    set radius(radius){
        this._SSAO.setUniform("radius", radius)
    }
    set bias(bias){
        this._SSAO.setUniform("bias", bias);
    }
    set magnitude(magnitude){
        this._SSAO.setUniform("magnitude", magnitude);
    }
    set contrast(contrast){
        this._SSAO.setUniform("contrast", contrast);
    }

    set PMat(PMat){
        this._SSAO.setUniform("PMat_o", PMat);
    }


    static generateSamples(numberOfSamples){
        const ssaoSamples = [];

        for (let i = 0; i < numberOfSamples; ++i) {
            const sample = new Vector3(
                Math.random() * 2.0 - 1.0,
                Math.random() * 2.0 - 1.0,
                Math.random()
                ).normalize();

            const rand = Math.random();
            sample.multiplyScalar(rand);


            let scale = i / numberOfSamples;
            scale = _Math.lerp(0.1, 1.0, scale * scale);
            sample.multiplyScalar(scale);

            ssaoSamples.push(sample.x, sample.y, sample.z);
        }

        return ssaoSamples;
    }
    static generateNoise(numberOfNoise){
        const ssaoNoise = [];

        for (let i = 0; i < numberOfNoise; ++i) {
            const noise = new Vector3(
                Math.random() * 2.0 - 1.0,
                Math.random() * 2.0 - 1.0,
                0.0
                ).normalize();

            ssaoNoise.push(noise.x, noise.y, noise.z);
        }

        return ssaoNoise;
    }
};

