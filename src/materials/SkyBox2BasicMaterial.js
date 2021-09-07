import { FRONT_AND_BACK_SIDE } from '../constants.js';
import {CustomShaderMaterial} from './CustomShaderMaterial.js';


export class SkyBox2BasicMaterial extends CustomShaderMaterial {
    constructor(args = {}){
        super();

        this.type = "SkyBox2Material";
        this.programName = "basic_skybox2";

        this.side = FRONT_AND_BACK_SIDE;
    }


    get color() { return this._color; }
    set color(val) {
        this._color = val;

        // Notify onChange subscriber
        if (this._onChangeListener) {
            var update = {uuid: this._uuid, changes: {color: this._color.getHex()}};
            this._onChangeListener.materialUpdate(update)
        }
    }


    update(data) {
        super.update(data);

        for (let prop in data) {
            switch (prop) {
                case "color":
                    this._color = data.color;
                    delete data.color;
                    break;
            }
        }
    }
}