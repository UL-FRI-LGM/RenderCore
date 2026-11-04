import {Color} from '../math/Color.js';
import {Material} from './Material.js';
import {CustomShaderMaterial} from './CustomShaderMaterial.js';

/**
 * Material of ZText. Has the pick mode, see Material, and no outline mode: the
 * outline pass draws ZText with another material, see Mesh.
 */
export class ZTextMaterial extends CustomShaderMaterial {
    constructor(programName = "ZText", uniforms = {}, attributes = {}, args = {}){
        super(programName, uniforms, attributes);

        this.type = "ZTextMaterial";
        this._uniforms = uniforms;
		this._attributes = attributes;
        this._passModes = [Material.MODE.PICK];

		this.color = args.color ? args.color : new Color(0, 0, 0);
    }

    /// Compile the per-vertex-anchor branch in and give it its defaults. The
    /// `anchor` attribute is declared only under this flag: an attribute the
    /// program declares but nobody supplies makes MeshRenderer log once per
    /// draw, so ordinary ZText must not carry it.
    enableAnchor3D() {
        if (!this.hasSBFlag("ANCHOR3D")) this.addSBFlag("ANCHOR3D");
        if (this.getUniform("atten") === undefined) this.setUniform("atten", 0.0);
        if (this.getUniform("w_ref") === undefined) this.setUniform("w_ref", 1.0);
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
