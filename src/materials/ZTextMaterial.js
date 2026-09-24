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

    /// Same program, PICK_MODE_UINT variant -- see ZSpriteBasicMaterial for the
    /// pattern. The font map is deliberately NOT copied: without TEXTURE the
    /// vertex shader skips the SDF varyings and only computes gl_Position, which
    /// is all picking needs.
    clone_for_picking() {
        let o = new ZTextMaterial();
        for (const u of ["MODE", "offset", "scale", "sdf_text_size",
                         "sdf_oo_N_pix_in_char", "hint_amount"])
            o.setUniform(u, this.getUniform(u));
        o.addSBFlag("PICK_MODE_UINT");
        // The variant is a different program, so it needs the anchor branch
        // compiled in and its inputs bound too -- otherwise it falls through to
        // whatever MODE it can still evaluate and picks at the wrong place.
        if (this.hasSBFlag("ANCHOR3D")) {
            o.enableAnchor3D();
            for (const u of ["atten", "w_ref"])
                o.setUniform(u, this.getUniform(u));
            const a = this.getAttribute("anchor");
            if (a !== undefined) o.setAttribute("anchor", a);
        }
        return o;
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
