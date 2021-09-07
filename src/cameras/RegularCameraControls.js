/**
 * Created by Primoz Lavric on 27-Mar-17.
 */
import {Vector3} from '../math/Vector3.js';

export class RegularCameraControls {

	/**
	 * Create new RegularCameraControls object.
	 *
	 * @param camera Currently active camera.
	 */
	constructor(camera) {
		// Keyboard action
		this._ACTION = {
			ROT_X_NEG: 0,
			ROT_X_POS: 1,
			ROT_Y_NEG: 2,
			ROT_Y_POS: 3,
			ROT_Z_NEG: 4,
			ROT_Z_POS: 5,

			MV_X_NEG: 6,
			MV_X_POS: 7,
			MV_Y_NEG: 8,
			MV_Y_POS: 9,
			MV_Z_NEG: 10,
			MV_Z_POS: 11,
		};

		// Reference to the camera
		this._camera = camera;

		// If the camera is locked it cant be manipulated by the user input
		this._locked = false;

		/** Animation queue
		 animation_entry = {
				onFinish: function callback,
				time: amount of time in which the animation should finish (ms),
				position: target position
				rotation: target rotation
		 }
		 */
		this._cameraAnimationQueue = [];

		// Currently executed animation
		this._currentAnimation = null;

		// Function handle used to update the camera based on the input
		this.update = updateHandle;

		this._animate = animateHandle;
	}

	/**
	 * TODO
	 *
	 * @param sphere
	 * @param offsetDir
	 */
	focusOn(sphere, offsetDir) {
		// Convert camera fov degrees to radians
		let fov = this._camera.fov * (Math.PI / 180);

		// Calculate the required camera distance
		let distance = Math.abs(sphere.radius / Math.sin(fov / 2));

		// Offset the camera from the center of the sphere
		let offsetVector = offsetDir.clone();
		offsetVector.multiplyScalar(distance);
		offsetVector.add(sphere.center);

		// Update the camera
		this._camera.position = offsetVector;
		this._camera.lookAt(sphere.center, new Vector3(0, 1, 0));
	}

	/**
	 * Enqueue new camera animation that interpolates camera position and rotation to the specified values in the given
	 * time.
	 *
	 * @param id Animation id.
	 * @param position Target camera position.
	 * @param rotation Target camera rotation.
	 * @param time Duration of the interpolation.
	 * @param onFinish Callback fired upon finishing the animation.
	 */
	animateTo(id, position, rotation, time, onFinish = null) {
		this._cameraAnimationQueue.push({
			id: id,
			position: position,
			rotation: rotation,
			time: time,
			onFinish: onFinish
		})
	}

	/**
	 * Cancel animation with the given id.
	 *
	 * @param id Animation id.
	 */
	cancelAnimation(id) {
		if (this._currentAnimation != null && this._currentAnimation.animationEntry.id === id) {
			this._currentAnimation = null;
		}
		else {
			for (let i = 0; i < this._cameraAnimationQueue.length; i++) {
				if (this._cameraAnimationQueue[i].entry.id === id) {
					this._cameraAnimationQueue.splice(i, 1);
					return
				}
			}
		}
	}

	/**
	 * Cancel currently executed animation and all of the animations in the queue.
	 */
	cancelAllAnimations() {
		this._cameraAnimationQueue.clear();
		this._currentAnimation = null;
	}

	/**
	 * Check if the camera is locked.
	 *
	 * @returns True if camera is locked.
	 */
	get locked() {
			return this._locked;
	}

	/**
	 * Lock or unlock the camera.
	 *
	 * @param val True to lock the camera.
	 */
	set locked(val) {
		this._locked = val;
	}
};

