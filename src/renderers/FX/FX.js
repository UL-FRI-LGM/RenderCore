import {RenderQueue} from "./../RenderQueue.js"


export class FX extends RenderQueue {

	constructor(renderer, inputs, outputs) {
		super(renderer);

		this._inputs = inputs;
		this._outputs = outputs;
	}

	static iterateSceneR(object, callback) {
		if (object === null || object === undefined) {
			return;
		}

		if(object.children.length > 0) {
			for (let i = 0; i < object.children.length; i++) {
				FX.iterateSceneR(object.children[i], callback);
			}
		}

		callback(object);
	}

	get inputs(){
		return this._inputs;
	}
	get outputs(){
		return this._outputs;
	}

};
FX.input = class {
	constructor(name){
		this._name = name;
	}

	get name(){
		return this._name;
	}
	connect(){

	}
}
FX.output = class{
	constructor(name){
		this._name = name;
	}

	get name(){
		return this._name;
	}
	connect(){

	}
}