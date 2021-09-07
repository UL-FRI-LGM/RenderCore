/**
 * Created by Sebastien.
 */

import {Vector3} from '../math/Vector3.js';
import {RegularCameraControls} from './RegularCameraControls.js';
import {OrbitCameraControls} from './OrbitCameraControls.js';
import {FullOrbitCameraControls} from './FullOrbitCameraControls.js';

export class CameraManager {
	constructor(){
		// Currently selected camera
		this._activeCamera = null;

		// List of all of the own cameras
		this._cameras = {};

		// Maps camera uuid to the controls that are used for that camera
		this._camerasControls = {};
	}

	//SETTERS
	set setGroupID(groupID){
		this._groupID = groupID;
	}
	/**
	 * Sets the given camera as active camera.
	 * @param camera
	 */
	set activeCamera(camera) {
		this._activeCamera = camera;

		if(this._cameras[camera._uuid] === undefined) this.addFullOrbitCamera(camera, new Vector3(0, 0, 0));
	}
	set cameras(cameras){
		this._cameras = cameras;
	}
	set camerasControls(camerasControls){
		this._camerasControls = camerasControls;
	}

	//GETTERS
	get getGroupID(){ return this._groupID; }
	get activeCamera() { return this._activeCamera; }
	get cameras() { return this._cameras; }
	get camerasControls() { return this._camerasControls; }

	//OTHER FUNCTIONS
	/**
	 * Creates new regular camera and controls for it
	 * @param camera Camera to be added
	 */
	addRegularCamera(camera) {
		this._cameras[camera._uuid] = camera;
		this._camerasControls[camera._uuid] = new RegularCameraControls(camera);
	}

	/**
	 * Creates new orbit camera and controls for it
	 * @param camera Camera to be added
	 * @param orbitCenter Center of the orbit
	 */
	addOrbitCamera(camera, orbitCenter) {
		this._cameras[camera._uuid] = camera;
		this._camerasControls[camera._uuid] = new OrbitCameraControls(camera, orbitCenter);
	}

	addFullOrbitCamera(camera, orbitCenter) {
		this._cameras[camera._uuid] = camera;
		this._camerasControls[camera._uuid] = new FullOrbitCameraControls(camera, orbitCenter);
	}

	removeCamera(camera){
		if(camera === this._activeCamera) this._activeCamera = null;

		delete this._cameras[camera._uuid];
		delete this._camerasControls[camera._uuid];
	}

	//ANIMATION RELATION FUNCTIONS
	update(inputData, deltaT) {
		// Update active camera
		// Update animations of non-active cameras
		for (let key in this._cameras) {
			if (this._cameras[key] === this._activeCamera) {
				this._camerasControls[this._cameras[key]._uuid].update(inputData, deltaT);
			}else{
				this._camerasControls[this._cameras[key]._uuid].update(null, deltaT);
			}
		}
	}

	/**
	 * Cancels the camera animation with the given id.
	 * @param camera Camera (should be enrolled in the camera manager)
	 * @param id Animation identificator
	 */
	cancelAnimation(camera, id) {
		let cameraControls = this._camerasControls[camera._uuid];

		if (cameraControls != null) {
			cameraControls.cancelAnimation(id);
		}
		else {
			console.warn("Cannot cancel camera animations. Controls for the given camera do not exist.")
		}
	}

	/**
	 * Cancels all of the camera animations
	 * @param camera Camera (should be enrolled in the camera manager)
	 */
	cancelAllAnimations(camera) {
		let cameraControls = this._camerasControls[camera._uuid];

		if (cameraControls != null) {
			cameraControls.cancelAllAnimations();
		}
		else {
			console.warn("Cannot cancel camera animations. Controls for the given camera do not exist.")
		}
	}

	/**
	 * Enqueues the animation with specified parameters for the given camera
	 * @param camera Camera that is to be animated (should be enrolled in the camera manager)
	 * @param id Animation identificator
	 * @param position Target position
	 * @param rotation Target rotation
	 * @param time Animation time specified in milliseconds
	 * @param onFinish Callback that is called after the animation finishes
	 */
	animateCameraTo(camera, id, position, rotation, time, onFinish = null) {
		let cameraControls = this._camerasControls[camera._uuid];

		if (cameraControls != null) {
			cameraControls.animateTo(id, position, rotation, time, onFinish);
		}
		else {
			console.warn("Cannot execute camera animation. Controls for the given camera do not exist.")
		}
	}

	/**
	 * Locks the camera in place. While locked the camera is not affected by the user input.
	 * @param camera Camera to be locked
	 */
	lockCamera(camera) {
		let cameraControls = this._camerasControls[camera._uuid];

		if (cameraControls != null) {
			cameraControls.locked = true;
		}
		else {
			console.warn("Cannot lock the camera. Controls for the given camera do not exist.")
		}
	}

	/**
	 * Unlocks the camera in place. While unlocked the camera will be affected by the user input.
	 * @param camera Camera to be unlocked
	 */
	unlockCamera(camera) {
		let cameraControls = this._camerasControls[camera._uuid];

		if (cameraControls != null) {
			cameraControls.locked = false;
		}
		else {
			console.warn("Cannot lock the camera. Controls for the given camera do not exist.")
		}
	}

	/**
	 * Checks if the specified camera is locked.
	 * @param camera Queried camera
	 * @returns {boolean} True if the camera is locked.
	 */
	isCameraLocked(camera) {
		let cameraControls = this._camerasControls[camera._uuid];

		return cameraControls == null || cameraControls.locked;
	}

	/**
	 * Checks if the cameras position and rotation are equal to the given position and rotation vector.
	 * @param position Position vector
	 * @param rotation Rotation vector
	 * @returns {*} True if the cameras position and rotation are equal to the specified vectors
	 */
	isActiveCameraInPosition(position, rotation) {
		let EPS = 0.0001;
		return this._activeCamera.position.clone().sub(position).length() < EPS && this._activeCamera.rotation.toVector3().clone().sub(rotation).length() < EPS;
	}

	focusCamerasOn(sphere, offsetDir) {

		for (let i = 0; i < this._cameras.length; i++) {
			let controls = this._camerasControls[this._cameras[i]._uuid];

			if (controls != null) {
				controls.focusOn(sphere, offsetDir);
			}
		}
	}


	cycle(){
		let arrayOfCameras = Object.keys(this._cameras);

		for(let i = 0; i < arrayOfCameras.length; i++){
			if(arrayOfCameras[i] === this._activeCamera._uuid){
				if(i < arrayOfCameras.length - 1){
					//restore next
					this._activeCamera = this._cameras[arrayOfCameras[i+1]];
				}else{
					//restore next (first)
					this._activeCamera = this._cameras[arrayOfCameras[0]];
				}

				console.log("Setting active camera to: " + this._activeCamera._uuid);
				return;
			}
		}
	}
};