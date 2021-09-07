/**
 * Created by Ziga & Primoz on 1.4.2016.
 */
import {Camera} from '../cameras/Camera.js';

export class PerspectiveCamera extends Camera {

		/**
		 * Create new PerspectiveCamera object.
		 *
		 * @param fov Vertical field of view given in degrees.
		 * @param aspect Aspect ratio (width / height).
		 * @param near Distance to the near clipping plane of the projection camera frustum.
		 * @param far Distance to the far clipping plane of the projection camera frustum.
		 */

	constructor(fov, aspect, near, far, left = undefined, right = undefined, top = undefined, bottom = undefined) {
		super(Camera);

		this.type = "PerspectiveCamera";

		this._fov = fov || 50;
		this._aspect = aspect || 1;
		this._near = near || 0.1;
		this._far = far || 1000;

		this._top = top || this._near * Math.tan((Math.PI/180) * 0.5 * this._fov);
		this._bottom = bottom || -this._top;
		this._left = left || -0.5 * (this._aspect * (2 * this._top));
		this._right = right || -this._left;

		this.updateProjectionMatrix();
	}

	/**
	 * Update projection matrix based on current values of properties.
	 */
	updateProjectionMatrix() {
		this.projectionMatrix.makePerspective(this._left, this._right, this._top, this._bottom, this._near, this._far);
		if (this.frustumVisible) this.updateFrustum();
	}
	_updateTBLR(){
		this._top = this._near * Math.tan((Math.PI/180) * 0.5 * this._fov);
		this._bottom = -this._top;
		this._updateLR();
	}
	_updateLR(){
		this._left = -0.5 * (this._aspect * (2 * this._top));
		this._right = -this._left;
	}

	/**
	 * Get field of view.
	 *
	 * @returns Field of view.
	 */
	get fov() { return this._fov; }

	/**
	 * Get aspect ratio.
	 *
	 * @returns Aspect ratio.
	 */
	get aspect() { return this._aspect; }

	/**
	 * Get distance to the near clipping plane.
	 *
	 * @returns Distance to the near clipping plane.
	 */
	get near() { return this._near; }

	/**
	 * Get distance to the far clipping plane.
	 *
	 * @returns Distance to the far clipping plane.
	 */
	get far() { return this._far; }
	get left() { return this._left; }
	get right() { return this._right; }
	get top() { return this._top; }
	get bottom() { return this._bottom; }

	/**
	 * Set field of view.
	 *
	 * @param val Field of view to be set.
	 */
	set fov(val) {
		if (val !== this._fov) {
			this._fov = val;

			this._updateTBLR();
			this.updateProjectionMatrix();

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {fov: this._fov}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}

	/**
	 * Set aspect ratio.
	 *
	 * @param val Aspect ratio to be set.
	 */
	set aspect(val) {
		if (val !== this._aspect) {
			this._aspect = val;

			this._updateLR();
			this.updateProjectionMatrix();
		}
	}

	/**
	 * Set distance to the near clipping plane.
	 *
	 * @param val Distance to the near clipping plane to be set.
	 */
	set near(val) {
		if (val !== this._near) {
			this._near = val;

			this._updateTBLR();
			this.updateProjectionMatrix();

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {near: this._near}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}

	/**
	 * Set distance to the far clipping plane.
	 *
	 * @param val Distance to the far clipping plane to be set.
	 */
	set far(val) {
		if (val !== this._far) {
			this._far = val;

			this.updateProjectionMatrix();

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {far: this._far}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set left(val) {
		if (val !== this._left) {
			this._left = val;

			this.updateProjectionMatrix();

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {left: this._left}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set right(val) {
		if (val !== this._right) {
			this._right = val;

			this.updateProjectionMatrix();

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {right: this._right}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set top(val) {
		if (val !== this._top) {
			this._top = val;

			this.updateProjectionMatrix();

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {top: this._top}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	set bottom(val) {
		if (val !== this._bottom) {
			this._bottom = val;

			this.updateProjectionMatrix();

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {bottom: this._bottom}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}

	/**
	 * Serialize object to JSON.
	 *
	 * @returns JSON object.
	 */
	toJson() {
		// Export Object3D parameters
		var obj = super.toJson();

		// Export perspective camera parameters
		obj.fov = this._fov;
		obj.near = this._near;
		obj.far = this._far;

		return obj;
	}

	/**
	 * Create a new camera from the JSON data.
	 *
	 * @param data JSON data.
	 * @param aspect Aspect ratio.
	 */
	static fromJson(data, aspect) {
		// Create new object with the given camera parameters
		var camera = new PerspectiveCamera(data.fov, aspect, data.near, data.far);

		// Import underlying Object3D parameters
		return super.fromJson(data, camera);
	}

	/**
	 * Updates the camera with settings from data.
	 *
	 * @param data Update data.
	 */
	update(data) {
		super.update(data);

		// Check if there are any camera parameter updates
		var modified = false;
		for (var prop in data) {
			switch (prop) {
				case "fov":
					this._fov = data.fov;
					delete data.fov;
					modified = true;
					break;
				case "near":
					this._near = data.near;
					delete data.near;
					modified = true;
					break;
				case "far":
					this._far = data.far;
					delete data.far;
					modified = true;
					break;
				case "left":
					this._left = data.left;
					delete data.left;
					modified = true;
					break;
				case "right":
					this._right = data.right;
					delete data.right;
					modified = true;
					break;
				case "top":
					this._top = data.top;
					delete data.top;
					modified = true;
					break;
				case "bottom":
					this._bottom = data.bottom;
					delete data.bottom;
					modified = true;
					break;
			}
		}

		// If the camera parameters have been modified update the projection matrix
		if (modified) {
			this.updateProjectionMatrix();
		}
	}
};