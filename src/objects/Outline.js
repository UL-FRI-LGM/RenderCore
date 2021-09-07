/**
 * Created by Sebastien.
 */
import {Object3D} from "../core/Object3D.js";
import {Geometry} from "./Geometry.js";
import {PickingShaderMaterial} from "../materials/PickingShaderMaterial.js";
import {OutlineBasicMaterial} from "../materials/OutlineBasicMaterial.js";


export class Outline extends Object3D {
    constructor(geometry, material, pickingMaterial) {
        super();

        this.type = "Outline";
        this._geometry = (geometry !== undefined) ? geometry : new Geometry();
        this._material = (material !== undefined) ? material : new OutlineBasicMaterial();
        this._pickingMaterial = (pickingMaterial !== undefined) ? pickingMaterial : new PickingShaderMaterial("TRIANGLES");

        this.pickable = false;
    }

    set geometry(geometry) { this._geometry = geometry; }
    set material(material) {
        this._material = material;
        this._staticStateDirty = true;
    }
    set pickingMaterial(pickingMaterial) { this._pickingMaterial = pickingMaterial; }
    get geometry() { return this._geometry; }
    get material() { return this._material; }
    get pickingMaterial() { return this._pickingMaterial; }

    fillRenderArray(){
        //NOOP
    }
    project(projScreenMatrix){

		// Add object to correct render array
		if (this.material.transparent) {
			this._zVector.setFromMatrixPosition(this.matrixWorld);
			this._zVector.applyMatrix4(projScreenMatrix);
			//this._z = this._zVector.z;
		}
	}
    getRequiredPrograms(renderer){
		return [];
	}
	update(glManager){

	}
}