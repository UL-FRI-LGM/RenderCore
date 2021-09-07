/**
 * Created by lanab on 18-Apr-17.
 */

import {Color} from '../math/Color.js';

import {Material} from './Material.js';
import {MeshBasicMaterial} from './MeshBasicMaterial.js';

import {MaterialProgramTemplate} from '../program_management/MaterialProgramTemplate.js';

export class VolumeBasicMaterial extends Material {

	constructor() {
		super(Material);

		this.type = "VolumeBasicMaterial";

		this._color = new Color(Math.random() * 0xffffff); // emissive

        this.programName = "basicVolume";
	}

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

	get color() { return this._color; }

	resetProgramFlagsAndValues(){
		super.resetProgramFlagsAndValues();
	}

	requiredProgram(renderer = undefined, override = false) {
		if(override){//TODO DELETE if statemenet
			console.warn("THIS SEGMENT IS DEPRECATED");
			this.resetProgramFlagsAndValues();
			return;
		}

		// If the template is already generate use it
		if (this._requiredProgramTemplate !== null) {
			return this._requiredProgramTemplate;
		}

		this.resetProgramFlagsAndValues();

		this._requiredProgramTemplate = new MaterialProgramTemplate(this.programName2, this.flags, this.values, renderer);
		return this._requiredProgramTemplate;
	}

	toJson() {
		var obj = super.toJson();

		obj.color = this._color.getHex();

		return obj;
	}

	static fromJson(obj) {
		var material = new MeshBasicMaterial();

		// Material properties
		material = super.fromJson(obj, material);

		// MeshBasicMaterial properties
		material._color = new Color(obj.color);

		return material;
	}

	update(data) {
		super.update(data);

		for (var prop in data) {
			switch (prop) {
				case "color":
					this._color = data.color;
					delete data.color;
					break;
			}
		}
	}
}