let animateHandle = (function () {

	let rotationVector = new Vector3();
	let tranStepCopy = new Vector3();
	let rotStepCopy = new Vector3();

	return function (deltaT) {
		if (this._currentAnimation == null) {
			let entry = this._cameraAnimationQueue.shift();

			// Calculate step vectors. Process time in seconds to minimize error.
			let translationStepVector = entry.position.clone().sub(this._camera.position).divideScalar(entry.time / 1000);
			let rotationStepVector = entry.rotation.clone().sub(this._camera.rotation.toVector3(rotationVector)).divideScalar(entry.time / 1000);

			// Wrap the entry with step vectors
			this._currentAnimation = {
				tranStep: translationStepVector,
				rotStep: rotationStepVector,
				timePassed: 0,
				animationEntry: entry
			}
		}

		let entry = this._currentAnimation.animationEntry;

		// Increment time passed
		this._currentAnimation.timePassed += deltaT / 1000;

		// If the animation time exceeded the execution time set camera position and rotation to the target values
		if (this._currentAnimation.timePassed >= entry.time / 1000) {
			this._camera.position = entry.position;
			this._camera.rotationX = entry.rotation.x;
			this._camera.rotationY = entry.rotation.y;
			this._camera.rotationZ = entry.rotation.z;

			this._currentAnimation = null;

			// Notify that the animation has finished
			if (entry.onFinish != null) {
				entry.onFinish(this._camera);
			}
			return;
		}

		// Calculate current frame animation step
		tranStepCopy.copy(this._currentAnimation.tranStep).multiplyScalar(deltaT / 1000);
		rotStepCopy.copy(this._currentAnimation.rotStep).multiplyScalar(deltaT / 1000);

		// Apply the animation step
		this._camera.positionX += tranStepCopy.x;
		this._camera.positionY += tranStepCopy.y;
		this._camera.positionZ += tranStepCopy.z;

		this._camera.rotationX += rotStepCopy.x;
		this._camera.rotationY += rotStepCopy.y;
		this._camera.rotationZ += rotStepCopy.z;
	}
})();

let updateHandle = (function () {

	let translation = new Vector3();
	let rotation = new Vector3();

	let clampMin = new Vector3(-1, -1, -1);
	let clampMax = new Vector3(1, 1, 1);

	return function (inputData, deltaT) {
		// If there are any animations in queue execute the animation step and disregard the input
		if (this._cameraAnimationQueue.length > 0 || this._currentAnimation != null) {
			this._animate(deltaT);
			return;
		}

		// region APPLYING INPUT
		if (inputData != null && !this._locked) {
			// Reset
			translation.fromArray([0, 0, 0]);
			rotation.fromArray([0, 0, 0]);

			// region KEYBOARD
			let keyboard = inputData.keyboard;

			// region ROTATION
			if (keyboard.has(this._ACTION.ROT_X_NEG)) {
				rotation.x += -1;
			}

			if (keyboard.has(this._ACTION.ROT_X_POS)) {
				rotation.x += 1;
			}

			if (keyboard.has(this._ACTION.ROT_Y_NEG)) {
				rotation.y += -1;
			}

			if (keyboard.has(this._ACTION.ROT_Y_POS)) {
				rotation.y += 1;
			}

			if (keyboard.has(this._ACTION.ROT_Z_NEG)) {
				rotation.z += -1;
			}

			if (keyboard.has(this._ACTION.ROT_Z_POS)) {
				rotation.z += 1;
			}
			// endregion

			// region TRANSLATION
			if (keyboard.has(this._ACTION.MV_X_NEG)) {
				translation.x += -1;
			}

			if (keyboard.has(this._ACTION.MV_X_POS)) {
				translation.x += 1;
			}

			if (keyboard.has(this._ACTION.MV_Y_NEG)) {
				translation.y += -1;
			}

			if (keyboard.has(this._ACTION.MV_Y_POS)) {
				translation.y += 1;
			}

			if (keyboard.has(this._ACTION.MV_Z_NEG)) {
				translation.z += -1;
			}

			if (keyboard.has(this._ACTION.MV_Z_POS)) {
				translation.z += 1;
			}
			// endregion
			// endregion

			// region NAVIGATORS
			let navigators = inputData.navigators;

			rotation.add(navigators.rotation);
			translation.add(navigators.translation);
			// endregion

			// region GAMEPAD
			let gamepads = inputData.gamepads;

			for (let idx in gamepads) {
				if (gamepads.hasOwnProperty(idx) && gamepads[idx].axes.length >= 6) {
					let axes = gamepads[idx].axes;

					// Translation axes
					translation.x += axes[0];
					translation.y += axes[2] * -1;
					translation.z += axes[1];

					// Rotation axes
					rotation.x += axes[3];
					rotation.y += axes[5] * -1;
					rotation.z += axes[4];
				}
			}
			// endregion

			// Clamp the input sum
			translation.clamp(clampMin, clampMax);
			rotation.clamp(clampMin, clampMax);

			// Apply the rotation and translation to the camera
			this._camera.translate(translation.multiplyScalar(deltaT * 0.01 * inputData.multiplier));
			this._camera.rotate(rotation.multiplyScalar(deltaT * 0.0005 * inputData.multiplier));
		}
		// endregion
	}
})();