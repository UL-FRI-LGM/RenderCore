/**
 * Created by Sebastien.
 */

export class SceneManager {
	//CONST
	constructor() {

		// Currently selected scene
		this._activeScene = null;

		// List of all of all scenes
		this._scenes = {};
	}


	//SET GET
	set activeScene(scene){
		this._activeScene = scene;

		if(this._scenes[scene._uuid] === undefined) this.addScene(scene, undefined);
	}
	set scenes(scenes){
		this._scenes = scenes;
	}

	get activeScene(){
		return this._activeScene;
	}
	get scenes(){
		return this._scenes;
	}


	//FUNC
	addScene(scene, renderParameters){
		if(this._scenes[scene._uuid] === undefined){
			this._scenes[scene._uuid] = scene;
			//this._renderParameters[scene._uuid] = renderParameters;
		}
	}

	cycle(){
		let arrayOfScenes = Object.keys(this._scenes);

		for(let i = 0; i < arrayOfScenes.length; i++){
			if(arrayOfScenes[i] === this._activeScene._uuid){
				if(i < arrayOfScenes.length - 1){
					//restore next
					this._activeScene = this._scenes[arrayOfScenes[i+1]];
				}else{
					//restore next (first)
					this._activeScene = this._scenes[arrayOfScenes[0]];
				}

				console.log("Setting active scene to: " + this._activeScene._uuid);
				return;
			}
		}
	}
};