/**
 * Created by Primoz on 3.4.2016.
 */
import {BACK_SIDE, FRONT_AND_BACK_SIDE} from '../constants.js';

import {Object3D} from '../core/Object3D.js';
import {Geometry} from './Geometry.js';

import {MeshBasicMaterial} from '../materials/MeshBasicMaterial.js';
import {PickingShaderMaterial} from "../materials/PickingShaderMaterial.js";

import {Matrix4} from '../math/Matrix4.js';
import {Vector3} from '../math/Vector3.js';
import {Ray} from '../math/Ray.js';
import {Sphere} from '../math/Sphere.js';
import {Color} from "../RenderCore.js";


export class Mesh extends Object3D {

	static sDefaultPickable = false;

	/**
	 * Create new Mesh object.
	 *
	 * @param geometry Geometry of the mesh.
	 * @param material Material of the mesh.
	 */
	constructor(geometry, material, pickingMaterial, outlineMaterial) {
		super(Object3D);

		this.type = "Mesh";

		// Each mesh defines geometry and its material
		this._geometry = geometry !== undefined ? geometry : new Geometry();
		this._material = material !== undefined ? material : new MeshBasicMaterial( { color: Math.random() * 0xffffff } );

		// If undefined it gets default constructed when set pickable is called.
		this._pickingMaterial = pickingMaterial;

		// Shared version used by RenderPass / MeshRenderer; set it here if vert shader transforms
		// vertices or if frag shader does not write all the fragments. See ZSprite for example.
		this._outlineMaterial = outlineMaterial;

		this.raycast = _raycast;

		// PICKING IDs
		this._RGB_ID = new Color(0.0, 0.0, 0.0); // stored as Color(r, g, b) 
		this._UINT_ID = 0; // stored as Uint32

		//OUTLINE
		this._drawOutline = false;

		//INSTANCING
		this._instanced = false;
		this._instancedTranslation = false;
		this._instanceCount = 1;

		this.pickable = Mesh.sDefaultPickable;
	}

	/**
	 * Add on change listener to mesh material and geometry.
	 *
	 * @param listener Listener to be added.
	 * @param recurse Also add listener to all submeshes in the hierarchy.
	 */
	addOnChangeListener(listener, recurse) {
		this._material.onChangeListener = listener;
		this._geometry.onChangeListener = listener;

		super.addOnChangeListener(listener, recurse);
	}

	// region GETTERS
	/**
	 * Get material of the mesh.
	 *
	 * @returns Material of the mesh.
	 */
	get material() { return this._material; }
	get pickingMaterial() { return this._pickingMaterial; }
	get outlineMaterial() { return this._outlineMaterial; }

	/**
	 * Get geometry of the mesh.
	 *
	 * @returns Geometry of the mesh.
	 */
	get geometry() { return this._geometry; }
	get RGB_ID() { return this._RGB_ID; }
	get UINT_ID() { return this._UINT_ID; }
	get drawOutline() { return this._drawOutline; }
	get pickable() { return super.pickable; }

	get instanced() { return this._instanced; }
	get instancedTranslation() { return this._instancedTranslation; }
	get instanceCount() { return this._instanceCount; }
	// endregion

	// region SETTERS
	// TODO (Primoz): Figure out what to do when material or geometry is changed
	/**
	 * Set material of the mesh.
	 *
	 * @param mat Material to be set.
	 */
	set material(mat) {
		this._material = mat;

		this._staticStateDirty = true;
		this._material.instanced = this._instanced;
		this._material.instancedTranslation = this._instancedTranslation;
	}
    set pickingMaterial(pickingMaterial) {
		this._pickingMaterial = pickingMaterial;

		this._staticStateDirty = true;
		this._pickingMaterial.instanced = this._instanced;
		this._pickingMaterial.instancedTranslation = this._instancedTranslation;
	}
	set outlineMaterial(outlineMaterial) {
		this._outlineMaterial = outlineMaterial;

		this._staticStateDirty = true;
		this._outlineMaterial.instanced = this._instanced;
	}


	/**
	 * Set geometry of the mesh.
	 *
	 * @param geom Geometry to be set.
	 */
	set geometry(geom) { this._geometry = geom; }

	/**
	 * Add on change listener to mesh material and geometry.
	 *
	 * @param listener Listener to be added.
	 */
	set onChangeListener(listener) {
		super.onChangeListener = listener;
		this._geometry.onChangeListener = listener;
		this._material.onChangeListener = listener;
	}

