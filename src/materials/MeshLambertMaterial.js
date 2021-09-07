import {Material} from './Material.js';
import {Color} from '../math/Color.js';
import {MaterialProgramTemplate} from '../program_management/MaterialProgramTemplate.js';


export class MeshLambertMaterial extends Material {

	constructor() {
		super(Material);

		this.type = "MeshLambertMaterial";

		// Diffuse
		this._color = new Color(Math.random() * 0xffffff);
		this._emissive = new Color(Math.random() * 0xffffff);

        this.programName = "lambert";
	}

	set color(val) {
		this._color = val;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {color: this._color.getHex()}};
			this._onChangeListener.materialUpdate(update)
		}
	}
	set emissive(val) {
		this._emissive = val;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {emissive: this._emissive.getHex()}};
			this._onChangeListener.materialUpdate(update)
		}
	}

	get color() { return this._color; }
	get emissive() { return this._emissive; }

	resetProgramFlagsAndValues(){
		super.resetProgramFlagsAndValues();
	}

	requiredProgram(renderer = undefined) {
		// If the template is already generate use it
		if (this._requiredProgramTemplate !== null) {
			return this._requiredProgramTemplate;
		}

		this.resetProgramFlagsAndValues();

		this._requiredProgramTemplate = new MaterialProgramTemplate(this.programName2, this.flags, this.values, renderer);
		return this._requiredProgramTemplate;
	}

	toJson() {
		let obj = super.toJson();

		obj.color = this._color.getHex();
		obj.emissive = this._emissive.getHex();

		return obj;
	}

	static fromJson(obj) {
		let material = new MeshPhongMaterial();

		// Material properties
		material = super.fromJson(obj, material);

		// MeshPhongMaterial properties
		material._color = new Color(obj.color);
		material._emissive = new Color(obj.emissive);

		return material;
	}

	update(data) {
		super.update(data);

		for (var prop in data) {
			switch (prop) {
				case "color":
					this._color.setHex(data.color);
					delete data.color;
					break;
				case "emissive":
					this._emissive.setHex(data.emissive);
					delete data.emissive;
					break;
			}
		}
	}
}