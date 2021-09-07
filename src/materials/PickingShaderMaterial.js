/**
 * Created by Sebastien.
 */


import {CustomShaderMaterial} from "./CustomShaderMaterial.js";
import {MaterialProgramTemplate} from "../program_management/MaterialProgramTemplate.js";


export class PickingShaderMaterial extends CustomShaderMaterial {

    constructor(programName = "TRIANGLES", uniforms = {}, attributes = {}) {
        super("colorPicker" + '_' + programName, uniforms, attributes);

        this.type = "PickingShaderMaterial";
    }


    requiredProgram(renderer = undefined) {
        // If the template is already generate use it
        if (this._requiredProgramTemplate !== null) {
            return this._requiredProgramTemplate;
        }

        this.resetProgramFlagsAndValues();



        this._requiredProgramTemplate = new MaterialProgramTemplate(this.programName, this.flags, this.values, renderer);
        return this._requiredProgramTemplate;
    }
}