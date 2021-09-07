/**
 * Created by Sebastien.
 */

import {Vector3} from '../math/Vector3.js';
import {Quaternion} from '../math/Quaternion.js';

export class FullOrbitCameraControls {
	//general idea: rotate an object(camera) around a point. Use quaternions.
	//if object is camera, get its new position, set look at on point, and recalculate up vector

	constructor(camera, orbitCenter){
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

		// Holds currently active camera object (Camera)
		this._camera = camera;
		this._resetCameraPosition = this._camera.position.clone();

		// Location of camera focus
		this._orbitCenter = orbitCenter.clone();
		this._resetOrbitCenter = this._orbitCenter.clone();


		this._enablePivotMarker = true;
		this._marker = undefined;


		this._enableInertia = true;
		this._inertia = new Vector3();


		this._radius = camera.position.distanceTo(this._orbitCenter);


		// Is zooming in/out enabled
		this._zoomEnabled = true;
		this._zoomSpeed = 1.8;

		// How far you can dolly in and out (PerspectiveCamera only)
		this._minDistance = 0.5;
		this._maxDistance = Infinity;

		// Set to false to disable rotating
		this._enableRotate = true;
		this._rotateSpeed = 1.0;

		this._enableTranslate = true;
		this._translateSpeed = 1.0;

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
		this.update = __updateHandle;

		this._animate = __animateHandle;

		this._locked = false;
	}


	set locked(val) {
		this._locked = val;
	}

	get locked() {
		return this._locked;
	}

	set marker(marker){
		this._marker = marker;
	}

	set keyMap(keyMap){
		this._ACTION = keyMap;
	}

	_getZoomScale(deltaT) {
		return Math.pow(0.95, this._zoomSpeed * deltaT * 0.1);
	}

	/**
	 * Sets camera position and the orbit center
	 * @param {Vector3} cameraPosition
	 * @param {Vector3} orbitCenter
	 */
	setPositions(cameraPosition, orbitCenter) {
		this._camera.position = cameraPosition;
		this._orbitCenter = orbitCenter;

		this._resetCameraPosition = cameraPosition.clone();
		this._resetOrbitCenter = orbitCenter.clone();
	}

	reset() {
		this._orbitCenter = this._resetOrbitCenter;
	}

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
		this._resetCameraPosition = this._camera.position.clone();
		this._resetOrbitCenter = this._orbitCenter.clone();
	}

	/**
	 * Enqueues new camera animation that interpolates camera position and rotation to the specified values in the given time.
	 * Upon finishing the onFinish callback is called.
	 * @param id Animation id
	 * @param position Target camera position
	 * @param quaternion Target camera quaternion
	 * @param time Duration of the interpolation
	 * @param onFinish Callback fired upon finishing the animation
	 */
	animateTo(id, position, quaternion, time, onFinish = null) {
		this._cameraAnimationQueue.push({
			id: id,
			position: position,
			quaternion: quaternion,
			time: time,
			onFinish: onFinish
		})
	}

	/**
	 * Cancels animation with the given ID.
	 * @param id
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
	 * Cancels currently executed animation and all of the animations in the queue
	 */
	cancelAllAnimations() {
		this._currentAnimation = null;
		this._cameraAnimationQueue = [];
	}


	_getMouseMoveVector(mouse){
		let deltaMouseMove = new Vector3();
		deltaMouseMove.x = (mouse.prevPosition.x - mouse.position.x);
		deltaMouseMove.y = (mouse.prevPosition.y - mouse.position.y);
		deltaMouseMove.z = 0;

		return deltaMouseMove;
	}
	_scaleMouseVector(mouseVector, scale){
		let translationVec = new Vector3();
		translationVec.x = mouseVector.x * scale;
		translationVec.y = mouseVector.y * scale;
		translationVec.z = 0;

		return translationVec;
	}

	_applyFullTransform(){

	}
	_applyPlanarTranslate(deltaMouseMove){
		//shift camera in world space
		this._camera.position.add(deltaMouseMove);
		this._orbitCenter.add(deltaMouseMove);
	}
	_applyRotate(deltaMouseMove){
		this._camera.rotateX(-deltaMouseMove.y);
		this._camera.rotateY(deltaMouseMove.x);


		let forwardVector = new Vector3(0, 0, -1).applyQuaternion(this._camera.quaternion);
		forwardVector.multiplyScalar(this._radius);
		this._orbitCenter = this._camera.position.clone().add(forwardVector);
	}
	_applyOrbitalRotation(deltaMouseMove){
		//let deltaMouseMove = this._getMouseMoveVector(inputData.mouse);
		//deltaMouseMove.multiplyScalar(this._radius * this._rotateSpeed/6 * deltaT);


		//transform vector to world space (only rotation is necessary for vectors)
		//deltaMouseMove.applyQuaternion(this._camera.quaternion);


		let orbitCenterToCameraVector = this._camera.position.clone();
		orbitCenterToCameraVector.sub(this._orbitCenter);

		let orbitCenterToCameraVector2 = orbitCenterToCameraVector.clone();
		orbitCenterToCameraVector2.add(deltaMouseMove);

		orbitCenterToCameraVector.normalize();
		orbitCenterToCameraVector2.normalize();

		let deltaRotQ = new Quaternion().setFromUnitVectors(orbitCenterToCameraVector, orbitCenterToCameraVector2);


		//let newUp = this._camera.up;
		////newUp.sub(this._orbitCenter);
		//newUp.applyQuaternion(deltaRotQ);
		////newUp.add(this._orbitCenter);
		let newUp = this._camera.up.clone();
		newUp.applyQuaternion(this._camera.quaternion);
		newUp.applyQuaternion(deltaRotQ);


		let newPos = this._camera.position.clone();
		newPos.sub(this._orbitCenter);
		newPos.applyQuaternion(deltaRotQ);
		newPos.add(this._orbitCenter);


		//camera world space
		this._camera.position = newPos;
		this._camera.lookAt(this._orbitCenter, newUp);
	}
	_applyTransform(inputData, deltaT){
		let translation = new Vector3();
		let rotation = new Vector3();

		let clampMin = new Vector3(-1, -1, -1);
		let clampMax = new Vector3(1, 1, 1);


		// Reset
		//translation.fromArray([0, 0, 0]);
		//rotation.fromArray([0, 0, 0]);

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


		// Clamp the input sum
		translation.clamp(clampMin, clampMax);
		rotation.clamp(clampMin, clampMax);


		translation.multiplyScalar(deltaT * 0.04 * inputData.multiplier);
		rotation.multiplyScalar(deltaT * 0.0004 * inputData.multiplier);


		// Apply the rotation and translation to the camera
		this._camera.translate(translation);
		this._camera.rotate(rotation);
	}
};


