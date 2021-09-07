/**
 * Created by Sebastien.
 */

export class RenderQueueManager {
	//CONST
	constructor() {

		// Currently selected render queue
		this._activeRenderQueue = null;

		// List of all of all render queues
		this._renderQueues = {};
	}


	//SET GET
	set activeRenderQueue(renderQueue){
		this._activeRenderQueue = renderQueue;

		if(this._renderQueues[renderQueue._uuid] === undefined) this.addRenderQueue(renderQueue);
	}
	get activeRenderQueue(){
		return this._activeRenderQueue;
	}
	set renderQueues(renderers){
		this._renderQueues = renderers;
	}
	get renderQueues(){
		return this._renderQueues;
	}


	//FUNC
	addRenderQueue(renderQueue){
		if(this._renderQueues[renderQueue._uuid] === undefined){
			this._renderQueues[renderQueue._uuid] = renderQueue;
		}
	}

	cycle(){
		const arrayOfRenderQueues = Object.keys(this._renderQueues);

		for(let i = 0; i < arrayOfRenderQueues.length; i++){
			if(arrayOfRenderQueues[i] === this._activeRenderQueue._uuid){
				if(i < arrayOfRenderQueues.length - 1){
					//restore next
					this._activeRenderQueue = this._renderQueues[arrayOfRenderQueues[i+1]];
				}else{
					//restore next (first)
					this._activeRenderQueue = this._renderQueues[arrayOfRenderQueues[0]];
				}

				console.log("Setting active render queue to: " + this._activeRenderQueue._uuid);
				return;
			}
		}
	}
};