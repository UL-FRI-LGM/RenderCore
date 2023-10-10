import {Color} from '../math/Color.js';
import {CustomShaderMaterial} from './CustomShaderMaterial.js';

export class ZTextMaterial extends CustomShaderMaterial {
    constructor(programName = "ZText", uniforms = {}, attributes = {}, args = {}){
        super(programName, uniforms, attributes);

        this.type = "ZTextMaterial";
        this._uniforms = uniforms;
		this._attributes = attributes;

		this.color = args.color ? args.color : new Color(0, 0, 0);
    }

	get color() { return this._color; }
    set color(val) {
        this._color = val;

        // Notify onChange subscriber
        if (this._onChangeListener) {
            let update = {uuid: this._uuid, changes: {color: this._color.getHex()}};
            this._onChangeListener.materialUpdate(update)
        }
    }
}
