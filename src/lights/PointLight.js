/**
 * Created by Primoz on 18.5.2016.
 */

import { PerspectiveCamera } from '../cameras/PerspectiveCamera.js';
import { Vector3 } from '../math/Vector3.js';
import { CubeTexture } from '../RenderCore.js';
import {Light} from './Light.js';

export class PointLight extends Light {

	constructor (color, intensity, distance, decay, args = {}) {
		super(color, intensity, args);

		this.type = "PointLight";

		this._distance = (distance !== undefined) ? distance : 0;
		this._decay = (decay !== undefined) ? decay : 1;

		this._constant = (args.constant !== undefined) ? args.constant : 1.0;
		this._linear = (args.linear !== undefined) ? args.linear : 0.01;
		this._quadratic = (args.quadratic !== undefined) ? args.quadratic : 0.0001;

		const cameraXp = new PerspectiveCamera(90, 1, 8, 128);
		const cameraXn = new PerspectiveCamera(90, 1, 8, 128);
		const cameraYp = new PerspectiveCamera(90, 1, 8, 128);
		const cameraYn = new PerspectiveCamera(90, 1, 8, 128);
		const cameraZp = new PerspectiveCamera(90, 1, 8, 128);
		const cameraZn = new PerspectiveCamera(90, 1, 8, 128);

		cameraXp.lookAt(new Vector3(+1, +0, +0), new Vector3(+0, -1, +0));
		cameraXn.lookAt(new Vector3(-1, +0, +0), new Vector3(+0, -1, +0));
		cameraYp.lookAt(new Vector3(+0, +1, +0), new Vector3(+0, +0, +1));
		cameraYn.lookAt(new Vector3(+0, -1, +0), new Vector3(+0, +0, -1));
		cameraZp.lookAt(new Vector3(+0, +0, +1), new Vector3(+0, -1, +0));
		cameraZn.lookAt(new Vector3(+0, +0, -1), new Vector3(+0, -1, +0));

		this.cameraGroup.add(cameraXp);
		this.cameraGroup.add(cameraXn);
		this.cameraGroup.add(cameraYp);
		this.cameraGroup.add(cameraYn);
		this.cameraGroup.add(cameraZp);
		this.cameraGroup.add(cameraZn);

		this.shadowmap = new CubeTexture( { size: args.smap_size ? args.smap_size : 256 } );
	}

	set distance(dist) {
		this._distance = dist;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {distance: this._distance}};
			this._onChangeListener.objectUpdate(update)
		}
	}
	set decay(dec) {
		this._decay = dec;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {decay: this._decay}};
			this._onChangeListener.objectUpdate(update)
		}
	}

	get distance() { return this._distance; }
	get decay() { return this._decay; }


	get shadowNear() { return this.cameraGroup.children[5].near; }
	set shadowNear(shadowNear){
        this.cameraGroup.children[0].near = shadowNear;
		this.cameraGroup.children[1].near = shadowNear;
		this.cameraGroup.children[2].near = shadowNear;
		this.cameraGroup.children[3].near = shadowNear;
		this.cameraGroup.children[4].near = shadowNear;
		this.cameraGroup.children[5].near = shadowNear;

        // Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {shadowNear: this.cameraGroup.children[5].near}};
			this._onChangeListener.objectUpdate(update)
		}
    }

	get shadowFar() { return this.cameraGroup.children[5].far; }
	set shadowFar(shadowFar){
        this.cameraGroup.children[0].far = shadowFar;
		this.cameraGroup.children[1].far = shadowFar;
		this.cameraGroup.children[2].far = shadowFar;
		this.cameraGroup.children[3].far = shadowFar;
		this.cameraGroup.children[4].far = shadowFar;
		this.cameraGroup.children[5].far = shadowFar;

        // Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {shadowFar: this.cameraGroup.children[5].far}};
			this._onChangeListener.objectUpdate(update)
		}
    }

	get constant(){ return this._constant; }
	set constant(constant) {
		this._constant = constant;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {constant: this._constant}};
			this._onChangeListener.objectUpdate(update)
		}
	}
	get linear(){ return this._linear; }
	set linear(linear) {
		this._linear = linear;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {linear: this._linear}};
			this._onChangeListener.objectUpdate(update)
		}
	}
	get quadratic(){ return this._quadratic; }
	set quadratic(quadratic) {
		this._quadratic = quadratic;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {quadratic: this._quadratic}};
			this._onChangeListener.objectUpdate(update)
		}
	}


	toJson() {
		var obj = super.toJson();

		// Point light params
		obj.distance = this._distance;
		obj.intensity = this._decay;

		return obj;
	}

	static fromJson(data) {

		var light = new PointLight(data.color, data.intensity, data.distance, data.decay);

		// Light fromJson
		light = super.fromJson(data, light);

		return light;
	}

	update(data) {
		super.update(data);

		for (var prop in data) {
			switch(prop) {
				case "distance":
					this._distance.set(data.distance);
					delete data.distance;
					break;
				case "decay":
					this._decay = data.decay;
					delete data.decay;
					break;
			}
		}
	}
};