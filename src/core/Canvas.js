/**
 * Created by Sebastien.
 */

import {_Math} from '../math/Math.js';


export class Canvas {
	//CONST
	constructor(parentDOM) {
		this._canvasDOM = this.generateCanvasDOM();
		this._parentDOM = (parentDOM !== undefined) ? parentDOM.appendChild(this._canvasDOM).parentElement : null;

		this._uuid = _Math.generateUUID();

		this.updateSize();
	}

	//SET GET
	set canvasDOM(canvasDOM){
		this._canvasDOM = canvasDOM;
	}
	set parentDOM(parentDOM){
		this._parentDOM = parentDOM.appendChild(this._canvasDOM).parentElement;
		canvasDOM.width = parentDOM.clientWidth;
		canvasDOM.height = parentDOM.clientHeight;
	}
	set uuid(uuid){
		this._uuid = uuid;
	}
	set width(width){
		this._canvasDOM.width = width;
	}
	set height(height){
		this._canvasDOM.height = height;
	}

	get canvasDOM(){
		return this._canvasDOM;
	}
	get parentDOM(){
		return this._parentDOM;
	}
	get uuid(){
		return this._uuid;
	}
	get width(){
		return this._canvasDOM.width;
	}
	get height(){
		return this._canvasDOM.height;
	}

	//FUNC
	generateCanvasDOM(id = "rc-canvas"){
		const canvasDOM = document.createElement("canvas");
		canvasDOM.id = id;

		//make it visually fill the positioned parent
		canvasDOM.style.width ="100%";
		canvasDOM.style.height="100%";
		canvasDOM.style.padding = '0';
		canvasDOM.style.margin = '0';
		//canvasDOM.style.border = "1px solid";

		return canvasDOM;
	}
	updateSize(){
		//set the internal size to match
		this._canvasDOM.width = this._canvasDOM.clientWidth;
		this._canvasDOM.height = this._canvasDOM.clientHeight;
	}
}