/**
* Created by Primoz Lavric on 13-Mar-17.
*/
import {Quaternion} from '../math/Quaternion.js';
import {Vector3} from '../math/Vector3.js';
import {Euler} from '../math/Euler.js';
import {Spherical} from '../math/Spherical.js';

export class OrbitCameraControls {

	/**
	 * Create new OrbitCameraControls object.
	 *
	 * @param camera Currently active camera.
	 * @param orbitCenter Location of camera focus.
	 */
	constructor(camera, orbitCenter) {

		// Holds currently active camera object (Camera)
		this._camera = camera;

		// Location of camera focus
		this._orbitCenter = orbitCenter.clone();

		this._resetOrbitCenter = orbitCenter.clone();
		this._resetCameraPosition = this._camera.position.clone();

		// So that camera.up is in the orbit axis
		this._cameraQuaternion = new Quaternion().setFromUnitVectors(camera.up, new Vector3(0, 1, 0));
		this._cameraQuaternionInverse = this._cameraQuaternion.clone().inverse();

		// Is zooming in/out enabled
		this._zoomEnabled = true;
		this._zoomSpeed = 1.8;

		// How far you can dolly in and out (PerspectiveCamera only)
		this._minDistance = 1;
		this._maxDistance = Infinity;

		// How far you can orbit vertically, upper and lower limits.
		// Range is 0 to Math.PI radians.
		this._minPolarAngle = 0; // radians
		this._maxPolarAngle = Math.PI; // radians

		// How far you can orbit horizontally, upper and lower limits.
		// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
		this._minAzimuthAngle = - Infinity; // radians
		this._maxAzimuthAngle = Infinity; // radians

		// Set to false to disable rotating
		this._enableRotate = true;
		this._rotateSpeed = 1.0;

		// Holds current position in spherical coordinates
		this._spherical = new Spherical();

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

		// Reference to update function
		this.update = _updateHandle;

		this._animate = _animateHandle;

		this._locked = false;
	}

	/**
	 * TODO
	 *
	 * @param deltaT
	 * @returns
	 */
	_getZoomScale(deltaT) {
		return Math.pow(0.95, this._zoomSpeed * deltaT * 0.1);
	}

	/**
	 * Set camera position and orbit center.
	 *
	 * @param cameraPosition Position of the camera.
	 * @param orbitCenter Location of camera focus.
	 */
	setPositions(cameraPosition, orbitCenter) {
		this._camera.position = cameraPosition;
		this._orbitCenter = orbitCenter;

		this._resetOrbitCenter = orbitCenter.clone();
		this._resetCameraPosition = cameraPosition.clone();
	}

