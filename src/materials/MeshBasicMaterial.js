/**
 * Created by Primoz on 4.4.2016.
 */

import {Material} from './Material.js';
import {MaterialProgramTemplate} from '../program_management/MaterialProgramTemplate.js';

import {Color} from '../math/Color.js';

export class MeshBasicMaterial extends Material {

	/**
	 * Create new MeshBasicMaterial object.
	 */
	constructor() {
		super(Material);

		this.type = "MeshBasicMaterial";

		this._color = new Color(Math.random() * 0xffffff); // emissive

		this.programName = "basic";
	}

	/**
	 * Set color of the material.
	 *
	 * @param val Color to be set.
	 */
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

	/**
	 * Get color of the material.
	 *
	 * @returns Color of the material.
	 */
	get color() { return this._color; }

	resetProgramFlagsAndValues(){
		super.resetProgramFlagsAndValues();
	}

	/**
	 * Retrieve material program.
	 *
	 * @returns Material program.
	 */
	requiredProgram(renderer = undefined) {
		// If the template is already generate use it
		if (this._requiredProgramTemplate !== null) {
			return this._requiredProgramTemplate;
		}

		this.resetProgramFlagsAndValues();


		this._requiredProgramTemplate = new MaterialProgramTemplate(this.programName2, this.flags, this.values, renderer);
		return this._requiredProgramTemplate;
	}

	/**
	 * Serialize object to JSON.
	 *
	 * @returns JSON object.
	 */
	toJson() {
		var obj = super.toJson();

		obj.color = this._color.getHex();

		return obj;
	}

	/**
	 * Create a new material from the JSON data.
	 *
	 * @param obj JSON data.
	 * @returns Created material.
	 */
	static fromJson(obj) {
		var material = new MeshBasicMaterial();

		// Material properties
		material = super.fromJson(obj, material);

		// MeshBasicMaterial properties
		material._color = new Color(obj.color);

		return material;
	}

	/**
	 * Update the material with settings from data.
	 *
	 * @param data Update data.
	 */
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