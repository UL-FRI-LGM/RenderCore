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

// Scratch for _rebuildSubtreeSphere(), which does not recurse.
const _childSphere = new Sphere();
const _prevMatrix = new Matrix4();

export class Object3D {

	// Set this to false if 4x4 matrices are always used. They need to be
	// fully provided from outside. None of position, roation, etc.
	// functions will work, ie, will result in null object access.
	// Auto-update of local matrix will also be turned off.
	// Quaterninons can still be enabled by calling enableQuaterions()
	// and, optionally, set matrixAutoUpdate to true.
	static sDefaultQuaternionsAndAutoUpdate = true;

	constructor(is_group_only=false) {

		// Unique identifier
		this._uuid = _Math.generateUUID();
		this.type = "Object3D";

		this._parent = null;
		this._children = [];

		this._visible = true;
		this._frustumCulled = true;

		if (Object3D.sDefaultQuaternionsAndAutoUpdate) {
			this.enableQuaternions();
		}

		this._matrix = new Matrix4();		//MMat (TRS) local (parent independent)
		this._matrixWorld = new Matrix4();	//MMat (TRS) global (parent dependent)
		this._matrixWorldNeedsUpdate = false;

		// Model view matrix is derived from the object world matrix and inverse camera world matrix.
		// These are only needed if we actually render something.
		if ( ! is_group_only) {
			this._modelViewMatrix = new Matrix4();
			this._normalMatrix = new Matrix3();
			this._modelViewProjectionMatrix = new Matrix4();
		}

		this._matrixAutoUpdate = Object3D.sDefaultQuaternionsAndAutoUpdate;

		this._onChangeListener = null;

		this._renderOrder = 0;
		this._isStatic = false;
		this._staticStateDirty = true;
		this._renderingPrimitive = TRIANGLES;	//default rendering primitive
		this._pickable = false;
		this._zVector = new Vector3();

		// Bounds. _boundingSphereWorld is the sphere around the own geometry in
		// world space, redone when _boundsDirty is set; it decides whether the
		// object is drawn. _subtreeSphere encloses the object and everything below
		// it, in the object's frame, and _subtreeSphereWorld is the same in world
		// space; it decides whether the subtree is visited. Radius below 0 means
		// empty, Infinity unbounded. updateMatrixWorld() rebuilds them, and
		// compares the geometry and its bounds version with _boundsGeometry and
		// _boundsGeometryVersion, as Geometry does not notify its objects.
		this._boundingSphereWorld = new Sphere(new Vector3(0, 0, 0), Infinity);
		this._boundsDirty = true;
		this._subtreeSphere = new Sphere(new Vector3(0, 0, 0), -1);
		this._subtreeSphereWorld = new Sphere(new Vector3(0, 0, 0), -1);
		this._subtreeDirty = true;
		this._boundsGeometry = null;
		this._boundsGeometryVersion = -1;
	}

	enableQuaternions(enable_auto_update) {
		this._position = new Vector3();
		this._rotation = new Euler();
		this._quaternion = new Quaternion();
		this._scale = new Vector3(1, 1, 1);

		this._rotation._onChange(() => this.quaternion.setFromEuler(this.rotation, false));
		this._quaternion._onChange(() => this.rotation.setFromQuaternion(this.quaternion, undefined, false));

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

		if (enable_auto_update) {
			this._matrixAutoUpdate = true;
		}
	}

