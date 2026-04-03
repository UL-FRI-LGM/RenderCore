import {CustomShaderMaterial} from './CustomShaderMaterial.js';
import {Color} from "../math/Color.js";
import {FRONT_AND_BACK_SIDE} from '../constants.js';
import {Int32Attribute} from "../core/BufferAttribute.js";
import { Vector3 } from '../RenderCore.js';

export class ZMultiMeshBasicMaterial extends CustomShaderMaterial {

    /**
     * WARNING:
     * - constructor does not pass arguments to parent class
     * - evades "custom" in shader name by setting programName after super
     */
    constructor(args = {}){
        super();

        this.type = "ZMultiMeshBasicMaterial";
        this.programName = "basic_zmultimesh";

        this.color = args.color ? args.color : new Color(Math.random() * 0xffffff);
        this.emissive = args.emissive ? args.emissive : new Color(Math.random() * 0xffffff);
        this.diffuse = args.diffuse ? args.diffuse : new Color(Math.random() * 0xffffff);

        this.side = args.side ? args.side : FRONT_AND_BACK_SIDE;
        this.normalFlat = args.normalFlat ? args.normalFlat : false;

	    //	this._specular = new Color(Math.random() * 0xffffff);
		this._specular = new Color(0.5 * 0xffffff);
		this._shininess = 64;

        // this._clippingPlanes = [ { normal: new Vector3(0, 0.7, 0.7), constant: 0 } ];
        // this._useClippingPlanes = true;
    }

    clone_for_picking() {
        let o = new ZMultiMeshBasicMaterial( {
            color: this.color, emissive: this.emissive, diffuse: this.diffuse,
            side: this.side, normalFlat: this.normalFlat,
        } );
        o._clippingPlanes = this._clippingPlanes;
        o._useClippingPlanes = this._useClippingPlanes;
        for (const m of this.maps) o.addMap(m);
        o.addSBFlag('PICK_MODE_UINT');
        o.setUniform("u_PickInstance", false);
        return o;
    }

    clone_for_outline() {
        let o = new ZMultiMeshBasicMaterial( {
            color: this.color, emissive: this.emissive, diffuse: this.diffuse,
            side: this.side,  normalFlat: this.normalFlat
        } );
        o._clippingPlanes = this._clippingPlanes;
        o._useClippingPlanes = this._useClippingPlanes;
        for (const m of this.maps) o.addMap(m);
        o.addSBFlag('OUTLINE');
        return o;
    }

    get color() { return this._color; }
    set color(val) { this._color = val; }
    get emissive() { return this._emissive; }
    set emissive(val) { this._emissive = val; }
    get diffuse() { return this._diffuse; }
    set diffuse(val) { this._diffuse = val;  }
	get specular() { return this._specular; }
	set specular(val) { this._specular = val; }
	get shininess() { return this._shininess; }
	set shininess(val) { this._shininess = val; }

    // Outline - setup / reset for instance list outlining.
    // To be called on outline version (with OUTLINE SB-flag).
    outline_instances_setup(instance_list) {
        this._instanceList = instance_list;
    }
    outline_instances_reset() {
        this._instanceList = null;
    }

    update(data) {
        super.update(data);

        for (let prop in data) {
            switch (prop) {
                case "color":
                    this._color = data.color;
                    delete data.color;
                    break;
                case "emissive":
                    this._emissive = data.emissive;
                    delete data.emissive;
                    break;
                case "diffuse":
                    this._diffuse = data.diffuse;
                    delete data.diffuse;
                    break;
                case "specular":
                    this._specular.setHex(data.specular);
                    delete data.specular;
                    break;
                case "shininess":
                    this._shininess = data.shininess;
                    delete data.shininess;
                    break;
            }
        }
    }
}
