import {CustomShaderMaterial} from './CustomShaderMaterial.js';


export class Text2DMaterial extends CustomShaderMaterial {
    constructor(programName = "text2D", uniforms = {}, attributes = {}){
        super(programName, uniforms, attributes);

        this.type = "Text2DMaterial";
    }
}