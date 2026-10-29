/**
 * Created by Sebastien.
 */


import {CustomShaderMaterial} from "./CustomShaderMaterial.js";
import {MaterialProgramTemplate} from "../program_management/MaterialProgramTemplate.js";


// The picker_<programName> shaders write the object's u_UINT_ID into an R32UI target,
// which the pick passes clear to 0xFFFFFFFF. When u_PickInstance is set, picker_TRIANGLES
// writes InstanceID instead: gl_InstanceID under INSTANCED, else gl_VertexID.
export class PickingShaderMaterial extends CustomShaderMaterial {

    constructor(programName = "TRIANGLES", uniforms = {}, attributes = {}) {
        super("picker" + '_' + programName, uniforms, attributes);

        this.type = "PickingShaderMaterial";

        this.setUniform("u_PickInstance", false);
    }


    resetProgramFlagsAndValues(){
		super.resetProgramFlagsAndValues();
	}

    requiredProgram(renderer = undefined) {
        // If the template is already generate use it
        if (this.requiredProgramTemplate !== null) {
            return this.requiredProgramTemplate;
        }

        this.resetProgramFlagsAndValues();



        this.requiredProgramTemplate = new MaterialProgramTemplate(this.programName, this.flags, this.values, renderer);
        return this.requiredProgramTemplate;
    }
}