/**
 * Created by Primoz Lavric on 09-Mar-17.
 */

import {singleton, singletonEnforcer} from '../constants.js';

export class GamepadInput {

	constructor(enforcer) {
		// Do not allow singleton duplicates
		if (enforcer != singletonEnforcer) throw "Cannot construct singleton";

		// Gamepad detection events
		this._haveEvents = 'GamepadEvent' in window;
		this._haveWebkitEvents = 'WebKitGamepadEvent' in window;

		// Holds reference to all the active gamepads
		this._gamepads = {};

		// Start looking for gamepads
		this._initializeGamepadDetection();
	}

	update() {
		this._scanGamepads(true);
		return this._gamepads;
	}

	/**
	 *
	 * @Deprecated
	 * @returns {{rotation: THREE.Vector3, translation: THREE.Vector3}}
	 */
	getTranslationAndRotation() {
		let translation = new THREE.Vector3(0);
		let rotation = new THREE.Vector3(0);

		for (let idx in this._gamepads) {
			if (this._gamepads.hasOwnProperty(idx) && this._gamepads[idx].axes.length >= 6) {
				let axes = this._gamepads[idx].axes;

				// Translation axes
				translation.x += axes[0];
				translation.z += axes[1];
				translation.y += axes[2] * -1;

				// Rotation axes
				rotation.x += axes[3];
				rotation.z += axes[4];
				rotation.y += axes[5] * -1;
			}
		}

		// Constrain the axis sum
		translation.max(MINVEC).min(MAXVEC);
		rotation.max(MINVEC).min(MAXVEC);

		return {rotation: rotation, translation: translation};
	}

	/**
	 * Adds the specified gamepad to the gamepad dictionary.
	 * @param gamepad
	 * @private
	 */
	_addGamepad(gamepad) {
		if (this._isValidGamepad(gamepad)) {
			this._gamepads[gamepad.index] = gamepad;
		}
	}

	/**
	 * Removes the specified gamepad from the gamepad dictionary.
	 * @param gamepad
	 * @private
	 */
	_removeGamepad(gamepad) {
		delete this._gamepads[gamepad.index];
	}

	/**
	 * Initializes the gamepad detection procedure
	 * @private
	 */
	_initializeGamepadDetection() {

		let self = this;

		// Callbacks
		let connectHandler = function (e) {
			self._addGamepad(e.gamepad);
		};

		let disconnectHandler = function (e) {
				self._removeGamepad(e.gamepad);
		};

		// Determine the detection method
		if (this._haveEvents) {
			window.addEventListener("gamepadconnected", connectHandler);
			window.addEventListener("gamepaddisconnected", disconnectHandler);
		} else if (_haveWebkitEvents) {
			window.addEventListener("webkitgamepadconnected", connectHandler);
			window.addEventListener("webkitgamepaddisconnected", disconnectHandler);
		} else {
			setInterval(this._scanGamepads, 500);
		}
	}

	/**
	 * Used to update gamepad data and to detect gamepads when events aren't available
	 * @private
	 */
	_scanGamepads(update) {

		// Find gamepads
		let detectedGP = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);

		for (let i = 0; i < detectedGP.length; i++) {
			// Some detections may be null
			if (this._gamepads[i] == null) {
				continue;
			}

			// Either initialize (new gamepad) or update reference (existing gamepas)
			if (!(detectedGP[i].index in this._gamepads)) {
					initGamepad(detectedGP[i]);
			} else if (!update && this._isValidGamepad(detectedGP[i])) {
				this._gamepads[detectedGP[i].index] = detectedGP[i];
			}
		}
	}

	/**
	 * Checks if the gamepad is not blacklisted
	 * @param gamepad
	 * @returns {*|boolean} Is gamepad valid
	 * @private
	 */
	_isValidGamepad(gamepad) {
		let match = gamepadIDRegex.exec(gamepad.id);

		return !(BLACKLIST[match[1]] && BLACKLIST[match[1]].indexOf(match[2]) != -1);
	}


	static get instance() {
		if (!this[singleton]) {
			this[singleton] = new GamepadInput(singletonEnforcer);
		}

		return this[singleton];
	}
};