	set RGB_ID(RGB_ID) {
		this._RGB_ID = RGB_ID;
	}
	set UINT_ID(UINT_ID) {
		this._UINT_ID = UINT_ID;
	}
	set drawOutline(drawOutline) {
		this._drawOutline = drawOutline;
		// The default outline material (multi or GBufferMini) is set and shared through RenderPass.
		// If one sets it for a mesh, it will be picked up and used.
	}
	set pickable(pickable) {
		super.pickable = pickable;
		if (pickable && ! this._pickingMaterial)
			this.pickingMaterial = new PickingShaderMaterial("TRIANGLES");
	}
	set instanced(instanced) {
		this._instanced = instanced;

		this._material.instanced = instanced;
		if (this._pickingMaterial) this._pickingMaterial.instanced = instanced;
		if (this._outlineMaterial) this._outlineMaterial.instanced = instanced;
	}
	set instancedTranslation(instancedTranslation) {
		this._instanced = instancedTranslation;

		this._material.instancedTranslation = instancedTranslation;
		if (this._pickingMaterial) this._pickingMaterial.instancedTranslation = instancedTranslation;
		if (this._outlineMaterial) this._outlineMaterial.instancedTranslation = instancedTranslation;
	}
	set instanceCount(instanceCount) { this._instanceCount = instanceCount; }
	// endregion


	// region EXPORT/IMPORT
	/**
	 * Serialize object to JSON.
	 *
	 * @returns JSON object.
	 */
	toJson() {
		var obj = super.toJson();

		// Add reference to geometry and material
		obj.geometryUuid = this._geometry._uuid;
		obj.materialUuid = this._material._uuid;

		return obj;
	}

	/**
	 * Create a mesh object from the JSON data.
	 *
	 * @param data JSON data.
	 * @param geometry Geometry of the mesh.
	 * @param material Material of the mesh.
	 * @param object
	 * @returns Mesh object.
	 */
	static fromJson(data, geometry, material, object) {
		// Create mesh object
		if (!object) {
			var object = new Mesh(geometry, material);
		}

		// Import Object3D parameters
		object = super.fromJson(data, object);

		return object;
	}
	// endregion

	fillRenderArray(renderArrayManager){
		// Add object to correct render array

		// MTQQ should have arrays for picking / outline ???

		if (this.material.transparent) {
			renderArrayManager.transparentObjects.addlast(this);
		} else {
			renderArrayManager.opaqueObjects.addlast(this);
		}
	}
	project(projScreenMatrix){

		if (this.material.transparent) {
			this._zVector.setFromMatrixPosition(this.matrixWorld);
			this._zVector.applyMatrix4(projScreenMatrix);
		}
	}
	getRequiredPrograms(renderer){
		let r = [ this._material.requiredProgram(renderer) ];
		if (this._pickingMaterial && this.pickable) r.push( this._pickingMaterial.requiredProgram(renderer) );
		if (this._outlineMaterial && this.drawOutline) r.push( this._outlineMaterial.requiredProgram(renderer) );

		this._staticStateDirty = false;

		return r;
	}
	update(glManager, camera){
		// Updates or derives attributes from the WebGL geometry
		glManager.updateObjectData(this, this.material);

		// Derive mv and normal matrices
		this.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, this._matrixWorld);
		this.normalMatrix.getNormalMatrix(this._modelViewMatrix);
	}
	draw(gl, glManager, instance_count=0){
		if (this.geometry.drawWireframe) {
			let buffer = glManager.getAttributeBuffer(this.geometry.wireframeIndices);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);

			if(this._instanced || this._instancedTranslation){
				if (!instance_count)
					instance_count = this._instanceCount;
				gl.drawElementsInstanced(gl.LINES, this.geometry.wireframeIndices.count(), gl.UNSIGNED_INT, 0, instance_count);
			}
			else{
				gl.drawElements(gl.LINES, this.geometry.wireframeIndices.count(), gl.UNSIGNED_INT, 0);
			}
		}
		else if (this.geometry.indices) {
			//indexed
			let buffer = glManager.getAttributeBuffer(this.geometry.indices);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);

			if(this._instanced || this._instancedTranslation){
				if (!instance_count)
					instance_count = this._instanceCount;
				gl.drawElementsInstanced(this.renderingPrimitive, this.geometry.indexCount, gl.UNSIGNED_INT, 4 * this.geometry.indexStart, instance_count);
			}
			else{
				gl.drawElements(this.renderingPrimitive, this.geometry.indexCount, gl.UNSIGNED_INT, 4 * this.geometry.indexStart);
			}
		}
		else {
			//non indexed
			if(this._instanced || this._instancedTranslation){
				if (!instance_count)
					instance_count = this._instanceCount;
				gl.drawArraysInstanced(this.renderingPrimitive, 0, this.geometry.vertices.count(), instance_count);
			}
			else{
				gl.drawArrays(this.renderingPrimitive, 0, this.geometry.vertices.count());
			}
		}
	}
};


