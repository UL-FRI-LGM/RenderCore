/**
 * Created by Sebastien.
 */

export class CanvasManager {
	//CONST
	constructor(documentBody) {
		this._documentBody = documentBody;

		// Currently selected canvas
		this._activeCanvas = null;

		// List of all of all canvases
		this._canvases = {};
	}

	//SET GET
	set documentBody(documentBody){
		this._documentBody = documentBody;
	}
	set activeCanvas(canvas){
		this.swapCanvas(this._activeCanvas, canvas);
		this._activeCanvas = canvas;

		if(this._canvases[canvas._uuid] === undefined) this.addCanvas(canvas);
	}
	set canvases(canvases){
		this._renderers = canvases;
	}

	get documentBody(){
		return this._documentBody;
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
			/*let canvasesInBody = this._documentBody.getElementsByTagName("canvas");

			for (let c = 0; c < canvasesInBody.length; c++) {
				if (canvasesInBody[c].id === previousCanvas.canvas.id) {
					//canvasesInBody[c] = newCanvas.canvas;
					canvasesInBody[c].parentNode.replaceChild(newCanvas.canvas, canvasesInBody[c]);
					return;
				}
			}*/

			this._documentBody.replaceChild(newCanvas.canvas, previousCanvas.canvas);
		}else{
			this._documentBody.appendChild(newCanvas.canvas);
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