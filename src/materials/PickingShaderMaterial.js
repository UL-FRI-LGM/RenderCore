/**
 * Created by Sebastien.
 */


import {CustomShaderMaterial} from "./CustomShaderMaterial.js";
import {MaterialProgramTemplate} from "../program_management/MaterialProgramTemplate.js";


export class PickingShaderMaterial extends CustomShaderMaterial {
    static PICK_MODE = {
        RGB: 0,
        UINT: 1
    };


    constructor(programName = "TRIANGLES", uniforms = {}, attributes = {}, args = {}) {
        super("picker" + '_' + programName, uniforms, attributes, args);

        this.type = "PickingShaderMaterial";


        // defaults
        this._pickMode = null;


        // set
        this.pickMode = args.mode ? args.mode : PickingShaderMaterial.PICK_MODE.RGB;
    }


    get pickMode() { return this._pickMode; }
    set pickMode(pickMode) {
		if (pickMode !== this._pickMode) {
			// Invalidate required program template
			this._requiredProgramTemplate = null;

			this._pickMode = pickMode;


            if(pickMode === PickingShaderMaterial.PICK_MODE.RGB){
                this.rmSBFlag("PICK_MODE_UINT");
                this.addSBFlag("PICK_MODE_RGB");
            }else if(pickMode === PickingShaderMaterial.PICK_MODE.UINT){
                this.rmSBFlag("PICK_MODE_RGB");
                this.addSBFlag("PICK_MODE_UINT");
            }else{
                console.error("Unknown pick mode: [" + pickMode + "].");
            }


			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {pickMode: this._pickMode}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}


    resetProgramFlagsAndValues(){
		super.resetProgramFlagsAndValues();
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