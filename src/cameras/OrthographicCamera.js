/**
 * Created by Primoz on 23. 07. 2016.
 */
import {Camera} from './Camera.js';

export class OrthographicCamera extends Camera {
	constructor(left, right, top, bottom, near, far) {
		super(Camera);

		this.type = "OrthographicCamera";

		this._left = left;
		this._right = right;
		this._top = top;
		this._bottom = bottom;

		this._near = ( near !== undefined ) ? near : 0.1;
		this._far = ( far !== undefined ) ? far : 2000;


		this._aspect = 1.0;
		this._zoom   = 1.0;

		this.updateProjectionMatrix();
	}

	get left()   { return this._left; }
	get right()  { return this._right; }
	get top()    { return this._top; }
	get bottom() { return this._bottom; }


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

	get near() { return this._near; }
	set near(val) {
		if (val !== this._near) {
			this._near = val;

			this.updateProjectionMatrix();

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {near: this._near}};
				this._onChangeListener.objectUpdate(update)
			}
		}
	}
	get far() { return this._far; }
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
	set aspect(val) {
		if (val !== this._aspect) {
			this._aspect = val;

			this._updateLR();
			this.updateProjectionMatrix();
		}
	}
	get aspect() { return this._aspect; }

	set zoom(val) {
		if (val !== this._zoom) {
			this._zoom = val;

			this.updateProjectionMatrix();
		}
	}
	get zoom() { return this._zoom; }

	updateProjectionMatrix() {
		var dx = (this._right - this._left) / (2 * this._zoom);
		var dy = (this._top - this._bottom) / (2 * this._zoom);
		var cx = (this._right + this._left) / 2;
		var cy = (this._top + this._bottom) / 2;

		var left = cx - dx;
		var right = cx + dx;
		var top = cy + dy;
		var bottom = cy - dy;

		this.projectionMatrix.makeOrthographic(left, right, top, bottom, this._near, this._far);
		if (this.frustumVisible) this.updateFrustum();
	}
	_updateLR(){
		this._left = -this._top * this._aspect;
		this._right = -this._left;
	}

	toJson() {
		// Export Object3D parameters
		var obj = super.toJson();

		// Export orthographic camera parameters
		obj.left = this._left;
		obj.right = this._right;
		obj.top = this._top;
		obj.bottom = this._bottom;

		obj.near = this._near;
		obj.far = this._far;

		return obj;
	}

	static fromJson(data) {
		// Create new object with the given camera parameters
		var camera = new OrthographicCamera(data.left, data.right, data.top, data.bottom, data.near, data.far);

		// Import underlying Object3D parameters
		return super.fromJson(data, camera);
	}

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
			}
		}

		// If the camera parameters have been modified update the projection matrix
		if (modified) {
			this.updateProjectionMatrix();
		}
	}
};
