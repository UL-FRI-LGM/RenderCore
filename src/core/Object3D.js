/**
 * Created by Ziga on 25.3.2016.
 */
import {_Math} from '../math/Math.js';
import {Matrix3} from "../math/Matrix3.js";
import {Matrix4} from '../math/Matrix4.js';
import {Vector3} from '../math/Vector3.js';
import {Euler} from '../math/Euler.js';
import {Quaternion} from '../math/Quaternion.js';
import {Sphere} from '../math/Sphere.js';
import {TRIANGLES} from "../constants.js";
import {Geometry} from "../objects/Geometry.js";
import {Material} from "../materials/Material.js";
import {MeshBasicMaterial} from "../materials/MeshBasicMaterial.js";
import {MeshPhongMaterial} from "../materials/MeshPhongMaterial.js";
import {Mesh} from "../objects/Mesh.js";


export class Object3D {

	constructor() {

		// Self reference for callbacks
		var self = this;

		// Unique identifier
		this._uuid = _Math.generateUUID();
		this.type = "Object3D";

		this._parent = null;
		this._children = [];

		this._position = new Vector3();
		this._rotation = new Euler();
		this._quaternion = new Quaternion();
		this._scale = new Vector3(1, 1, 1);

		this._visible = true;
		this._frustumCulled = true;

		function onRotationChange() {
			self.quaternion.setFromEuler(self.rotation, false);
		}

		function onQuaternionChange() {
			self.rotation.setFromQuaternion(self.quaternion, undefined, false);
		}

		this._rotation._onChange(onRotationChange);
		this._quaternion._onChange(onQuaternionChange);


		this._matrix = new Matrix4();		//MMat (TRS) local (parent independent)
		this._matrixWorld = new Matrix4();	//MMat (TRS) global (parent dependent)
		this._matrixWorldNeedsUpdate = false;

		// Model view matrix is derived from the object world matrix and inverse camera world matrix
		this._modelViewMatrix = new Matrix4();
		this._normalMatrix = new Matrix3();
		this._modelViewProjectionMatrix = new Matrix4();

		this._matrixAutoUpdate = true;

		this._onChangeListener = null;

		// References to wrapped functions
		this.rotateOnAxis = rotateOnAxis;
		this.rotateX = rotateX;
		this.rotateY = rotateY;
		this.rotateZ = rotateZ;
		this.rotate = rotate;
		this.lookAt = lookAt;

		this.translateOnAxis = translateOnAxis;
		this.translateX = translateX;
		this.translateY = translateY;
		this.translateZ = translateZ;
		this.translate = translate;

		this._renderOrder = 0;
		this._isStatic = false;
		this._staticStateDirty = true;
		this._renderingPrimitive = TRIANGLES;	//default rendering primitive
		this._pickable = false;
		this._zVector = new Vector3();
		this._boundingSphere = new Sphere(new Vector3(0, 0, 0), Infinity);
	}

	//region GETTERS
	get parent() { return this._parent; }
	get children() { return this._children; }
	get position() { return this._position; }
	get positionX() { return this._position.x; }
	get positionY() { return this._position.y; }
	get positionZ() { return this._position.z; }
	get rotation() { return this._rotation; }
	get rotationX() { return this._rotation.x; }
	get rotationY() { return this._rotation.y; }
	get rotationZ() { return this._rotation.z; }
	get quaternion() { return this._quaternion; }
	get scale() { return this._scale; }
	get matrixAutoUpdate() { return this._matrixAutoUpdate; }
	get matrixWorld() { return this._matrixWorld; }
	get visible() { return this._visible; }
	get frustumCulled() { return this._frustumCulled; }
	get renderOrder(){ return this._renderOrder; }
	get isStatic(){ return this._isStatic; }
	get staticStateDirty(){ return this._staticStateDirty; }
	get renderingPrimitive(){ return this._renderingPrimitive; }
	get pickable(){ return this._pickable; }
	get matrix() { return this._matrix; }
	set matrix(matrix) {
		this._matrix = matrix;
		this._matrixWorldNeedsUpdate = true;
	}
	/**
	 * Get model view matrix of the mesh.
	 *
	 * @returns Model view matrix of the mesh.
	 */
	get modelViewMatrix() { return this._modelViewMatrix; }

	/**
	 * Get normal matrix of the mesh.
	 *
	 * @returns Normal matrix of the mesh.
	 */
	get normalMatrix() { return this._normalMatrix; }
	get modelViewProjectionMatrix() { return this._modelViewProjectionMatrix; }
	//endregion

