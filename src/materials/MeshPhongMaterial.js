import {Material} from './Material.js';

import {Color} from '../math/Color.js';

import {MaterialProgramTemplate} from '../program_management/MaterialProgramTemplate.js';

export class MeshPhongMaterial extends Material {

	constructor() {
		super(Material);

		this.type = "MeshPhongMaterial";

		// Diffuse
		this._color = new Color(Math.random() * 0xffffff);
		this._specular = new Color(Math.random() * 0xffffff);
		this._shininess = Math.random() * 16;

        this.programName = "phong";
	}

	set color(val) {
		this._color = val;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {color: this._color.getHex()}};
			this._onChangeListener.materialUpdate(update)
		}
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

	get color() { return this._color; }
	get specular() { return this._specular; }
	get shininess() { return this._shininess; }

	resetProgramFlagsAndValues(){
		super.resetProgramFlagsAndValues();
	}

	requiredProgram(renderer = undefined) {
		// If the template is already generate use it
		if (this.requiredProgramTemplate !== null) {
			return this.requiredProgramTemplate;
		}

		this.resetProgramFlagsAndValues();

		this.requiredProgramTemplate = new MaterialProgramTemplate(this.programName2, this.flags, this.values, renderer);
		return this.requiredProgramTemplate;
	}

	toJson() {
		let obj = super.toJson();

		obj.color = this._color.getHex();
		obj.specular = this._specular.getHex();
		obj.shininess = this._shininess;

		return obj;
	}

	static fromJson(obj) {
		let material = new MeshPhongMaterial();

		// Material properties
		material = super.fromJson(obj, material);

		// MeshPhongMaterial properties
		material._color = new Color(obj.color);
		material._specular = new Color(obj.specular);
		material._shininess = obj.shininess;

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