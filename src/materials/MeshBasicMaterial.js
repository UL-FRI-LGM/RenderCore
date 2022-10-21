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

		this._emissive = new Color(Math.random() * 0x000000);
		this._color = new Color(Math.random() * 0xffffff);

		this.programName = "basic";
	}

	set emissive(val) {
		if (!val.equals(this._emissive)) {
			this._emissive = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {emissive: this._emissive.getHex()}};
				this._onChangeListener.materialUpdate(update)
			}
		}
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

	get emissive() { return this._emissive; }

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
		if (this.requiredProgramTemplate !== null) {
			return this.requiredProgramTemplate;
		}

		this.resetProgramFlagsAndValues();


		this.requiredProgramTemplate = new MaterialProgramTemplate(this.programName2, this.flags, this.values, renderer);
		return this.requiredProgramTemplate;
	}

	/**
	 * Serialize object to JSON.
	 *
	 * @returns JSON object.
	 */
	toJson() {
		var obj = super.toJson();

		obj.emissive = this._emissive.getHex();
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
		material._emissive = new Color(obj.emissive);
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
				case "emissive":
					this._emissive = data.emissive;
					delete data.color;
					break;
				case "color":
					this._color = data.color;
					delete data.color;
					break;
			}
		}
	}
}