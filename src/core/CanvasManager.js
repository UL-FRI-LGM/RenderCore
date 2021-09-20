/**
 * Created by Sebastien.
 */

 export class CanvasManager {
	//CONST
	constructor(parentDOM) {
		this._parentDOM = (parentDOM !== undefined) ? parentDOM : null;

		// Currently selected canvas
		this._activeCanvas = null;

		// List of all canvases
		this._canvases = {};
	}

	//SET GET
	set parentDOM(parentDOM){
		this._parentDOM = parentDOM;
	}
	set activeCanvas(canvas){
		this.swapCanvas(this._activeCanvas, canvas);
		this._activeCanvas = canvas;

		if(this._canvases[canvas._uuid] === undefined) this.addCanvas(canvas);
	}
	set canvases(canvases){
		this._renderers = canvases;
	}

	get parentDOM(){
		return this._parentDOM;
	}
	get activeCanvas(){
		return this._activeCanvas;
	}
	get canvases(){
		return this._canvases;
	}

	//FUNC
	addCanvas(canvas){
		if(this._canvases[canvas._uuid] === undefined){
			this._canvases[canvas._uuid] = canvas;
		}
	}

	swapCanvas(previousCanvas, newCanvas){
		if(this._activeCanvas !== null) {
			/*let canvasesInBody = this._parentDOM.getElementsByTagName("canvas");

			for (let c = 0; c < canvasesInBody.length; c++) {
				if (canvasesInBody[c].id === previousCanvas.canvasDOM.id) {
					//canvasesInBody[c] = newCanvas.canvasDOM;
					canvasesInBody[c].parentNode.replaceChild(newCanvas.canvasDOM, canvasesInBody[c]);
					return;
				}
			}*/

			this._parentDOM.replaceChild(newCanvas.canvasDOM, previousCanvas.canvasDOM);
		}else{
			this._parentDOM.appendChild(newCanvas.canvasDOM);
		}
	}

	cycle(){
		let arrayOfCanvases = Object.keys(this._canvases);

		for(let i = 0; i < arrayOfCanvases.length; i++){
			if(arrayOfCanvases[i] === this._activeCanvas._uuid){
				let previousCanvas = this._activeCanvas;

				if(i < arrayOfCanvases.length - 1){
					//restore next
					this._activeCanvas = this._canvases[arrayOfCanvases[i+1]];
				}else{
					//restore next (first)
					this._activeCanvas = this._canvases[arrayOfCanvases[0]];
				}


				//swap canvas
				this.swapCanvas(previousCanvas, this._activeCanvas);


				console.log("Setting active canvas to: " + this._activeCanvas._uuid);
				return;
			}
		}
	}
};