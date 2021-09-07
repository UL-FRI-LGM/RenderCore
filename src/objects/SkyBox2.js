import { Cube } from './Cube.js';
import { Color } from '../math/Color.js';
import { SkyBox2BasicMaterial } from '../materials/SkyBox2BasicMaterial.js';
import { Matrix4 } from '../math/Matrix4.js';


export class SkyBox2 extends Cube {
	constructor(args = {}) {
		super(1.0, new Color(1.0, 1.0, 1.0));

		this.type = "SkyBox2";

		this.material = new SkyBox2BasicMaterial();
		this.pickable = false;
		this.material.depthWrite = false;

		this.frustumCulled = false;
		this._modifiedViewMatrix = new Matrix4();
	}


	fillRenderArray(renderArrayManager){
		// Add object to correct render array
		renderArrayManager.skyboxes.addlast(this);
	}
	update(glManager, camera){
		// Updates or derives attributes from the WebGL geometry
		glManager.updateObjectData(this);

		// Derive mv and normal matrices
		this._modifiedViewMatrix.copy(camera.matrixWorldInverse);
		this._modifiedViewMatrix.setPosition(0, 0, 0);
		this.modelViewMatrix.multiplyMatrices(this._modifiedViewMatrix, this._matrixWorld);
		this.normalMatrix.getNormalMatrix(this._modelViewMatrix);
	}
};