let __animateHandle = (function () {

	return function (deltaT) {

		//prepare animation
		if (this._currentAnimation === null) {
			//select next animation in queue
			let entry = this._cameraAnimationQueue.shift();


			//calculate ...
			let orbitCenterToCameraVector = this._camera.position.clone();
			orbitCenterToCameraVector.sub(this._orbitCenter);

			let orbitCenterToCameraVector2 = entry.position.clone();
			orbitCenterToCameraVector2.sub(this._orbitCenter);


			// Wrap the entry with additional info
			this._currentAnimation = {
				startPos: this._camera.position.clone(),


				startPosQ: new Quaternion(),
				currentPosQ: new Quaternion(),
				endPosQ: new Quaternion().setFromUnitVectors(orbitCenterToCameraVector.clone().normalize(), orbitCenterToCameraVector2.clone().normalize()),


				startDistance: orbitCenterToCameraVector.length(),
				endDistance: orbitCenterToCameraVector2.length(),


				startRot: this._camera.quaternion.clone(),

				timePassed: 0,
				animationEntry: entry
			};
		}


		//prepare vars
		// entry
		let entry = this._currentAnimation.animationEntry;
		// Increment time passed
		this._currentAnimation.timePassed += deltaT;


		// If the animation time exceeded the execution time set camera position and rotation to the target values
		if ( this._currentAnimation.timePassed < entry.time && (!this._currentAnimation.endPosQ.equals(this._currentAnimation.currentPosQ) || !entry.quaternion.equals(this._camera.quaternion)) ) {
			//animate new position
			let newPos = this._currentAnimation.startPos.clone();
			newPos.sub(this._orbitCenter);

			//newPos.applyQuaternion(this._currentAnimation.currentPosQ.inverse());
			Quaternion.slerp( this._currentAnimation.startPosQ, this._currentAnimation.endPosQ, this._currentAnimation.currentPosQ, this._currentAnimation.timePassed / entry.time );
			newPos.applyQuaternion(this._currentAnimation.currentPosQ);

			newPos.normalize();
			newPos.multiplyScalar(
				this._currentAnimation.startDistance + (this._currentAnimation.timePassed / entry.time) * (this._currentAnimation.endDistance - this._currentAnimation.startDistance)
			);

			newPos.add(this._orbitCenter);

			this._camera.position = newPos;

			Quaternion.slerp( this._currentAnimation.startRot, entry.quaternion, this._camera.quaternion, this._currentAnimation.timePassed / entry.time );

		} else {
			//set end positiona and rotation
			this._camera.position = entry.position;
			this._camera.quaternion = entry.quaternion;

			//update local vars
			this._radius = this._currentAnimation.endDistance;
			this._currentAnimation = null;

			// Notify that the animation has finished
			if (entry.onFinish != null) {
				entry.onFinish(this._camera);
			}
		}
	}
})();

