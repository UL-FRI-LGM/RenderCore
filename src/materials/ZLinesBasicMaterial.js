import {Material} from './Material.js';
import {CustomShaderMaterial} from './CustomShaderMaterial.js';
import {Color} from "../math/Color.js";
import {FRONT_AND_BACK_SIDE} from '../constants.js';

/**
 * Material of ZLines. The points and the stroke and segment tables are the two
 * instance data textures, see ZLinesData; the uniforms are the sample count per
 * segment (the ceiling when the level of detail is on), the level-of-detail
 * tolerance in pixels (0 turns the shader's clamp off), the half width, whether the width is in pixels or in world units,
 * the margin in pixels the strip is drawn beyond the width, the texel where the
 * segments start, and the instance offset that ZLines.draw() sets per sub-draw.
 * Has the pick and outline modes, see Material; a pass can take its own line
 * width, see setLineWidth().
 *
 * The material is transparent by default: the edges are antialiased through
 * alpha, which needs blending, and RenderCore blends only the transparent
 * queue. depthWrite stays on. The pick and outline modes draw opaque.
 */
export class ZLinesBasicMaterial extends CustomShaderMaterial {

    constructor(args = {}) {
        super();

        this.type = "ZLinesBasicMaterial";
        this.programName = "basic_zlines";
        this._passModes = [Material.MODE.PICK, Material.MODE.OUTLINE];

        this.setUniform("u_Samples", args.samples !== undefined ? args.samples : 1);
        this.setUniform("u_LodTol", args.lodTolerance !== undefined ? args.lodTolerance : 0.0);
        this.setUniform("u_HalfWidth", (args.lineWidth !== undefined ? args.lineWidth : 2.0) / 2.0);
        this.setUniform("u_ScreenWidth", args.screenWidth !== undefined ? args.screenWidth : true);
        this.setUniform("u_Margin", args.margin !== undefined ? args.margin : 1.0);
        this.setUniform("u_SegBase", 0);
        this.setUniform("u_InstanceOffset", 0);

        this.transparent = args.transparent !== undefined ? args.transparent : true;

        this.emissive = args.emissive ? args.emissive : new Color(0, 0, 0);
        this.side = FRONT_AND_BACK_SIDE;
    }

    get emissive() { return this._emissive; }
    set emissive(val) {
        this._emissive = val;
        if (this._onChangeListener) {
            var update = {uuid: this._uuid, changes: {emissive: this._emissive.getHex()}};
            this._onChangeListener.materialUpdate(update)
        }
    }

    get samples() { return this.getUniform("u_Samples"); }
    set samples(n) { this.setUniform("u_Samples", n); }

    // The sagitta allowed per chord in pixels; 0 draws every segment with u_Samples quads.
    get lodTolerance() { return this.getUniform("u_LodTol"); }
    set lodTolerance(px) { this.setUniform("u_LodTol", px); }

    /** The line width of every pass; setting it drops the widths set for one pass. */
    get lineWidth() { return this.getLineWidth(); }
    set lineWidth(w) { this.setLineWidth(w); }

    /**
     * Set the line width of the pass of `mode` (Material.MODE), over the width of
     * every pass; without `mode` the width of every pass, which drops the widths
     * set for one pass.
     */
    setLineWidth(w, mode = undefined) {
        if (mode === undefined)
            for (const m of Object.values(Material.MODE)) this.removeUniform("u_HalfWidth", m);
        this.setUniform("u_HalfWidth", w / 2.0, mode);
    }

    /** The line width the pass of `mode` draws with; without `mode` the width of every pass. */
    getLineWidth(mode = undefined) { return 2.0 * this.getUniform("u_HalfWidth", mode); }

    get screenWidth() { return this.getUniform("u_ScreenWidth"); }
    set screenWidth(b) { this.setUniform("u_ScreenWidth", b); }

    get margin() { return this.getUniform("u_Margin"); }
    set margin(px) { this.setUniform("u_Margin", px); }

    get segBase() { return this.getUniform("u_SegBase"); }
    set segBase(n) { this.setUniform("u_SegBase", n); }

    update(data) {
        super.update(data);
        for (let prop in data) {
            switch (prop) {
                case "emissive":
                    this._emissive = data.emissive;
                    delete data.emissive;
                    break;
            }
        }
    }
}