let _raycast = (function () {

    let vA = new Vector3();
    let vB = new Vector3();
    let vC = new Vector3();

    let inverseMatrix = new Matrix4();
    let ray = new Ray();
    let sphere = new Sphere();

	// Intersection points
    let intersectionPoint = new Vector3();
    let intersectionPointWorld = new Vector3();

	function checkTriangleIntersection( object, raycaster, ray, vertices, a, b, c ) {

		// Fetch triangle vertices
		vA.fromArray(vertices.array, a * 3);
		vB.fromArray(vertices.array, b * 3);
		vC.fromArray(vertices.array, c * 3);

        let intersect;
        let material = object.material;

		// Check triangle intersection
		if (material.side === BACK_SIDE) {
			intersect = ray.intersectTriangle(vC, vB, vA, true, intersectionPoint);
		}
		else {
			intersect = ray.intersectTriangle(vA, vB, vC, material.side !== FRONT_AND_BACK_SIDE, intersectionPoint);
		}

		// Fallback if no intersection
		if (intersect === null)
			return null;

		// Calculate intersection world position
		intersectionPointWorld.copy(intersectionPoint);
		intersectionPointWorld.applyMatrix4(object.matrixWorld);

		// Get distance to intersection point
        let distance = raycaster.ray.origin.distanceTo(intersectionPointWorld);

		// Check if the distance is out of bounds
		if (distance < raycaster.near || distance > raycaster.far)
			return null;

		// Return intersection object
		return {
			distance: distance,
			point: intersectionPointWorld.clone(),
			triangle: [vA.applyMatrix4(object.matrixWorld).clone(), vB.applyMatrix4(object.matrixWorld).clone(), vC.applyMatrix4(object.matrixWorld).clone()],
			object: object
		};
	}

	return function raycast(raycaster, intersects) {
        let geometry = this.geometry;
        let material = this.material;
        let matrixWorld = this.matrixWorld;

		// Check if object has material
		if (material === undefined || geometry === undefined)
			return;

		// Test bounding sphere
		if (geometry.boundingSphere === null)
			geometry.computeBoundingSphere();

		sphere.copy(geometry.boundingSphere);
		sphere.applyMatrix4(matrixWorld);

		if (raycaster.ray.intersectsSphere(sphere) === false)
			return;


		inverseMatrix.getInverse(matrixWorld);
		ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);

		// Test bounding box
		if (geometry.boundingBox !== null) {
			if (ray.intersectsBox(geometry.boundingBox) === false)
				return;
		}

        let intersection;
        let a, b, c;
        let indices = geometry.indices;
        let vertices = geometry.vertices;

		// Geometry is indexed
		if (indices !== null) {
			for (let i = 0; i < indices.array.length; i += 3) {

				// Triangle indices
				a = indices[i];
				b = indices[i + 1];
				c = indices[i + 2];

				// Test ray intersection with triangle
				intersection = checkTriangleIntersection(this, raycaster, ray, vertices, a, b, c);

				if (intersection) {
					intersection.faceIndex = Math.floor(i / 3); // triangle number in indices buffer semantics
					intersects.push(intersection);
				}
			}
		}
		// Non indexed geometry
		else {
			for (let i = 0; i < geometry.vertices.array.length; i += 9) {

				// Triangle indices
				a = i / 3;
				b = a + 1;
				c = a + 2;

				// Test ray intersection with triangle
				intersection = checkTriangleIntersection(this, raycaster, ray, vertices, a, b, c);

				if (intersection) {
					intersection.index = a; // triangle number in positions buffer semantics
					intersects.push(intersection);
				}
			}
		}
	}
})();