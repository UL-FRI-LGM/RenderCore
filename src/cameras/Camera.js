/**
 * Created by Ziga on 25.3.2016.
 */
import { FRONT_AND_BACK_SIDE } from '../constants.js';
import { Float32Attribute, Uint32Attribute } from '../core/BufferAttribute.js';
import {Object3D} from '../core/Object3D.js';
import { Color } from '../math/Color.js';
import {Matrix4} from '../math/Matrix4.js';
import {Vector3} from '../math/Vector3.js';
import { Vector4 } from '../math/Vector4.js';
import { Cube } from '../objects/Cube.js';
import { Geometry } from '../objects/Geometry.js';
import { Group } from '../objects/Group.js';
import { Line } from '../objects/Line.js';

export class Camera extends Object3D {

	constructor() {
		super(Object3D);

		this.type = "Camera";

		this._matrixWorldInverse = new Matrix4(); 	//VMat
		this._projectionMatrix = new Matrix4(); 	//PMat
        this.projectionMatrixInverse = new Matrix4(); 	//PMatInv

		// Camera up direction
		this._up = new Vector3(0, 1, 0);

		this._frustum = new Group();
		this.add(this._frustum);
        this._frustum.visible = false;
	}


    get matrixWorldInverse () { return this._matrixWorldInverse; }
	set matrixWorldInverse (inverse) { this._matrixWorldInverse = inverse; }

    get projectionMatrix () { return this._projectionMatrix; }
	set projectionMatrix (projection) { this._projectionMatrix = projection; }

    get projectionMatrixInverse() { 
        this._projectionMatrixInverse.getInverse(this._projectionMatrix);

        return this._projectionMatrixInverse; 
    }
	set projectionMatrixInverse(projectionMatrixInverse) { 
        this._projectionMatrixInverse = projectionMatrixInverse; 
    }

	get up() { return this._up; }

    get frustumVisible() { return this._frustum.visible; }
	set frustumVisible(frustumVisible){
		this._frustum.visible = frustumVisible;
	}


	fillRenderArray(renderArrayManager){
		//NOOP
	}
	project(){
		//NOOP
	}
	getRequiredPrograms(renderer){
		return [];
	}
	update(glManager){
		//NOOP
	}