	/**
	 * Reset orbit center to initial position.
	 */
	reset() {
		this._orbitCenter = this._resetOrbitCenter;
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

		// Update orbit center
		this._orbitCenter = sphere.center.clone();

		this._minDistance = sphere.radius * 0.01;
		this._maxDistance = distance * 1.5;

		// Save reset position
		this._resetOrbitCenter = this._orbitCenter.clone();
		this._resetCameraPosition = this._camera.position.clone();
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

let _animateHandle = (function () {

	let helperSpherical = new Spherical();
	let helperCenterOffset = new Vector3();

	let centerOffset = new Vector3();

	return function (deltaT) {

		if (this._currentAnimation == null) {
			let entry = this._cameraAnimationQueue.shift();

				// Calculate the targeted orbit center and translation step
				let camDirVec = new Vector3(0, 0, -1).applyEuler(new Euler().fromArray(entry.rotation.toArray()));
				let radius = entry.position.clone().sub(this._resetOrbitCenter).length();

				let targetOrbitCenter = entry.position.clone().add(camDirVec.multiplyScalar(radius));

				let centerTranslationStep = targetOrbitCenter.clone().sub(this._orbitCenter).divideScalar(entry.time/1000);


				// Calculate the targeted spherical coordinates
				helperCenterOffset.copy(entry.position).sub(targetOrbitCenter);

				// rotate offset to "y-axis-is-up" space
				helperCenterOffset.applyQuaternion(this._cameraQuaternion);
				helperSpherical.setFromVector3(helperCenterOffset);

				let targetTheta = helperSpherical.theta;
				let targetPhi = helperSpherical.phi;

				// Calculate current position spherical coordinates
				centerOffset.copy(this._camera.position).sub(this._orbitCenter);

				// rotate offset to "y-axis-is-up" space
				centerOffset.applyQuaternion(this._cameraQuaternion);

				this._spherical.setFromVector3(centerOffset);

				// Calculate spherical step
				let thetaStep = (targetTheta - this._spherical.theta) / (entry.time/1000);
				let phiStep = (targetPhi - this._spherical.phi) / (entry.time/1000);
				let radiusStep = (radius - this._spherical.radius) / (entry.time/1000);


				// Wrap the entry with step vectors
				this._currentAnimation = {
					thetaStep: thetaStep,
					phiStep: phiStep,
					radiusStep: radiusStep,
					targetTheta: targetTheta,
					targetPhi: targetPhi,
					targetRadius: radius,
					targetOrbitCenter: targetOrbitCenter,
					centerTranslationStep: centerTranslationStep,
					timePassed: 0,
					animationEntry: entry
				}
			}

			let entry = this._currentAnimation.animationEntry;

		// Increment time passed
		this._currentAnimation.timePassed += deltaT / 1000;

		// If the animation time exceeded the execution time set camera position and rotation to the target values
		if (this._currentAnimation.timePassed >= entry.time / 1000) {
				// Set the orbit center position
				this._orbitCenter = this._currentAnimation.targetOrbitCenter;
				this._camera.position = this._currentAnimation.animationEntry.position;

				// Calculate current position spherical coordinates
				centerOffset.copy(this._camera.position).sub(this._orbitCenter);

				// rotate offset to "y-axis-is-up" space
				centerOffset.applyQuaternion(this._cameraQuaternion);

				this._spherical.setFromVector3(centerOffset);

				this._spherical.theta = this._currentAnimation.targetTheta;
				this._spherical.phi = this._currentAnimation.targetPhi;
				this._spherical.radius = this._currentAnimation.targetRadius;

				this._spherical.makeSafe();

				// Update center offset
				centerOffset.setFromSpherical(this._spherical);

				// rotate offset back to "camera-up-vector-is-up" space
				centerOffset.applyQuaternion(this._cameraQuaternionInverse);

				// Offset the camera using the updated center offset
				this._camera.position.copy(this._orbitCenter).add(centerOffset);

				// Look at the orbit center
				this._camera.lookAt(this._orbitCenter, this._camera.up);

				this._currentAnimation = null;

				// Notify that the animation has finished
				if (entry.onFinish != null) {
					entry.onFinish(this._camera);
				}
				return;
			}

		// Update the orbit center position
		this._orbitCenter.add(this._currentAnimation.centerTranslationStep.clone().multiplyScalar(deltaT/1000));
		this._camera.position.add(this._currentAnimation.centerTranslationStep.clone().multiplyScalar(deltaT/1000));

		// Calculate current position spherical coordinates
		centerOffset.copy(this._camera.position).sub(this._orbitCenter);

		// rotate offset to "y-axis-is-up" space
		centerOffset.applyQuaternion(this._cameraQuaternion);

		this._spherical.setFromVector3(centerOffset);

		this._spherical.theta += this._currentAnimation.thetaStep * deltaT/1000;
		this._spherical.phi += this._currentAnimation.phiStep * deltaT/1000;
		this._spherical.radius += this._currentAnimation.radiusStep * deltaT/1000;

		this._spherical.makeSafe();

		// Update center offset
		centerOffset.setFromSpherical(this._spherical);

		// rotate offset back to "camera-up-vector-is-up" space
		centerOffset.applyQuaternion(this._cameraQuaternionInverse);

		// Offset the camera using the updated center offset
		this._camera.position = this._orbitCenter.clone().add(centerOffset);

		// Look at the orbit center
		this._camera.lookAt(this._orbitCenter, this._camera.up);
	}
})();

let _updateHandle = function () {

	let centerOffset = new Vector3();
	let translationVec = new Vector3();

	return function (inputData, deltaT) {

		// If there are any animations in queue execute the animation step and disregard the input
		if (this._cameraAnimationQueue.length > 0 || this._currentAnimation != null) {
			this._animate(deltaT);
			return;
		}

		if (inputData == null ||this._locked) {
			return;
		}

		if (inputData.mouse.buttons.right && !inputData.mouse.buttons.left) {
			translationVec.x = (inputData.mouse.prevPosition.x - inputData.mouse.position.x) * deltaT * 10;
			translationVec.y = (inputData.mouse.prevPosition.y - inputData.mouse.position.y) * deltaT * 10;
			translationVec.z = 0;

			translationVec.applyEuler(this._camera.rotation);
			this._orbitCenter.add(translationVec);
			this._camera.position.add(translationVec);
		}

		centerOffset.copy(this._camera.position).sub(this._orbitCenter);

		// rotate offset to "y-axis-is-up" space
		centerOffset.applyQuaternion(this._cameraQuaternion);

		this._spherical.setFromVector3(centerOffset);

		// Apply rotation if the left mouse button is clicked
		if (this._enableRotate && inputData.mouse.buttons.left) {
				// Rotating across whole screen goes 360 degrees around
				this._spherical.theta -= 2 * Math.PI * (inputData.mouse.position.x - inputData.mouse.prevPosition.x) * this._rotateSpeed * deltaT * 0.03;

				// Rotating up and down along whole screen attempts to go 360, but limited to 180
				this._spherical.phi -= 2 * Math.PI * (inputData.mouse.prevPosition.y - inputData.mouse.position.y) * this._rotateSpeed * deltaT * 0.03;

				// restrict theta to be between desired limits
				this._spherical.theta = Math.max(this._minAzimuthAngle, Math.min(this._maxAzimuthAngle, this._spherical.theta));

				// restrict phi to be between desired limits
				this._spherical.phi = Math.max(this._minPolarAngle, Math.min(this._maxPolarAngle, this._spherical.phi));

				// Prevents Gimbal lock
				this._spherical.makeSafe();
			}

		// If zooming is enabled apply the wheel zoom
		if (this._zoomEnabled) {
			let zoomScale = this._getZoomScale(deltaT);

			if (inputData.mouse.wheel.deltaY > 0) {
				this._spherical.radius /= zoomScale;
			}
			else if (inputData.mouse.wheel.deltaY < 0) {
				this._spherical.radius *= zoomScale;
			}

		}

		// Restrict radius to be between desired limits
		this._spherical.radius = Math.max(this._minDistance, Math.min(this._maxDistance, this._spherical.radius));

		// Update center offset
		centerOffset.setFromSpherical(this._spherical);

		// rotate offset back to "camera-up-vector-is-up" space
		centerOffset.applyQuaternion(this._cameraQuaternionInverse);


		//let newUp = this._camera.up.clone().applyQuaternion(this._camera._quaternion);

		//this._cameraQuaternion.setFromUnitVectors(newUp, new Vector3(0, 1, 0));
		//this._cameraQuaternionInverse = this._cameraQuaternion.clone().inverse();


		// Offset the camera using the updated center offset
		this._camera.position = this._orbitCenter.clone().add(centerOffset);

		// Look at the orbit center
		this._camera.lookAt(this._orbitCenter, this._camera.up);
	}
}();