import {MeshBasicMaterial} from './MeshBasicMaterial.js';
import {Color} from "../math/Color.js";
import {BACK_SIDE} from "../constants.js";
import {MaterialProgramTemplate} from "../program_management/MaterialProgramTemplate.js";


export class OutlineBasicMaterial extends MeshBasicMaterial {
    //CONSTRUCTOR
    constructor(){
        super();

        this.type = "OutlineBasicMaterial";
        this.programName = "basic";

        this.color = new Color(Math.random() * 0xffffff);
        this.side = BACK_SIDE;
        this.depthTest = false; //TOGGLE??

        this._offset = 0.0625;
    }

    //GET SET
    get offset(){ return this._offset; }
    set offset(val) {
        if (val !== this._offset) {
            this._offset = val;

            // Notify onChange subscriber
            if (this._onChangeListener) {
                var update = {uuid: this._uuid, changes: {offset: this._offset}};
                this._onChangeListener.materialUpdate(update)
            }
        }
    }


    //FUNC
    resetProgramFlagsAndValues(){
        super.resetProgramFlagsAndValues();

        this._flags.push("OUTLINE");
    }

    requiredProgram(renderer = undefined) {
        // If the template is already generate use it
        if (this._requiredProgramTemplate !== null) {
            return this._requiredProgramTemplate;
        }

        this.resetProgramFlagsAndValues();

        this._requiredProgramTemplate = new MaterialProgramTemplate(this.programName2, this.flags, this.values, renderer);
        return this._requiredProgramTemplate;
    }
    update(data) {
        super.update(data);

        for (var prop in data) {
            switch (prop) {
                case "offset":
                    this._offset = data.offset;
                    delete data.offset;
                    break;
            }
        }
    }
}