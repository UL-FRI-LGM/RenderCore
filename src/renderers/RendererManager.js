/**
 * Created by Sebastien.
 */

export class RendererManager {
	//CONST
	constructor() {

		// Currently selected renderer
		this._activeRenderer = null;

		// List of all of all renderers
		this._renderers = {};
	}


	//SET GET
	set activeRenderer(renderer){
		this._activeRenderer = renderer;

		if(this._renderers[renderer._uuid] === undefined) this.addRenderer(renderer);
	}
	set renderers(renderers){
		this._renderers = renderers;
	}

	get activeRenderer(){
		return this._activeRenderer;
	}
	get renderers(){
		return this._renderers;
	}


	//FUNC
	addRenderer(renderer){
		if(this._renderers[renderer._uuid] === undefined){
			this._renderers[renderer._uuid] = renderer;
		}
	}

	cycle(){
		let arrayOfRenderers = Object.keys(this._renderers);

		for(let i = 0; i < arrayOfRenderers.length; i++){
			if(arrayOfRenderers[i] === this._activeRenderer._uuid){
				if(i < arrayOfRenderers.length - 1){
					//restore next
					this._activeRenderer = this._renderers[arrayOfRenderers[i+1]];
				}else{
					//restore next (first)
					this._activeRenderer = this._renderers[arrayOfRenderers[0]];
				}

				//reset clear color
				console.log("Setting active renderer to: " + this._activeRenderer._uuid);
				return;
			}
		}
	}
};