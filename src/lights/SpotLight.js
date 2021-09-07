import { PerspectiveCamera } from '../cameras/PerspectiveCamera.js';
import { Vector3 } from '../math/Vector3.js';
import {Light} from './Light.js';

export class SpotLight extends Light {

    constructor(args = {}) {
        super(args.color, args.intensity, args);

		this.type = "SpotLight";

        this._distance = args.distance ? args.distance : 0;
		this._decay = args.decay ? args.decay : 1;
        this._cutoff = args.cutoff ? args.cutoff : Math.PI/4.0;
        this._outerCutoff = args.outerCutoff ? args.outerCutoff : this.cutoff * 1.1;
        this._direction = args.direction ? args.direction : new Vector3(0, 0, -1);
        this._up = args.up ? args.up : new Vector3(0, 1, 0);


		const cameraZn = new PerspectiveCamera(90, 1, 8, 128);
		this.cameraGroup.add(cameraZn);
    }

    get distance() { return this._distance; }
    set distance(distance) {
		this._distance = distance;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {distance: this._distance}};
			this._onChangeListener.objectUpdate(update)
		}
	}
	get decay() { return this._decay; }
    set decay(decay) {
		this._decay = decay;

		// Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {decay: this._decay}};
			this._onChangeListener.objectUpdate(update)
		}
	}
    get cutoff(){
        return this._cutoff;
    }
    set cutoff(cutoff){
        this._cutoff = cutoff;

        // Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {cutoff: this._cutoff}};
			this._onChangeListener.objectUpdate(update)
		}
    }
    get outerCutoff(){
        return this._outerCutoff;
    }
    set outerCutoff(outerCutoff){
        this._outerCutoff = outerCutoff;

        // Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {outerCutoff: this._outerCutoff}};
			this._onChangeListener.objectUpdate(update)
		}
    }
    get direction(){
        return this._direction;
    }
    set direction(direction){
        this._direction = direction;

        // Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {direction: this._direction}};
			this._onChangeListener.objectUpdate(update)
		}
    }

    get shadowNear() { return this.cameraGroup.children[0].near; }
	set shadowNear(shadowNear){
        this.cameraGroup.children[0].near = shadowNear;

        // Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {shadowNear: this.cameraGroup.children[0].near}};
			this._onChangeListener.objectUpdate(update)
		}
    }

	get shadowFar() { return this.cameraGroup.children[0].far; }
	set shadowFar(shadowFar){
        this.cameraGroup.children[0].far = shadowFar;

        // Notify onChange subscriber
		if (this._onChangeListener) {
			var update = {uuid: this._uuid, changes: {shadowFar: this.cameraGroup.children[0].far}};
			this._onChangeListener.objectUpdate(update)
		}
    }

	get fov() { return this.cameraGroup.children[0].fov; }
	set fov(fov) {
		if (fov !== this.cameraGroup.children[0].fov) {
			this.cameraGroup.children[0].fov = fov;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {fov: this.cameraGroup.children[0].fov}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}

};