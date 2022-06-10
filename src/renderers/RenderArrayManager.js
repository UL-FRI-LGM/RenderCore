import {_Math} from '../math/Math.js';
import { RenderArray } from './RenderArray.js';


export class RenderArrayManager{
    constructor(){
        // Unique identifier
        this._uuid = _Math.generateUUID();
        this._renderArrays = new Map();

        this._skyboxes = new RenderArray();
        this._opaqueObjects = new RenderArray();
		this._transparentObjects = new RenderArray();
		this._lights = new RenderArray();
    }


    //SET/GET
    get uuid(){ return this._uuid; }
    get renderArrays(){ return this._renderArrays; }

    get skyboxes() { return this._skyboxes; }
    get opaqueObjects() { return this._opaqueObjects; }
    get transparentObjects() { return this._transparentObjects; }
    get lights() { return this._lights; }


    //FUNC
    clearAll(){
        for(let [key, renderArray] of this._renderArrays){
            renderArray.clear();
        }

        this._skyboxes.clear();
        this._opaqueObjects.clear();
		this._transparentObjects.clear();
		this._lights.clear();
    }
}