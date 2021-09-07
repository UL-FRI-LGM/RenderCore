/**
 * Created by Primoz on 29.6.2016.
 */

import {Object3D} from '../core/Object3D.js';

export class Group extends Object3D {
	constructor () {
		super(Object3D);

		this.type = "Group";

		this._frustumCulled = false;
	}

	static fromJson(data) {

		var group = new Group();

		// Object3D fromJson
		group = super.fromJson(data, group);

		return group;
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
