/**
 * Created by Primoz on 3.4.2016.
 */
import {BACK_SIDE, FRONT_AND_BACK_SIDE} from '../constants.js';

import {Object3D} from '../core/Object3D.js';
import {BufferAttribute} from '../core/BufferAttribute.js';
import {Geometry} from './Geometry.js';

import {Material} from '../materials/Material.js';
import {CustomShaderMaterial} from '../materials/CustomShaderMaterial.js';
import {MeshBasicMaterial} from '../materials/MeshBasicMaterial.js';
import {PickingShaderMaterial} from "../materials/PickingShaderMaterial.js";

import {Matrix4} from '../math/Matrix4.js';
import {Vector3} from '../math/Vector3.js';
import {Ray} from '../math/Ray.js';
import {Sphere} from '../math/Sphere.js';

/**
 * A geometry drawn with a material. The pick and outline passes draw the mesh with its own
 * material in the pass's mode when the material has the mode, see Material.passModes;
 * otherwise with pickingMaterial, made on the first `pickable = true`, and with
 * outlineMaterial, or the renderer's default outline material when there is none.
 * outlineInstances restricts the outline pass to a list of instances.
 */
export class Mesh extends Object3D {

	static sDefaultPickable = false;

	/**
	 * Create new Mesh object.
	 *
	 * @param geometry Geometry of the mesh.
	 * @param material Material of the mesh.
	 */
	constructor(geometry, material, pickingMaterial, outlineMaterial, args = {}) {
		super();

		this.type = "Mesh";

		// Each mesh defines geometry and its material
		this._geometry = geometry !== undefined ? geometry : new Geometry();
		this._material = material !== undefined ? material : new MeshBasicMaterial( { color: Math.random() * 0xffffff } );

		// The pick pass material when the material has no pick mode. If undefined it gets
		// default constructed when set pickable is called.
		this._pickingMaterial = pickingMaterial;

		// The outline pass material when the material has no outline mode; set it if the
		// vertex shader places the vertices itself, else the renderer's default is used.
		this._outlineMaterial = outlineMaterial;
		// The instances the outline pass draws, see outlineInstances.
		this._outlineInstances = null;
		this._outlineInstancesSource = null;
		this._outlineInstancesAttr = null;
		// If not set, the default CustomShaderMaterial("multi") is instantiated in get method.
		this.GBufferMaterial = args.GBufferMaterial;

		this.raycast = _raycast;

		// PICKING ID
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
	get UINT_ID() { return this._UINT_ID; }
	get drawOutline() { return this._drawOutline; }
	get pickable() { return super.pickable; }

	get instanced() { return this._instanced; }
	get instancedTranslation() { return this._instancedTranslation; }
	get instanceCount() { return this._instanceCount; }

	/**
	 * The instances the outline pass draws, an Int32Array of instance indices, or null for the
	 * whole object; set from an array or an Int32Array. In an outline program that declares
	 * a_Instances the renderer binds the list there, sets u_GivenInstances to true and draws as
	 * many instances as the list holds; an empty list outlines nothing. ZMultiMesh and ZLines
	 * read the list in their draw(). The other passes draw every instance. Assigning the last
	 * assigned array again does nothing, so a list assigned on every frame is converted and
	 * uploaded once; to change the list, assign a new array.
	 */
	get outlineInstances() { return this._outlineInstances; }
	set outlineInstances(list) {
		if (list === null || list === undefined) {
			this._outlineInstances = null;
			this._outlineInstancesSource = null;
			return;
		}
		if (list === this._outlineInstancesSource) return;
		const array = (list instanceof Int32Array) ? list : Int32Array.from(list);
		this._outlineInstances = array;
		this._outlineInstancesSource = list;
		// One attribute per mesh; a new array replaces its contents.
		if (this._outlineInstancesAttr === null) this._outlineInstancesAttr = new BufferAttribute(array, 1, 1);
		else this._outlineInstancesAttr.array = array;
	}
	/** outlineInstances as the attribute the renderer binds, or null without a list. */
	get outlineInstancesAttribute() {
		return (this._outlineInstances !== null) ? this._outlineInstancesAttr : null;
	}

	/**
	 * The material the pass of `mode` (Material.MODE) draws the mesh with: the mesh's material
	 * when it has the mode, else pickingMaterial for PICK and outlineMaterial for OUTLINE, either
	 * of which can be undefined.
	 */
	passMaterial(mode) {
		if (this._material.hasMode(mode)) return this._material;
		if (mode === Material.MODE.PICK) return this._pickingMaterial;
		if (mode === Material.MODE.OUTLINE) return this._outlineMaterial;
		return this._material;
	}
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
	get GBufferMaterial() {
		if (this._GBufferMaterial === undefined)
			this.GBufferMaterial = new CustomShaderMaterial("multi");
		return this._GBufferMaterial;
	}
	set GBufferMaterial(GBufferMaterial) {
		this._GBufferMaterial = GBufferMaterial;

		this._staticStateDirty = true;
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
		if (pickable && ! this._pickingMaterial && ! this._material.hasMode(Material.MODE.PICK)) {
			this.pickingMaterial = new PickingShaderMaterial("TRIANGLES");
			this.pickingMaterial.side = this.material.side;
		}
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
		const pickPass = this.pickable ? this.passMaterial(Material.MODE.PICK) : undefined;
		if (pickPass) r.push( pickPass.requiredProgram(renderer, Material.MODE.PICK) );
		const outlinePass = this.drawOutline ? this.passMaterial(Material.MODE.OUTLINE) : undefined;
		if (outlinePass) r.push( outlinePass.requiredProgram(renderer, Material.MODE.OUTLINE) );
		if (renderer._renderMode == 3) // 3 = MeshRenderer.MODE.GEOMETRY; to be improved
			r.push(this.GBufferMaterial.requiredProgram(renderer));

		this._staticStateDirty = false;

		return r;
	}
	/**
	 * Call onAttribute for every attribute and onTexture for every texture the draw path can
	 * fetch for this mesh, in any pass: its geometry, the outline instance list and the
	 * resources of each of its materials. Used by the mark pass of GLManager.collectResources(); a subclass
	 * that draws from attributes of its own extends it.
	 */
	forEachResource(onAttribute, onTexture) {
		if (this._geometry) this._geometry.forEachAttribute(onAttribute);
		if (this._outlineInstancesAttr !== null) onAttribute(this._outlineInstancesAttr);
		for (const m of [this._material, this._pickingMaterial, this._outlineMaterial, this._GBufferMaterial])
			if (m) m.forEachResource(onAttribute, onTexture);
	}
	update(glManager, camera){
		// Derive mv and normal matrices
		this.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, this._matrixWorld);
		this.normalMatrix.getNormalMatrix(this._modelViewMatrix);
	}
	draw(gl, glManager, instance_count=0){
		if (this.geometry.drawWireframe) {
			const glBuffer = glManager.getGLBuffer(this.geometry.wireframeIndices);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glBuffer);

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
			const glBuffer = glManager.getGLBuffer(this.geometry.indices);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glBuffer);

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