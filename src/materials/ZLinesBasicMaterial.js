import {CustomShaderMaterial} from './CustomShaderMaterial.js';
import {Color} from "../math/Color.js";
import {FRONT_AND_BACK_SIDE} from '../constants.js';
import {Int32Attribute} from "../core/BufferAttribute.js";

/**
 * Material of ZLines. The points and the stroke and segment tables are the two
 * instance data textures, see ZLinesData; the uniforms are the sample count per
 * segment, the half width, whether the width is in pixels or in world units,
 * the margin in pixels the strip is drawn beyond the width, the texel where the
 * segments start, and the instance offset and given-instances switch that
 * ZLines.draw() sets per sub-draw.
 * Picking and outline use clones of this material with the mode flag set, as
 * ZShapeBasicMaterial does.
 *
 * The drawing material is transparent by default: the edges are antialiased
 * through alpha, which needs blending, and RenderCore blends only the
 * transparent queue. depthWrite stays on.
 */
export class ZLinesBasicMaterial extends CustomShaderMaterial {

    constructor(args = {}) {
        super();

        this.type = "ZLinesBasicMaterial";
        this.programName = "basic_zlines";

        this.setUniform("u_Samples", args.samples !== undefined ? args.samples : 1);
        this.setUniform("u_HalfWidth", (args.lineWidth !== undefined ? args.lineWidth : 2.0) / 2.0);
        this.setUniform("u_ScreenWidth", args.screenWidth !== undefined ? args.screenWidth : true);
        this.setUniform("u_Margin", args.margin !== undefined ? args.margin : 1.0);
        this.setUniform("u_SegBase", 0);
        this.setUniform("u_InstanceOffset", 0);
        this.setUniform("u_GivenInstances", false);
        this.setAttribute("a_Instances", Int32Attribute([0], 1, 0x7fffffff));

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

    get lineWidth() { return 2.0 * this.getUniform("u_HalfWidth"); }
    set lineWidth(w) { this.setUniform("u_HalfWidth", w / 2.0); }

    get screenWidth() { return this.getUniform("u_ScreenWidth"); }
    set screenWidth(b) { this.setUniform("u_ScreenWidth", b); }

    get margin() { return this.getUniform("u_Margin"); }
    set margin(px) { this.setUniform("u_Margin", px); }

    get segBase() { return this.getUniform("u_SegBase"); }
    set segBase(n) { this.setUniform("u_SegBase", n); }

    _clone_base() {
        let o = new ZLinesBasicMaterial({
            samples: this.samples, lineWidth: this.lineWidth, screenWidth: this.screenWidth,
            margin: this.margin, emissive: this.emissive, transparent: false
        });
        o.segBase = this.segBase;
        o._instanceData = this._instanceData;
        return o;
    }

    clone_for_picking() {
        let o = this._clone_base();
        o.addSBFlag('PICK_MODE_UINT');
        o.setUniform("u_PickInstance", false);
        return o;
    }

    clone_for_outline() {
        let o = this._clone_base();
        o.addSBFlag('OUTLINE');
        return o;
    }

    // Outline of a list of segments; to be called on the outline clone.
    // ZLines.draw() takes the instance count from the attribute.
    outline_instances_setup(instance_list) {
        this.setUniform("u_GivenInstances", true);
        let buf_attr = this.getAttribute("a_Instances");
        buf_attr.array = new Int32Array(instance_list);
        buf_attr.divisor = 1;
    }
    outline_instances_reset() {
        this.setUniform("u_GivenInstances", false);
        let buf_attr = this.getAttribute("a_Instances");
        buf_attr.array = new Int32Array([0]);
        buf_attr.divisor = 0x7fffffff;
    }

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
