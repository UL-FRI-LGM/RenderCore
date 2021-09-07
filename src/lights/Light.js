/**
 * Created by primoz on 18.5.2016.
 */

import {Object3D} from '../core/Object3D.js';
import {Color} from '../math/Color.js';
import { Group } from '../objects/Group.js';

export class Light extends Object3D {

	constructor(color, intensity, args = {}) {
		super(Object3D);

		this.type = "Light";

		this._color = new Color(color);
		this._intensity  = intensity !== undefined ? intensity : 1;


		//
		this._frustumCulled = false;
		this._castShadows = args.castShadows !== undefined ? args.castShadows : false;
		this._hardShadows = args.hardShadows !== undefined ? args.hardShadows : true;
		this._minBias = args.minBias ? args.minBias : 0.005;
		this._maxBias = args.maxBias ? args.maxBias : 0.05;

		this._cameraGroup = new Group();
		this.add(this._cameraGroup);

		this.frustumVisible = false;
	}

	get color () { return this._color; }
	get intensity () { return this._intensity; }

	set color (val) {
		this._color = val;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {color: this._color.getHex()}};
			this._onChangeListener.objectUpdate(update)
		}
	}
	set intensity (val) {
		this._intensity = val;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {intensity: this._intensity}};
			this._onChangeListener.objectUpdate(update)
		}
	}
	get castShadows() { return this._castShadows; }
	set castShadows(castShadows) {
		this._castShadows = castShadows;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {castShadows: this._castShadows}};
			this._onChangeListener.objectUpdate(update)
		}
	}

	get hardShadows() { return this._hardShadows; }
	set hardShadows(hardShadows){
        this._hardShadows = hardShadows;

        // Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {hardShadows: this._hardShadows}};
			this._onChangeListener.objectUpdate(update)
		}
    }
	get minBias() { return this._minBias; }
	set minBias(minBias){
        this._minBias = minBias;

        // Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {minBias: this._minBias}};
			this._onChangeListener.objectUpdate(update)
		}
    }
	get maxBias() { return this._maxBias; }
	set maxBias(maxBias){
        this._maxBias = maxBias;

        // Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {maxBias: this._maxBias}};
			this._onChangeListener.objectUpdate(update)
		}
    }


	get cameraGroup(){ return this._cameraGroup; }
	set cameraGroup(cameraGroup){
        this._cameraGroup = cameraGroup;

        // Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {cameraGroup: this._cameraGroup}};
			this._onChangeListener.objectUpdate(update)
		}
    }

	get frustumVisible() { return this._cameraGroup.visible; }
	set frustumVisible(frustumVisible){
		this._cameraGroup.visible = frustumVisible;

		for(let c = 0; c < this._cameraGroup.children.length; c++){
			const camera = this._cameraGroup.children[c];
			camera.frustumVisible = frustumVisible;
		}
	}

	toJson() {
		var obj = super.toJson();

		// Light params
		obj.color = this._color.getHex();
		obj.intensity = this.intensity;

		return obj;
	}

	static fromJson(data, light) {

		if (!light) {
				var light = new Light(data.color, data.intensity);
		}

		// Object3D fromJson
		light = super.fromJson(data, light);

		return light;
	}

	update(data) {
		super.update(data);

		for (var prop in data) {
			switch(prop) {
				case "color":
					this._color.setHex(data.color);
					delete data.color;
					break;
				case "intensity":
					this._intensity = data.intensity;
					delete data.intensity;
					break;
			}
		}
	}


	fillRenderArray(renderArrayManager){
		// If the object is light push it to light cache array
		renderArrayManager.lights.addlast(this);
	}
	project(){
		//NOOP
	}
	getRequiredPrograms(renderer){
		return [];
	}
	update(glManager){

	}
};