	//region GETTERS
	get parent() { return this._parent; }
	get children() { return this._children; }
	// The children the renderer descends into. Group may leave some out.
	get drawnChildren() { return this._children; }
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
	// A plain structural node: no geometry and nothing to draw. Group overrides.
	get isGroup() { return false; }
	get subtreeSphere() { return this._subtreeSphere; }
	get subtreeSphereWorld() { return this._subtreeSphereWorld; }
	get matrix() { return this._matrix; }
	set matrix(matrix) {
		this._matrix = matrix;
		this.matrixChanged();
	}
	setMatrixFromArray(arr) {
		this._matrix.fromArray(arr);
		this.matrixChanged();
	}
	// The parent's subtree sphere holds this object's sphere moved by this
	// matrix, so the parent is marked here as well as during the traversal.
	matrixChanged() {
		this._matrixWorldNeedsUpdate = true;
		if (this._parent) this._parent._subtreeDirty = true;
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
			this._subtreeDirty = true;

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
				this.matrixChanged();

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

	// Recompose from position, quaternion and scale; only a different matrix
	// counts as a change, so still objects with auto-update cost nothing more.
	updateMatrix() {
		_prevMatrix.copy(this._matrix);
		this._matrix.compose(this._position, this._quaternion, this._scale);
		if (this._matrix.equals(_prevMatrix)) return;

		this.matrixChanged();
		this._boundsDirty = true;
	}

	/**
	 * Compose world matrices down the tree, then rebuild subtree spheres on the
	 * way back up. Call it on the scene root; a call on an inner object marks
	 * the parent, whose sphere the next call on the root rebuilds.
	 *
	 * @returns True when this object's subtree sphere, as its parent sees it,
	 * changed: the sphere was rebuilt, or the local matrix changed.
	 */
	updateMatrixWorld(parentWorldUpdated = false) {
		if ( this._matrixAutoUpdate ) this.updateMatrix();

		const localChanged = this._matrixWorldNeedsUpdate;

		if (localChanged || parentWorldUpdated) {
			if (this.parent === null) {
				this._matrixWorld.copy(this._matrix);
			} else {
				this._matrixWorld.multiplyMatrices(this.parent._matrixWorld, this._matrix);
			}
			this._matrixWorldNeedsUpdate = false;
			parentWorldUpdated = true;

			this._boundsDirty = true;
		}

		let childChanged = false;
		for (let i = 0; i < this._children.length; i++) {
			if (this._children[i].updateMatrixWorld(parentWorldUpdated)) childChanged = true;
		}

		const geo = this._geometry || null;
		if (geo !== this._boundsGeometry || (geo !== null && geo.boundsVersion !== this._boundsGeometryVersion)) {
			this._boundsGeometry = geo;
			this._boundsGeometryVersion = geo !== null ? geo.boundsVersion : -1;
			this._subtreeDirty = true;
			this._boundsDirty = true;
		}

		const rebuilt = this._subtreeDirty || childChanged;
		if (rebuilt) {
			this._rebuildSubtreeSphere();
			// For a call on an inner object; from the root, the parent rebuilds anyway.
			if (this._parent) this._parent._subtreeDirty = true;
		}
		if (rebuilt || parentWorldUpdated) {
			this._subtreeSphereWorld.copy(this._subtreeSphere).applyMatrix4(this._matrixWorld);
		}

		return rebuilt || localChanged;
	}

	/**
	 * The own geometry's sphere combined with each child's subtree sphere moved
	 * by the child's matrix. An object that is not frustum culled is unbounded,
	 * so no ancestor is culled away from under it. So is an object with no
	 * geometry that is not a Group, such as a Light.
	 */
	_rebuildSubtreeSphere() {
		const s = this._subtreeSphere;
		this._subtreeDirty = false;

		const geo = this._geometry || null;

		if (!this._frustumCulled || (geo === null && !this.isGroup)) {
			s.center.set(0, 0, 0);
			s.radius = Infinity;
			return;
		}

		if (geo !== null) {
			s.copy(geo.boundingSphere);
		} else {
			s.center.set(0, 0, 0);
			s.radius = -1;
		}

		for (let i = 0; i < this._children.length; i++) {
			const child = this._children[i];
			_childSphere.copy(child._subtreeSphere).applyMatrix4(child._matrix);
			s.expandBySphere(_childSphere);
			if (s.radius === Infinity) return;
		}
	}
	/**
	 * Recompute matrixWorld from the parent's, for code that needs current
	 * world matrices between frames, like Box3.expandByObject(). Only the
	 * matrices: the bounds and the dirty flags are left to updateMatrixWorld(),
	 * which the next frame runs from the scene root.
	 *
	 * @param updateParents Recompute the ancestors first.
	 * @param updateChildren Recompute the whole subtree too.
	 */
	computeWorldMatrix( updateParents, updateChildren ) {
		const parent = this.parent;
		if ( updateParents === true && parent !== null ) {
			parent.computeWorldMatrix( true, false );
		}

		if ( this.matrixAutoUpdate ) this.updateMatrix();

		if ( this.parent === null ) {
			this.matrixWorld.copy( this._matrix );
		} else {
			this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this._matrix );
		}


		this._boundsDirty = true;

		// update children
		if ( updateChildren === true ) {
			const children = this.children;
			for ( let i = 0, l = children.length; i < l; i ++ ) {
				children[ i ].computeWorldMatrix( false, true );
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
		this._subtreeDirty = true;
		// The world matrix and sphere were the old parent's.
		object._matrixWorldNeedsUpdate = true;

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
			this._subtreeDirty = true;

						// Notify onChange subscriber
						if (this._onChangeListener) {
								var update = {uuid: object._uuid, changes: {parentUuid: null, objectRef: object}};
								this._onChangeListener.hierarchyUpdate(update)
						}
		}
	}

	clear() {
				let self = this;
				this._subtreeDirty = true;

				this._children = this._children.filter(function (child) {
						child._parent = null;
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

		// MT: This is unused. Also, does not transform children to parent frame.

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

	get boundingSphereWorld() {
		if (this._geometry && this._boundsDirty) {
			this._boundingSphereWorld.copy(this.geometry.boundingSphere).applyMatrix4(this.matrixWorld);
			this._boundsDirty = false;
		}
		return this._boundingSphereWorld;
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
