/**
 * Created by Primoz on 18.5.2016.
 */

import {Light} from './Light.js';

export class AmbientLight extends Light {

	constructor (color, intensity) {
		super(color, intensity);

		this.type = "AmbientLight";
	}

	static fromJson(data) {

		var light = new AmbientLight(data.color, data.intensity);

		// Light fromJson
		light = super.fromJson(data, light);

		return light;
	}


};