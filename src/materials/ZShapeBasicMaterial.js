import {Material} from './Material.js';
import {CustomShaderMaterial} from './CustomShaderMaterial.js';
import {Color} from "../math/Color.js";
import {FRONT_AND_BACK_SIDE} from '../constants.js';

export class ZShapeBasicMaterial extends CustomShaderMaterial {

    /**
     * Has the pick and outline modes, see Material.
     * WARNING:
     * - constructor does not pass arguments to parent class
     * - evades "custom" in shader name by setting programName after super
     */
    constructor(args = {}){
        super();

        this.type = "ZShapeBasicMaterial";
        this.programName = "basic_zshape";
        this._passModes = [Material.MODE.PICK, Material.MODE.OUTLINE];

        // Uniforms aspect and viewport set by MeshRenderer based on actual viewport
        this.setUniform("ShapeSize", "ShapeSize" in args ? args.ShapeSize : [1.0, 1.0, 1.0]);

        this.color = args.color ? args.color : new Color(Math.random() * 0xffffff);
        this.emissive = args.emissive ? args.emissive : new Color(Math.random() * 0xffffff);
        this.diffuse = args.diffuse ? args.diffuse : new Color(Math.random() * 0xffffff);

        this.side = args.side ? args.side : FRONT_AND_BACK_SIDE;
	//	this._specular = new Color(Math.random() * 0xffffff);
		this._specular = new Color(0.5 * 0xffffff);
		this._shininess = 64;
    }

	set specular(val) {
		this._specular = val;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {specular: this._specular.getHex()}};
			this._onChangeListener.materialUpdate(update)
		}
	}
	set shininess(val) {
		this._shininess = val;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {shininess: this._shininess}};
			this._onChangeListener.materialUpdate(update)
		}
	}

	get specular() { return this._specular; }
	get shininess() { return this._shininess; }

    get color() { return this._color; }
    set color(val) {
        this._color = val;

        // Notify onChange subscriber
        if (this._onChangeListener) {
            var update = {uuid: this._uuid, changes: {color: this._color.getHex()}};
            this._onChangeListener.materialUpdate(update)
        }
    }

    get emissive() { return this._emissive; }
    set emissive(val) {
        this._emissive = val;

        // Notify onChange subscriber
        if (this._onChangeListener) {
            var update = {uuid: this._uuid, changes: {emissive: this._emissive.getHex()}};
            this._onChangeListener.materialUpdate(update)
        }
    }
    get diffuse() { return this._diffuse; }
    set diffuse(val) {
        this._diffuse = val;

        // Notify onChange subscriber
        if (this._onChangeListener) {
            var update = {uuid: this._uuid, changes: {diffuse: this._diffuse.getHex()}};
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