	//region SETTERS
	set visible(val) {
		if (this._visible !== val) {
			this._visible = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {visible: this._visible}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set position(vec) {
		if (!vec.equals(this._position)) {
			this._position.copy(vec);

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {position: this._position.toArray()}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set positionX(val) {
		if (this._position.x !== val) {
			this._position.x = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {position: this._position.toArray()}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set positionY(val) {
		if (this._position.y !== val) {
			this._position.y = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {position: this._position.toArray()}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set positionZ(val) {
		if (this._position.z !== val) {
			this._position.z = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {position: this._position.toArray()}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set rotation(euler) {
		if (!euler.equals(this._rotation)) {
			this._rotation.copy(euler);

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {quaternion: this._quaternion.toArray()}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set rotationX(val) {
		if (this._rotation.x !== val) {
			this._rotation.x = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {quaternion: this._quaternion.toArray()}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set rotationY(val) {
		if (this._rotation.y !== val) {
			this._rotation.y = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {quaternion: this._quaternion.toArray()}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set rotationZ(val) {
		if (this._rotation.z !== val) {
			this._rotation.z = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {quaternion: this._quaternion.toArray()}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set quaternion(quat) {
		if (!quat.equals(this._quaternion)) {
			this._quaternion.copy(quat);

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {quaternion: this._quaternion.toArray()}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set scale(vec) {
		if (!vec.equals(this._scale)) {
			this._scale = vec;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {scale: this._scale.toArray()}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set matrixAutoUpdate(val) {
		if (val !== this._matrixAutoUpdate) {
			this._matrixAutoUpdate = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {matrixAutoUpdate: this._matrixAutoUpdate}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set frustumCulled(val) {
		if (val !== this._frustumCulled) {
			this._frustumCulled = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {frustumCulled: this._frustumCulled}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set renderOrder(val){
		if (val !== this._renderOrder) {
			this._renderOrder = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {renderOrder: this._renderOrder}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set isStatic(val){
		if (val !== this._isStatic) {
			this._isStatic = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {isStatic: this._isStatic}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set staticStateDirty(val){
		if (val !== this._staticStateDirty) {
			this._staticStateDirty = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {staticStateDirty: this._staticStateDirty}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set renderingPrimitive(val){
		if (val !== this._renderingPrimitive) {
			this._renderingPrimitive = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {renderingPrimitive: this._renderingPrimitive}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set pickable(val){
		if (val !== this._pickable) {
			this._pickable = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {pickable: this._pickable}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	/**
	 * Set model view matrix of the mesh.
	 *
	 * @param mvMat Model view matrix to be set.
	 */
	set modelViewMatrix(mvMat) { this._modelViewMatrix = mvMat; }

	/**
	 * Set normal matrix of the mesh.
	 *
	 * @param normMat Normal matrix to be set.
	 */
	set normalMatrix(normMat) { this._normalMatrix = normMat; }
	set modelViewProjectionMatrix(MVPMat) { this._modelViewProjectionMatrix = MVPMat; }
	//endregion

	addOnChangeListener (listener, recurse) {
			this._onChangeListener = listener;

			if (recurse) {
					for (var i = 0; i < this._children.length; i++) {
							this._children[i].addOnChangeListener(listener, recurse);
					}
			}
	}

	//region MATRIX UPDATING
	applyMatrix(matrix) {
				this._matrix.multiplyMatrices(matrix, this._matrix);
				this._matrix.decompose(this._position, this._quaternion, this._scale);

				// Notify onChange subscriber
				if (this._onChangeListener) {
						let update = {uuid: this._uuid,
								changes: {
										position: this._position.toArray(),
										quaternion: this._quaternion.toArray(),
										scale: this._scale.toArray()
								}
						};
						this._onChangeListener.objectUpdate(update)
				}
	}

	updateMatrix() {
		this._matrix.compose(this._position, this._quaternion, this._scale);
		this._matrixWorldNeedsUpdate = true;


		this._UPDATE_BOUNDS = true;
	}

	updateMatrixWorld(parentWorldUpdated = false) {
		if ( this._matrixAutoUpdate ) this.updateMatrix();

		if (this._matrixWorldNeedsUpdate || parentWorldUpdated) {
			if (this.parent === null) {
				this._matrixWorld.copy(this._matrix);
			} else {
				this._matrixWorld.multiplyMatrices(this.parent._matrixWorld, this._matrix);
			}
			this._matrixWorldNeedsUpdate = false;
			parentWorldUpdated = true;

			this._UPDATE_BOUNDS = true;
		}

		for (var i = 0; i < this._children.length; i++) {
			this._children[i].updateMatrixWorld(parentWorldUpdated);
		}
	}
	//THREE version of matrix world update
	updateWorldMatrix( updateParents, updateChildren ) {
		const parent = this.parent;
		if ( updateParents === true && parent !== null ) {
			parent.updateWorldMatrix( true, false );
		}

		if ( this.matrixAutoUpdate ) this.updateMatrix();

		if ( this.parent === null ) {
			this.matrixWorld.copy( this._matrix );
		} else {
			this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this._matrix );
		}


		this._UPDATE_BOUNDS = true;

		// update children
		if ( updateChildren === true ) {
			const children = this.children;
			for ( let i = 0, l = children.length; i < l; i  ) {
				children[ i ].updateWorldMatrix( false, true );
			}
		}
	}
	//endregion

	//region HIERARCHY FUNCTIONS
	add(object) {
		if (object === this) {
			return;
		}
		if (object._parent !== null) {
			object._parent.remove(object);
		}

		object._parent = this;
		this._children.push(object);

				// Notify onChange subscriber
				if (this._onChangeListener) {
						object.onChangeListener = this._onChangeListener;
						var update = {uuid: object._uuid, changes: {parentUuid: this._uuid, objectRef: object}};
						this._onChangeListener.hierarchyUpdate(update)
				}
	}

	remove(object) {
		var index = this._children.indexOf(object);
		if (index !== -1) {
			object._parent = null;
			this._children.splice(index, 1);

						// Notify onChange subscriber
						if (this._onChangeListener) {
								var update = {uuid: object._uuid, changes: {parentUuid: null, objectRef: object}};
								this._onChangeListener.hierarchyUpdate(update)
						}
		}
	}

	clear() {
				let self = this;

				this._children = this._children.filter(function (child) {
						// Notify onChange subscriber
						if (self._onChangeListener) {
								var update = {uuid: child._uuid, changes: {parentUuid: null, objectRef: child}};
								self._onChangeListener.hierarchyUpdate(update)
						}

						return false;
				});
		}

	traverse(callback) {
		callback(this);
		for (let i = 0, l = this._children.length; i < l; i++) {
			this._children[i].traverse(callback);
		}
	}
	//endregion

	// region RAYCASTING
	raycast() {}
	// endregion

	// region BOUNDING SPHERE
	computeBoundingSphere() {
		let spheres = [];

		// Fetch bounding spheres of all of the children
		this.traverse(function (object) {
			if (object instanceof Mesh && object.geometry != null) {
				let bSphere = object.geometry.boundingSphere;

				if (!isNaN(bSphere.radius) && bSphere.radius > 0) {
					spheres.push(bSphere);
				}
			}
		});

		if (spheres.length > 0) {
			return _Math.computeSpheresBoundingSphere(spheres);
		}
		else {
			return new Sphere();
		}
	}
	// endregion

	//region EXPORT/IMPORT JSON FUNCTIONS
	toJson() {
		var obj = {};

		// Export UUID and object type
		obj.uuid = this._uuid;
		obj.type = this.type;

		// Store its parent UUID
		if (this._parent) {
			obj.parentUuid = this._parent._uuid;
		}

		// Export position, orientation and scale
		obj.position = this._position.toArray();
		obj.quaternion = this._quaternion.toArray();
		obj.scale = this._scale.toArray();

		// Export visibility and frustum culling settings
		obj.visible = this._visible;
		obj.frustumCulled = this._frustumCulled;

		// Export matrix auto update setting
		obj.matrixAutoUpdate = this._matrixAutoUpdate;

		return obj;
	}

	static fromJson(data, object) {
		// Object is undefined if RC.Object3D was not extended
		if (!object) {
				var object = new Object3D();
		}

		// Set uuid
		object._uuid = data.uuid;

		// Set position, orientation and scale
		object._position.fromArray(data.position);
		object._quaternion.fromArray(data.quaternion);
		object._scale.fromArray(data.scale);

		// Set Visibility and frustum culling settings
		object._visible = data.visible;
		object._frustumCulled = data.frustumCulled;

		// Export matrix auto update setting
		object._matrixWorldNeedsUpdate = true;
		object._matrixAutoUpdate = data.matrixAutoUpdate;

		return object;
	}

	static importHierarchy(objects, geometries, materials) {
		var rebuiltObjects = {};

		// Rebuild the objects
		for (let uuid of Object.keys(objects)) {
			var obj = objects[uuid];

			switch (obj.type) {
					case "Mesh":
					case "Circle":
					case "Quad":
					case "Line":
						var geometry = geometries[obj.geometryUuid];
						var material = materials[obj.materialUuid];

						if (geometry) {
							geometry = Geometry.fromJson(geometry);
						}
						else {
							geometry = undefined;
							console.warn("Could not find geometry for the mesh: " + obj.uuid);
						}

						if (material) {
							switch (material.type) {
								case "Material":
									material = Material.fromJson(material);
									break;
								case "MeshBasicMaterial":
									material = MeshBasicMaterial.fromJson(material);
									break;
								case "MeshPhongMaterial":
									material = MeshPhongMaterial.fromJson(material);
									break;
								default:
									material = undefined;
							}
						}
						else {
							material = undefined;
							console.warn("Could not find material for the mesh: " + obj.uuid);
						}

						rebuiltObjects[obj.uuid] = Mesh.fromJson(obj, geometry, material);
						break;
					default:
						rebuiltObjects[obj.uuid] = RC[obj.type].fromJson(obj);
						break;
			}
		}

		var rootObjects = [];

		// Rebuild the hierarchy
		for (let uuid of Object.keys(objects)) {
			var obj = rebuiltObjects[uuid];
			var parentUuid = objects[uuid].parentUuid;

			if (!parentUuid) {
				rootObjects.push(obj);
			}
			else {
				var parent = rebuiltObjects[parentUuid];

			if (parent) {
					obj._parent = parent;
					parent.children.push(obj);
				}
				else {
					rootObjects.push(obj);
				}
			}
		}

		return rootObjects;
	}

	exportHierarchy(result, _addParentUuid) {
		// If this is the first call in the recursion initialise the result objects
		if (!result.objects || !result.geometries || !result.materials) {
			result.objects = {};
			result.geometries = {};
			result.materials = {};
		}

		// Call Json export function
		var obj = this.toJson();

		// Do not export parent for the root of hierarchy
		if (!_addParentUuid) {
			delete obj.parentUuid;
		}

		result.objects[obj.uuid] = obj;

		// If instance of mesh also add the reference _uuid to geometry and material
		if (this.type === "Mesh" || this.type === "Quad" || this.type === "Circle" || this.type === "Line") {
			result.geometries[this._geometry._uuid] = this._geometry.toJson();
			result.materials[this._material._uuid] = this._material.toJson();
		}

		// Recurse
		for (var i = 0; i < this.children.length; i++) {
			this._children[i].exportHierarchy(result, true);
		}
	}

	update(data) {
		for (var prop in data) {
			switch (prop) {
				case "position":
					this._position.fromArray(data.position);
					delete data.position;
					break;
				case "quaternion":
					this._quaternion.fromArray(data.quaternion);
					delete data.quaternion;
					break;
				case "scale":
					this._scale.fromArray(data.scale);
					delete data.scale;
					break;
				case "visible":
					this._visible = data.visible;
					delete data.visible;
					break;
				case "frustumCulled":
					this._frustumCulled = data.frustumCulled;
					delete data.frustumCulled;
					break;
				case "matrixAutoUpdate":
					this._matrixAutoUpdate = data.matrixAutoUpdate;
					delete data.matrixAutoUpdate;
					break;
			}
		}
	}
	//endregion

	fillRenderArray(renderArrayManager){
		console.warn("-----------------------------------------------");
		console.warn(this);
		console.warn("Object has missing method: fillRenderArray");
		console.warn("-----------------------------------------------");
		throw new Error("Not implemented");
	}
	project(projScreenMatrix){
		console.warn("-----------------------------------------------");
		console.warn(this);
		console.warn("Object has missing method: project missing");
		console.warn("-----------------------------------------------");
		throw new Error("Not implemented");
	}
	getRequiredPrograms(renderer){
		console.warn("-----------------------------------------------");
		console.warn(this);
		console.warn("Object has missing method: getRequiredPrograms");
		console.warn("-----------------------------------------------");
		throw new Error("Not implemented");
		return [];
	}
	update(glManager, camera){
		console.warn("-----------------------------------------------");
		console.warn(this);
		console.warn("Object has missing method: update");
		console.warn("-----------------------------------------------");
		throw new Error("Not implemented");
	}
	get boundingSphere(){
		if (this._geometry){
			return this._geometry.boundingSphere;
		}else{
			return this._boundingSphere;
		}
	}
};

//region STATIC TRANSLATION FUNCTIONS
/**
 * Incrementally rotates the object via quaternion in the given axis for the rotation angle.
 * @param {Vector3} axis A normalized 3D vector in space
 * @param angle The angle in radians.
 */
let rotateOnAxis = (function() {
	// Private static quaternion
	let q1 = new Quaternion();

	return function (axis, angle) {
		if (angle !== 0) {
			q1.setFromAxisAngle(axis, angle);
			this._quaternion.multiply(q1);

			// Notify onChange subscriber
			if (this._onChangeListener) {
				let update = {uuid: this._uuid, changes: {quaternion: this._quaternion.toArray()}};
				this._onChangeListener.objectUpdate(update)
			}

			return this;
		}
	};
})();

/**
 * Incrementally rotates the object in X axis for the given angle.
 * @param angle The angle in radians
 */
let rotateX = (function() {
	// Private static axis vector
	let v1 = new Vector3(1, 0, 0);

	return function (angle) {
		return this.rotateOnAxis(v1, angle);
	};
})();


/**
 * Incrementally rotates the object in Y axis for the given angle.
 * @param angle The angle in radians
 */
let rotateY = (function() {
	// Private static axis vector
	var v1 = new Vector3(0, 1, 0);

	return function (angle) {
		return this.rotateOnAxis(v1, angle);
	};
})();

/**
 * Incrementally rotates the object in Z axis for the given angle.
 * @param angle The angle in radians
 */
let rotateZ = (function () {
	// Private static axis vector
	var v1 = new Vector3(0, 0, 1);

	return function (angle) {
		return this.rotateOnAxis(v1, angle);
	};
})();

let rotate = function (angleVector) {
		this.rotateX(angleVector.x);
		this.rotateY(angleVector.y);
		this.rotateZ(angleVector.z);
};

let lookAt = (function () {
		// Private static
		let m = new Matrix4();
		let q = new Quaternion();

		return function(vector, up) {
				m.lookAt(this._position, vector, up);
				q.setFromRotationMatrix(m);

				if (!q.equals(this._quaternion)) {
						this._quaternion.copy(q);

						// Notify onChange subscriber
						if (this._onChangeListener) {
								let update = {uuid: this._uuid, changes: {quaternion: this._quaternion.toArray()}};
								this._onChangeListener.objectUpdate(update)
						}
				}
		}
})();


/**
 * Translates an object by distance along an axis in object space.
 * @param {Vector3} axis A normalized 3D vector in space
 * @param distance The distance to translate.
 */
let translateOnAxis = (function () {

	// translate object by distance along axis in object space
	// axis is assumed to be normalized

	let v1 = new Vector3();

	return function (axis, distance) {
				if (distance !== 0) {
						v1.copy(axis).applyQuaternion(this._quaternion);

						this._position.add(v1.multiplyScalar(distance));

						// Notify onChange subscriber
						if (this._onChangeListener) {
								let update = {uuid: this._uuid, changes: {position: this._position.toArray()}};
								this._onChangeListener.objectUpdate(update)
						}
				}

		return this;
	};
})();

/**
 * Translates an object by distance along axis X in object space.
 * @param distance The distance to translate.
 */
let translateX = (function () {
	// Private axis vector
		let v1 = new Vector3( 1, 0, 0 );

	return function (distance) {
		return this.translateOnAxis(v1, distance);
	};
})();

/**
 * Translates an object by distance along axis Y in object space.
 * @param distance The distance to translate.
 */
let translateY = (function () {
	// Private axis vector
		let v1 = new Vector3( 0, 1, 0 );

	return function (distance) {
		return this.translateOnAxis(v1, distance);
	};
})();

/**
 * Translates an object by distance along axis Z in object space.
 * @param distance The distance to translate.
 */
let translateZ = (function () {
	// Private axis vector
	let v1 = new Vector3(0, 0, 1);

	return function (distance) {
		return this.translateOnAxis(v1, distance);
	};
})();

let translate = function (angleVector) {
		this.translateX(angleVector.x);
		this.translateY(angleVector.y);
		this.translateZ(angleVector.z);
};
//endregion
