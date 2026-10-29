/**
 * Created by Primoz on 8. 11. 2016.
 */

import {FRONT_SIDE, BACK_SIDE, FRONT_AND_BACK_SIDE} from '../constants.js';

import {Material} from './Material.js';

export class CustomShaderMaterial  extends Material {

	constructor(programName, uniforms = {}, attributes = {}) {
		super();

		this.type = "CustomShaderMaterial";

		/**
		 * Javascript maps of custom uniforms and attributes where the key represents attribute/uniform name and value
		 * represents values (values must be presented in the correct format).
		 */
		this._uniforms = uniforms;
		this._attributes = attributes;
		// Uniform values of one pass mode, by mode, over the values in _uniforms
		this._modeUniforms = {};

		// ShaderBuilder flags, values
		this._flagsSB = [];
		this._valuesSB = {};

		// PAY ATTENTION TO THIS - Custom programs have prefix custom in order to avoid collisions with other programs
		this.programName = "custom_" + programName;
	}

	addSBFlag(flag) {
		this._flagsSB.push(flag);
	}

	rmSBFlag(flag) {
		const index = this._flagsSB.indexOf(flag);

		if (index > -1) {
			this._flagsSB.splice(index, 1);
		}
	}

	hasSBFlag(flag) {
		const index = this._flagsSB.indexOf(flag);

		return (index > -1);
	}

	clearSBFlags() {
		this._flagsSB.clear();
	}

	addSBValue(name, value) {
		this._valuesSB[name] = value;
	}

	rmSBValue(name) {
		delete this._valuesSB[name];
	}

	clearSBValues() {
		this._valuesSB = {};
	}

	// region UNIFORM/ATTRIBUTE MANAGEMENT
	/**
	 * Set a uniform for every pass, or with `mode` (Material.MODE) for the pass of that
	 * mode only; the renderer sets the value of the mode over the value of every pass.
	 */
	setUniform(name, value, mode = undefined) {
		if (mode === undefined) {
			this._uniforms[name] = value;
		} else {
			if (this._modeUniforms[mode] === undefined) this._modeUniforms[mode] = {};
			this._modeUniforms[mode][name] = value;
		}
	}

	/**
	 * Remove the value set for every pass, which leaves the values set for single modes, or
	 * with `mode` the value of that mode only.
	 */
	removeUniform(name, mode = undefined) {
		if (mode === undefined) delete this._uniforms[name];
		else if (this._modeUniforms[mode] !== undefined) delete this._modeUniforms[mode][name];
	}

	/** The value the pass of `mode` takes, or without `mode` the value of every pass. */
	getUniform(name, mode = undefined) {
		const own = (mode !== undefined) ? this._modeUniforms[mode] : undefined;
		return (own !== undefined && name in own) ? own[name] : this._uniforms[name];
	}

	setAttribute(name, value) {
		this._attributes[name] = value;
	}

	removeAttribute(name) {
		delete this._attributes[name];
	}

	getAttribute(name) {
		return this._attributes[name];
	}
	// endregion

	resetProgramFlagsAndValues(mode = Material.MODE.COLOR){
		super.resetProgramFlagsAndValues(mode);

		// Add user defined flags
		for (let i = 0; i < this._flagsSB.length; i++) {
			this.flags.push(this._flagsSB[i]);
		}

		// Add user defined values
		for (let name in this._valuesSB) {
			if (this._valuesSB.hasOwnProperty(name)) {
				this.values[name] = this._valuesSB[name];
			}
		}
	}
}