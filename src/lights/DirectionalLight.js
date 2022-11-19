/**
 * Created by Primoz on 18.5.2016.
 */
import { OrthographicCamera } from '../cameras/OrthographicCamera.js';
import { Vector3 } from '../math/Vector3.js';
import { Texture } from '../RenderCore.js';
import { Light } from './Light.js';

export class DirectionalLight extends Light {

	constructor(color, intensity, args = {}) {
		super(color, intensity, args);

		this.type = "DirectionalLight";

		// Direction
		this._position.set( 0, 1, 0 );

		this.updateMatrix();


		// this better direction?
		this._direction = args.direction ? args.direction : new Vector3(0, 0, -1);


		const cameraZn = new OrthographicCamera(-64, 64, 64, -64, 0, 128);
		this.cameraGroup.add(cameraZn);

		
		this.shadowmap = new Texture();
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


	// toJson >> Nothing to add
	static fromJson(data) {
		var light = new directionalLight(data.color, data.intensity);

		// Light fromJson
		light = super.fromJson(data, light);

		return light;
	}
};