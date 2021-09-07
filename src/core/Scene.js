/**
 * Created by Primoz on 27. 03. 2016.
 */
import {Object3D} from './Object3D.js';

export class Scene extends Object3D {

	/**
	 * Create new Scene object.
	 */
	constructor() {
		super(Object3D);

		this.type = "Scene";

		this._autoUpdate = true; // checked by the renderer

		this.frustumCulled = false;
	}

	/**
	 * Check if auto update in on.
	 *
	 * @returns True if auto update is on.
	 */
	get autoUpdate() { return this._autoUpdate; }

	/**
	 * Turn on auto update.
	 *
	 * @param val True to turn auto update on.
	 */
	set autoUpdate(val) {
		if (val !== this._autoUpdate) {
			this._autoUpdate = val;

			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {autoUpdate: this._autoUpdate}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}

	/**
	 * Serialize object to JSON.
	 *
	 * @returns JSON object.
	 */
	toJson() {
		let obj = super.toJson();

		// Export auto update setting
		obj.autoUpdate = this._autoUpdate;

		return obj;
	}

	/**
	 * Create a new scene from the JSON data.
	 *
	 * @param data JSON data.
	 * @returns New scene.
	 */
	static fromJson(data) {
		let scene = new Scene();

		// Import Object3D parameters
		scene = super.fromJson(data, scene);

		// Import auto update setting
		scene._autoUpdate = data.autoUpdate;

		return scene;
	}

	/**
	 * Update the scene.
	 *
	 * @param data Update data.
	 */
	update(data) {
		super.update(data);

		for (let prop in data) {
			switch (prop) {
				case "autoUpdate":
					this._autoUpdate = data.autoUpdate;
			}
		}
	}


	fillRenderArray(){
        //NOOP
	}
	project(){
		//NOOP
	}
	getRequiredPrograms(renderer){
		//NOOP
		return [];
	}
	update(glManager, camera){
		//NOOP
	}
};
