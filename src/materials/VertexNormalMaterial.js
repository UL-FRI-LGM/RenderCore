import { Color } from "../math/Color.js";
import {CustomShaderMaterial} from "./CustomShaderMaterial.js";


export class VertexNormalMaterial extends CustomShaderMaterial {
    constructor(args = {}) {
        super("vertexNormal");

        this.type = "VertexNormalMaterial";
        this._color = args.color ? args.color : new Color(Math.random() * 0xffffff);


        this.setUniform("color", this._color.toArray());
    }

    get color() { return this._color; }
    set color(val) {
		if (!val.equals(this._color)) {
			this._color = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {color: this._color.getHex()}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}
}