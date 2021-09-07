/**
 * Created by Sebastien.
 */

import {_Math} from '../math/Math.js';

export class Canvas {
	//CONST
	constructor(canvas = undefined, id = "rc-canvas") {
		this._canvas = null;
		if(canvas !== undefined){
			this._canvas = canvas;
		}else {
			this._canvas = this.generateCanvas(id);
		}

		this._uuid = _Math.generateUUID();
	}

	//SET GET
	set canvas(canvas){
		this._canvas = canvas;
	}
	set uuid(uuid){
		this._uuid = uuid;
	}

	get canvas(){
		return this._canvas;
	}
	get uuid(){
		return this._uuid;
	}

	//FUNC
	generateCanvas(id){
		let canvas = document.createElement("canvas");
		canvas.id = id;
		canvas.width = document.body.clientWidth;
		canvas.height = document.body.clientHeight;
		canvas.style.padding = '0';
		canvas.style.margin = '0';
		//canvas.style.border = "1px solid";

		return canvas;
	}
}