	updateFrustum(){
        this._frustum.clear();

		const PMat_inverse = new Matrix4().getInverse(this._projectionMatrix);
        const frustum_vertices = [];
        const FRUSTUM_POINTS_WORLD_POS = new Array(
            new Vector4(-1, -1, +1, 1),
            new Vector4(+1, -1, +1, 1),
            new Vector4(+1, +1, +1, 1),
            new Vector4(-1, +1, +1, 1),
            new Vector4(-1, -1, -1, 1),
            new Vector4(+1, -1, -1, 1),
            new Vector4(+1, +1, -1, 1),
            new Vector4(-1, +1, -1, 1)
        );
        for(let i = 0; i < FRUSTUM_POINTS_WORLD_POS.length; i++){
            FRUSTUM_POINTS_WORLD_POS[i].applyMatrix4(PMat_inverse);
            FRUSTUM_POINTS_WORLD_POS[i].multiplyScalar(1/FRUSTUM_POINTS_WORLD_POS[i].w);
            frustum_vertices.push(FRUSTUM_POINTS_WORLD_POS[i].x, FRUSTUM_POINTS_WORLD_POS[i].y, FRUSTUM_POINTS_WORLD_POS[i].z);
        }

        const FRUSTUM_BOX = new Cube(1.0, new Color().setColorName("grey"));
        FRUSTUM_BOX.frustumCulled = false;
        FRUSTUM_BOX.geometry.vertices = new Float32Attribute(frustum_vertices, 3);
        FRUSTUM_BOX.geometry.indices = new Uint32Attribute([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 4, 0, 3, 4, 3, 7, 1, 5, 6, 1, 6, 2, 3, 2, 6, 3, 6, 7, 4, 5, 1, 4, 1, 0], 1);
        FRUSTUM_BOX.material.depthTest = false;
        FRUSTUM_BOX.material.depthWrite = false;
        FRUSTUM_BOX.material.side = FRONT_AND_BACK_SIDE;
        FRUSTUM_BOX.material.transparent = true;
        FRUSTUM_BOX.material.opacity = 0.25;
        this._frustum.add(FRUSTUM_BOX);

        const fru1g = new Geometry();
        fru1g.vertices = new Float32Attribute([FRUSTUM_POINTS_WORLD_POS[0].x, FRUSTUM_POINTS_WORLD_POS[0].y, FRUSTUM_POINTS_WORLD_POS[0].z, FRUSTUM_POINTS_WORLD_POS[1].x, FRUSTUM_POINTS_WORLD_POS[1].y, FRUSTUM_POINTS_WORLD_POS[1].z], 3);
        fru1g.computeVertexNormals();
        const fru1 = new Line(fru1g);
        this._frustum.add(fru1);
        const fru2g = new Geometry();
        fru2g.vertices = new Float32Attribute([FRUSTUM_POINTS_WORLD_POS[1].x, FRUSTUM_POINTS_WORLD_POS[1].y, FRUSTUM_POINTS_WORLD_POS[1].z, FRUSTUM_POINTS_WORLD_POS[2].x, FRUSTUM_POINTS_WORLD_POS[2].y, FRUSTUM_POINTS_WORLD_POS[2].z], 3);
        fru2g.computeVertexNormals();
        const fru2 = new Line(fru2g);
        this._frustum.add(fru2);
        const fru3g = new Geometry();
        fru3g.vertices = new Float32Attribute([FRUSTUM_POINTS_WORLD_POS[2].x, FRUSTUM_POINTS_WORLD_POS[2].y, FRUSTUM_POINTS_WORLD_POS[2].z, FRUSTUM_POINTS_WORLD_POS[3].x, FRUSTUM_POINTS_WORLD_POS[3].y, FRUSTUM_POINTS_WORLD_POS[3].z], 3);
        fru3g.computeVertexNormals();
        const fru3 = new Line(fru3g);
        this._frustum.add(fru3);
        const fru4g = new Geometry();
        fru4g.vertices = new Float32Attribute([FRUSTUM_POINTS_WORLD_POS[3].x, FRUSTUM_POINTS_WORLD_POS[3].y, FRUSTUM_POINTS_WORLD_POS[3].z, FRUSTUM_POINTS_WORLD_POS[0].x, FRUSTUM_POINTS_WORLD_POS[0].y, FRUSTUM_POINTS_WORLD_POS[0].z], 3);
        fru4g.computeVertexNormals();
        const fru4 = new Line(fru4g);
        this._frustum.add(fru4);
        const fru5g = new Geometry();
        fru5g.vertices = new Float32Attribute([FRUSTUM_POINTS_WORLD_POS[4].x, FRUSTUM_POINTS_WORLD_POS[4].y, FRUSTUM_POINTS_WORLD_POS[4].z, FRUSTUM_POINTS_WORLD_POS[5].x, FRUSTUM_POINTS_WORLD_POS[5].y, FRUSTUM_POINTS_WORLD_POS[5].z], 3);
        fru5g.computeVertexNormals();
        const fru5 = new Line(fru5g);
        this._frustum.add(fru5);
        const fru6g = new Geometry();
        fru6g.vertices = new Float32Attribute([FRUSTUM_POINTS_WORLD_POS[5].x, FRUSTUM_POINTS_WORLD_POS[5].y, FRUSTUM_POINTS_WORLD_POS[5].z, FRUSTUM_POINTS_WORLD_POS[6].x, FRUSTUM_POINTS_WORLD_POS[6].y, FRUSTUM_POINTS_WORLD_POS[6].z], 3);
        fru6g.computeVertexNormals();
        const fru6 = new Line(fru6g);
        this._frustum.add(fru6);
        const fru7g = new Geometry();
        fru7g.vertices = new Float32Attribute([FRUSTUM_POINTS_WORLD_POS[6].x, FRUSTUM_POINTS_WORLD_POS[6].y, FRUSTUM_POINTS_WORLD_POS[6].z, FRUSTUM_POINTS_WORLD_POS[7].x, FRUSTUM_POINTS_WORLD_POS[7].y, FRUSTUM_POINTS_WORLD_POS[7].z], 3);
        fru7g.computeVertexNormals();
        const fru7 = new Line(fru7g);
        this._frustum.add(fru7);
        const fru8g = new Geometry();
        fru8g.vertices = new Float32Attribute([FRUSTUM_POINTS_WORLD_POS[7].x, FRUSTUM_POINTS_WORLD_POS[7].y, FRUSTUM_POINTS_WORLD_POS[7].z, FRUSTUM_POINTS_WORLD_POS[4].x, FRUSTUM_POINTS_WORLD_POS[4].y, FRUSTUM_POINTS_WORLD_POS[4].z], 3);
        fru8g.computeVertexNormals();
        const fru8 = new Line(fru8g);
        this._frustum.add(fru8);
        const fru9g = new Geometry();
        fru9g.vertices = new Float32Attribute([FRUSTUM_POINTS_WORLD_POS[0].x, FRUSTUM_POINTS_WORLD_POS[0].y, FRUSTUM_POINTS_WORLD_POS[0].z, FRUSTUM_POINTS_WORLD_POS[4].x, FRUSTUM_POINTS_WORLD_POS[4].y, FRUSTUM_POINTS_WORLD_POS[4].z], 3);
        fru9g.computeVertexNormals();
        const fru9 = new Line(fru9g);
        this._frustum.add(fru9);
        const fru10g = new Geometry();
        fru10g.vertices = new Float32Attribute([FRUSTUM_POINTS_WORLD_POS[1].x, FRUSTUM_POINTS_WORLD_POS[1].y, FRUSTUM_POINTS_WORLD_POS[1].z, FRUSTUM_POINTS_WORLD_POS[5].x, FRUSTUM_POINTS_WORLD_POS[5].y, FRUSTUM_POINTS_WORLD_POS[5].z], 3);
        fru10g.computeVertexNormals();
        const fru10 = new Line(fru10g);
        this._frustum.add(fru10);
        const fru11g = new Geometry();
        fru11g.vertices = new Float32Attribute([FRUSTUM_POINTS_WORLD_POS[2].x, FRUSTUM_POINTS_WORLD_POS[2].y, FRUSTUM_POINTS_WORLD_POS[2].z, FRUSTUM_POINTS_WORLD_POS[6].x, FRUSTUM_POINTS_WORLD_POS[6].y, FRUSTUM_POINTS_WORLD_POS[6].z], 3);
        fru11g.computeVertexNormals();
        const fru11 = new Line(fru11g);
        this._frustum.add(fru11);
        const fru12g = new Geometry();
        fru12g.vertices = new Float32Attribute([FRUSTUM_POINTS_WORLD_POS[3].x, FRUSTUM_POINTS_WORLD_POS[3].y, FRUSTUM_POINTS_WORLD_POS[3].z, FRUSTUM_POINTS_WORLD_POS[7].x, FRUSTUM_POINTS_WORLD_POS[7].y, FRUSTUM_POINTS_WORLD_POS[7].z], 3);
        fru12g.computeVertexNormals();
        const fru12 = new Line(fru12g);
        this._frustum.add(fru12);
	}

    // Functions to render with a smaller viewport around the mouse pointer.
    // Works for both Persp and Ortho cameras.
	prePickStoreTBLR() {
		this._top_store = this._top;
		this._bottom_store = this._bottom;
		this._left_store = this._left;
		this._right_store = this._right;
	}
	narrowProjectionForPicking(w, h, p, q, x, y) {
		// w, h - viewport; p, q - pick rectangle; x,y - pick position in viewport coords.
		this._top = (y + q/2)/h*(this._top_store - this._bottom_store) + this._bottom_store;
		this._bottom = (y - q/2)/h*(this._top_store - this._bottom_store) + this._bottom_store;
		this._left = (x - p/2)/w*(this._right_store - this._left_store) + this._left_store;
		this._right = (x + p/2)/w*(this._right_store - this._left_store) + this._left_store;
		this.updateProjectionMatrix();
	}
	postPickRestoreTBLR() {
		this._top = this._top_store;
		this._bottom = this._bottom_store;
		this._left = this._left_store;
		this._right = this._right_store;
		this.updateProjectionMatrix();
	}
}