let __updateHandle = function (inputData, deltaT) {
	//CHECK
	// If there are any animations in queue execute the animation step and disregard the input
	if (this._cameraAnimationQueue.length > 0 || this._currentAnimation != null) {
		this._animate(deltaT);
		return;
	}

	if (inputData == null || this._locked) {
		return;
	}


	//CAMERA TRANSFORM
	//translate camera if right mouse button is clicked
	if (!inputData.mouse.buttons.left && inputData.mouse.buttons.right && !inputData.mouse.buttons.middle && this._enableTranslate) {
		//create mouse move vector tor rotation
		let deltaMouseMove = this._getMouseMoveVector(inputData.mouse);
		deltaMouseMove.multiplyScalar(Math.sqrt(this._radius) * this._rotateSpeed/60 * deltaT);

		this._applyTransform(inputData, (Math.sqrt(this._radius) * this._translateSpeed/6 * deltaT));
		this._applyRotate(deltaMouseMove);

		//inertia flag
		if(this._enableInertia) {
			this._inertiaType = 0;
			this._inertia = deltaMouseMove.clone();
		}
	}

	//translate camera if middle mouse button is clicked
	if (!inputData.mouse.buttons.left && !inputData.mouse.buttons.right && inputData.mouse.buttons.middle && this._enableTranslate) {
		//create mouse move vector tor translation
		let deltaMouseMove = this._getMouseMoveVector(inputData.mouse);
		deltaMouseMove.multiplyScalar(this._radius * this._translateSpeed/6 * deltaT);

		//transform vector to world space (only rotation is necessary for vectors)
		deltaMouseMove.applyQuaternion(this._camera.quaternion);

		this._applyPlanarTranslate(deltaMouseMove);

		//inertia flag
		if(this._enableInertia) {
			this._inertiaType = 1;
			this._inertia = deltaMouseMove.clone();
		}
	}

	// Apply rotation if the left mouse button is clicked
	if (inputData.mouse.buttons.left && !inputData.mouse.buttons.right && !inputData.mouse.buttons.middle && this._enableRotate) {
		//create mouse move vector for rotation
		let deltaMouseMove = this._getMouseMoveVector(inputData.mouse);
		deltaMouseMove.multiplyScalar(this._radius * this._rotateSpeed/6 * deltaT);

		//transform vector to world space (only rotation is necessary for vectors)
		deltaMouseMove.applyQuaternion(this._camera.quaternion);

		this._applyOrbitalRotation(deltaMouseMove);

		//inertia flag
		if(this._enableInertia) {
			this._inertiaType = 2;
			this._inertia = deltaMouseMove.clone();
		}
	}

	// If zooming is enabled apply the wheel zoom
	if (inputData.mouse.wheel.deltaY !== 0 && this._zoomEnabled) {
		let zoomScale = this._getZoomScale(deltaT);

		if (inputData.mouse.wheel.deltaY > 0) {
			this._radius /= zoomScale;
		}else if (inputData.mouse.wheel.deltaY < 0) {
			this._radius *= zoomScale;
		}

		// clamp: restrict radius to be between desired limits
		this._radius = Math.max(this._minDistance, Math.min(this._maxDistance, this._radius));


		let orbitCenterToCameraVector = this._camera.position.clone();
		orbitCenterToCameraVector.sub(this._orbitCenter);
		orbitCenterToCameraVector.normalize();
		orbitCenterToCameraVector.multiplyScalar(this._radius);

		//camera world space
		this._camera.position = this._orbitCenter.clone().add(orbitCenterToCameraVector);
	}


	//set pivot
	if (this._enablePivotMarker && this._marker === !undefined) {
		this._marker.position = this._orbitCenter;
		this._marker.quaternion = this._camera.quaternion;
	}


	//inertia
	if(this._enableInertia && this._inertia.length() > 0.001) {
		switch (this._inertiaType) {
			case 0:
				break;
			case 1:
				if (!inputData.mouse.buttons.middle)
					this._applyPlanarTranslate(this._inertia.multiplyScalar(0.8));
				break;
			case 2:
				if (!inputData.mouse.buttons.left)
					this._applyOrbitalRotation(this._inertia.multiplyScalar(0.9));
					//this._applyOrbitalRotation(this._inertia.multiplyScalar(1.01).clone().applyQuaternion(this._camera.quaternion));
				break;
			case 3:
				break;
		}
	}
};