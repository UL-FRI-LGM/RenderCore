import { Color } from '../RenderCore.js';
import {CustomShaderMaterial} from './CustomShaderMaterial.js';


export class Text2DMaterial extends CustomShaderMaterial {
    constructor(programName = "text2D", uniforms = {}, attributes = {}, args = {}){
        super(programName, uniforms, attributes);

        this.type = "Text2DMaterial";


		this.color = args.color ? args.color : new Color(0, 0, 0);
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
}