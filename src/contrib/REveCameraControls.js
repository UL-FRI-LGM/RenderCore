/** Beased on THREE.OrbitCameraControls:
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 * @author ScieCode / http://github.com/sciecode
 * and extended for ROOT-REve by
 * @author osschar
 * @author alja
 */

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

// Requires the following to be set on Camera passed.
//   this.camera.isPerspectiveCamera = true;
// or
//   this.camera.isOrthographicCamera = true;

import { EventDispatcher } from '../core/EventDispatcher.js';
import { Vector3 } from '../math/Vector3.js';
import { Vector2 } from '../math/Vector2.js';
import { Quaternion } from '../math/Quaternion.js';
import { Spherical } from '../math/Spherical.js';
import { Matrix4 } from '../math/Matrix4.js';


export class REveCameraControls extends EventDispatcher {

	static matrixExtendDone = false;

	constructor(object, domElement) {
		var MOUSE = { ROTATE: 0, DOLLY: 1, PAN: 2 };
		var TOUCH = { ROTATE: 0, PAN: 1, DOLLY_PAN: 2, DOLLY_ROTATE: 3 };

		super(EventDispatcher);

		if (!REveCameraControls.matrixExtendDone) {
			ExtendRCMatrix();
			REveCameraControls.matrixExtendDone = true;
		}

		this.object = object;

		this.domElement = (domElement !== undefined) ? domElement : document;

		// Set to false to disable this control
		this.enabled = true;

		// "target" sets the location of focus, where the object orbits around
		this.target = new Vector3();
		this.cameraCenter = new Vector3();

		// How far you can dolly in and out ( PerspectiveCamera only )
		this.minDistance = 0;
		this.maxDistance = Infinity;

		// How far you can zoom in and out ( OrthographicCamera only )
		this.minZoom = 0;
		this.maxZoom = Infinity;

		// How far you can orbit vertically, upper and lower limits.
		// Range is 0 to Math.PI radians.
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians

		// How far you can orbit horizontally, upper and lower limits.
		// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
		this.minAzimuthAngle = - Infinity; // radians
		this.maxAzimuthAngle = Infinity; // radians

		// Set to true to enable damping (inertia)
		// If damping is enabled, you must call controls.update() in your animation loop
		this.enableDamping = false;
		this.dampingFactor = 0.05;

		// This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
		// Set to false to disable zooming
		this.enableZoom = true;
		this.zoomSpeed = 1.0;

		// Set to false to disable rotating
		this.enableRotate = true;
		this.rotateSpeed = 1.0;

		// Set to false to disable panning
		this.enablePan = true;
		this.panSpeed = 1.0;
		this.screenSpacePanning = false; // if true, pan in screen-space
		this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

		// Set to true to automatically rotate around the target
		// If auto-rotate is enabled, you must call controls.update() in your animation loop
		this.autoRotate = false;
		this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

		// Set to false to disable use of the keys
		this.enableKeys = true;

		// The four arrow keys
		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

		// Mouse buttons
		this.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };

		// Touch fingers
		this.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

		// for reset
		this.target0 = this.target.clone();
		this.position0 = this.object.position.clone();
		this.zoom0 = this.object.zoom;

		//
		// public methods
		//
		this.setCamBaseMtx = function(hAxis, vAxis)
        {
			camBase.identity();

			camBase.setBaseVector(1, hAxis);
			camBase.setBaseVector(3, vAxis);

			let y = new Vector3();
			y.crossVectors(vAxis, hAxis);
			camBase.setBaseVector(2, y);
		};

		this.setFromBBox = function (bbox) {
            let bb_center = new Vector3();
			bbox.getCenter(bb_center);

			let bb_R = Math.max(bbox.min.length(), bbox.max.length());

			camTrans.identity();

			if (this.object.isPerspectiveCamera) {
				let fovDefault = 30;
				let fov = Math.min(fovDefault, this.object.aspect*fovDefault);
				let dollyDefault = bb_R / (2.0 * Math.tan(fov * Math.PI * 0.8/ 180));

				camTrans.moveLF(1, dollyDefault);
			}
			else {
                let dollyDefault  = 1.25*0.5*Math.sqrt(3)*bb_R;
				camTrans.moveLF(1, dollyDefault);
				scope.object.updateProjectionMatrix();
			}
		};

		this.setCameraCenter = function (x, y, z) {
			this.cameraCenter.set(x, y, z);

			let bt = new Matrix4();
			bt.multiplyMatrices(camBase, camTrans);
			camBase.setBaseVector(4, this.cameraCenter);
			let binv = camBase.clone();
			binv.getInverse(camBase);
			camTrans.multiplyMatrices(binv, bt);

			if (this.centerMarker) {
				this.centerMarker.position = this.cameraCenter;
				this.centerMarker.visible = true;
				this.centerMarker.updateMatrix();
			}
		};

		this.getPolarAngle = function () {
			return spherical.phi;
		};

		this.getAzimuthalAngle = function () {
			return spherical.theta;
		};

		this.saveState = function () {
			scope.target0.copy(scope.target);
			scope.position0.copy(scope.object.position);
			scope.zoom0 = scope.object.zoom;
		};

		this.reset = function () {
			scope.target.copy(scope.target0);
			scope.object.position.copy(scope.position0);
			scope.object.zoom = scope.zoom0;

			scope.object.updateProjectionMatrix();
			scope.dispatchEvent(changeEvent);

			scope.update();

			state = STATE.NONE;
		};

		// osschar - need to reset internal panOffset
		this.resetOrthoPanZoom = function () {
			return function resetOrthoPan() {
				panOffset.set(0, 0, 0);
				scope.object.zoom = 0.78; // AMT default ortho camera zoom value in ROOT GL
				scope.object.updateProjectionMatrix();
				zoomChanged = true;
			}
		}();

		// osschar - fake mouse up event, needed for context menu on M3 down
		this.resetMouseDown = function (event) {
			return function resetMouseDown(event) {
				onMouseUp(event);
			}
		}();

		this.testCameraMenu = function () {
			return function testCameraMenu() {
				dollyIn(0.5);
			}
		}();

		/////////////////////////////////////////////////////////////////////////
		////////////////////////////////////////////////////////////////////////
		// alja - set camera matrix from two operations camBase and camTrans
		this.update = function () {
			var lastPosition = new Vector3();
			var lastQuaternion = new Quaternion();
			return function update() {
				// dolly scale
				if (scale != 1.0) {
					let b1 = camTrans.getBaseVector(1);
					let b4 = camTrans.getBaseVector(4);
					let orig_dot = b1.dot(b4);
					let lookAtDist = Math.sqrt(orig_dot);
					let newMag = Math.sqrt(lookAtDist) * scale;
					b4.multiplyScalar(scale);
					camTrans.setBaseVector(4, b4);
					scale = 1.0;

					scope.object.near = Math.min(lookAtDist*0.1, 20);
				}

				// pan/ truck
				if (panOffset.x || panOffset.y) {
					camTrans.moveLF(2, panOffset.x);
					camTrans.moveLF(3, panOffset.y);
					panOffset.set(0, 0, 0);
				}

				let cam = new Matrix4();
				cam.multiplyMatrices(camBase, camTrans);

				// matrix needed to transform position from the picking
				scope.object.testMtx = cam;

				let eye = new Vector3(); eye.setFromMatrixPosition(cam);
				let fwd = new Vector3(); fwd.setFromMatrixColumn(cam, 0);
				let up = new Vector3(); up.setFromMatrixColumn(cam, 2);

				/*
				console.log("cam", cam, camBase, camTrans);
				console.log("up", up.x, up.y, up.z);
				console.log("fwd", fwd.x, fwd.y, fwd.z);
				console.log("eye", eye.x, eye.y, eye.z);
                */

				scope.object._matrix.lookAtMt(eye, fwd, up);
				scope.object._matrix.setPosition(eye);

				// camera matrix auto update is disabled to prevent reading from quaternions
				scope.object.matrixWorld.copy(scope.object.matrix);

				// update condition is:
				// min(camera displacement, camera rotation in radians)^2 > EPS
				// using small-angle approximation

				if (zoomChanged ||
					lastPosition.distanceToSquared(cam.getBaseVector(4)) > EPS ||
					10 * (sphericalDelta.phi + sphericalDelta.theta) > EPS) {

					scope.dispatchEvent(changeEvent);

					lastPosition.copy(cam.getBaseVector(4));
					lastQuaternion.copy(scope.object.quaternion);
					zoomChanged = false;

					sphericalDelta.theta = 0;
					sphericalDelta.phi = 0;

					return true;
				} else {
					let dp = lastPosition.distanceToSquared(cam.getBaseVector(4));
				}

				//scope.dispatchEvent(changeEvent);

				return true;
			};
		}();

		this.dispose = function () {
			scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
			scope.domElement.removeEventListener('mousedown', onMouseDown, false);
			scope.domElement.removeEventListener('wheel', onMouseWheel, false);

			scope.domElement.removeEventListener('touchstart', onTouchStart, false);
			scope.domElement.removeEventListener('touchend', onTouchEnd, false);
			scope.domElement.removeEventListener('touchmove', onTouchMove, false);

			document.removeEventListener('mousemove', onMouseMove, false);
			document.removeEventListener('mouseup', onMouseUp, false);

			window.removeEventListener('keydown', onKeyDown, false);

			//scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?
		};

		//
		// internals
		//

		var scope = this;

		var changeEvent = { type: 'change' };
		var startEvent = { type: 'start' };
		var endEvent = { type: 'end' };

		var STATE = {
			NONE: - 1,
			ROTATE: 0,
			DOLLY: 1,
			PAN: 2,
			TOUCH_ROTATE: 3,
			TOUCH_PAN: 4,
			TOUCH_DOLLY_PAN: 5,
			TOUCH_DOLLY_ROTATE: 6
		};

		var state = STATE.NONE;

		var EPS = 0.000001;

		// current position in spherical coordinates
		var spherical = new Spherical();
		var sphericalDelta = new Spherical();

		var camBase = new Matrix4();
		var camTrans = new Matrix4();

		var scale = 1;
		var panOffset = new Vector3();
		var zoomChanged = false;

		var rotateStart = new Vector2();
		var rotateEnd = new Vector2();
		var rotateDelta = new Vector2();

		var panStart = new Vector2();
		var panEnd = new Vector2();
		var panDelta = new Vector2();

		var dollyStart = new Vector2();
		var dollyEnd = new Vector2();
		var dollyDelta = new Vector2();

		function getAutoRotationAngle() {
			return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
		}

		function getZoomScale() {
			return Math.pow(0.95, scope.zoomSpeed);
		}

		function rotateLeft(angle) {
			sphericalDelta.theta -= angle;
		}

		function rotateUp(angle) {
			sphericalDelta.phi -= angle;
		}

		function rotateRad(hRotate, vRotate) {
			let fVAxisMinAngle = 0.01;
			// console.log("rotate rad BEGIN hrotate = ", hRotate, ", vRotate = ", vRotate);

			if (hRotate != 0.0) {
				let fwd = camTrans.getBaseVector(1);
				let lft = camTrans.getBaseVector(2);
				let up = camTrans.getBaseVector(3);
				let pos = camTrans.getTranslation();

				let deltaF = pos.dot(fwd);
				let deltaU = pos.dot(up);

				// up vector lock
				let zdir = camBase.getBaseVector(3);
				camBase.rotateIP(fwd);
				let theta = Math.acos(fwd.dot(zdir));
				if (theta + hRotate < fVAxisMinAngle)
					hRotate = fVAxisMinAngle - theta;
				else if (theta + hRotate > Math.PI - fVAxisMinAngle)
					hRotate = Math.PI - fVAxisMinAngle - theta;

				camTrans.moveLF(1, -deltaF);
				camTrans.moveLF(3, -deltaU);
				camTrans.rotateLF(3, 1, hRotate);
				camTrans.moveLF(3, deltaU);
				camTrans.moveLF(1, deltaF);
			}
			if (vRotate != 0.0) {
				camTrans.rotatePF(1, 2, -vRotate);
			}

			sphericalDelta.phi = hRotate;
			sphericalDelta.theta = vRotate;
		}

		// deltaX and deltaY are in pixels; right and down are positive
		var pan = function () {

			var offset = new Vector3();

			return function pan(deltaX, deltaY) {
				// amt, x seem to be negatd
				deltaX = -deltaX;

				var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

				if (scope.object.isPerspectiveCamera) {
					// perspective
					let targetDistance = 0.5 * (scope.object.far + scope.object.near) * Math.tan(0.5 * scope.object.fov * Math.PI / 180.0);
					// we use only clientHeight here so aspect ratio does not distort speed
					let h = deltaY * targetDistance / element.clientHeight;
					let w = deltaX * targetDistance / element.clientHeight;
					panOffset.setX(w);
					panOffset.setY(h);
				} else if (scope.object.isOrthographicCamera) {
					// orthographic
					panOffset.setX(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth);
					panOffset.setY(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight);
				} else {
					// camera neither orthographic nor perspective
					console.warn('WARNING: REveCameraControls encountered an unknown camera type - pan disabled.');
					scope.enablePan = false;
				}
				scope.update();
			};
		}();

		function dollyIn(dollyScale) {
			if (scope.object.isPerspectiveCamera) {
				scale /= dollyScale;
			} else if (scope.object.isOrthographicCamera) {
				scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
				scope.object.updateProjectionMatrix();
				zoomChanged = true;
			} else {
				console.warn('WARNING: REveCameraControls encountered an unknown camera type - dolly/zoom disabled.');
				scope.enableZoom = false;
			}
			scope.update();
		}

		function dollyOut(dollyScale) {
			if (scope.object.isPerspectiveCamera) {
				scale *= dollyScale;
			} else if (scope.object.isOrthographicCamera) {
				scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
				scope.object.updateProjectionMatrix();
				zoomChanged = true;
			} else {
				console.warn('WARNING: REveCameraControls encountered an unknown camera type - dolly/zoom disabled.');
				scope.enableZoom = false;
			}

			scope.update();
		}

		//
		// event callbacks - update the object state
		//

		function handleMouseDownRotate(event) {
			rotateStart.set(event.clientX, event.clientY);
		}

		function handleMouseDownDolly(event) {
			dollyStart.set(event.clientX, event.clientY);
		}

		function handleMouseDownPan(event) {
			panStart.set(event.clientX, event.clientY);
		}

		function handleMouseMoveRotate(event) {
			rotateEnd.set(event.clientX, event.clientY);

			rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			rotateRad(-2 * Math.PI * rotateDelta.y / element.clientHeight, 2 * Math.PI * rotateDelta.x / element.clientWidth);

			rotateStart.copy(rotateEnd);

			scope.update();
		}

		function handleMouseMoveDolly(event) {
			dollyEnd.set(event.clientX, event.clientY);

			dollyDelta.subVectors(dollyEnd, dollyStart);

			if (dollyDelta.y > 0) {
				dollyIn(getZoomScale());
			} else if (dollyDelta.y < 0) {
				dollyOut(getZoomScale());
			}

			dollyStart.copy(dollyEnd);

			scope.update();
		}

		function handleMouseMovePan(event) {
			panEnd.set(event.clientX, event.clientY);
			panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);

			pan(panDelta.x, panDelta.y);

			panStart.copy(panEnd);

			scope.update();
		}

		function handleMouseUp( /*event*/) {
			// no-op
		}

		function handleMouseWheel(event) {
			if (event.deltaY < 0) {
				dollyOut(getZoomScale());
			} else if (event.deltaY > 0) {
				dollyIn(getZoomScale());
			}

			scope.update();
		}

		function handleKeyDown(event) {
			var needsUpdate = false;

			switch (event.keyCode) {
				case scope.keys.UP:
					pan(0, scope.keyPanSpeed);
					needsUpdate = true;
					break;

				case scope.keys.BOTTOM:
					pan(0, - scope.keyPanSpeed);
					needsUpdate = true;
					break;

				case scope.keys.LEFT:
					pan(scope.keyPanSpeed, 0);
					needsUpdate = true;
					break;

				case scope.keys.RIGHT:
					pan(- scope.keyPanSpeed, 0);
					needsUpdate = true;
					break;
			}

			if (needsUpdate) {
				// prevent the browser from scrolling on cursor keys
				event.preventDefault();
				// and prevent others from consuming the event
				event.stopImmediatePropagation();
				scope.update();
			}
		}

		function handleTouchStartRotate(event) {
			if (event.touches.length == 1) {
				rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
			} else {
				var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
				var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
				rotateStart.set(x, y);
			}
		}

		function handleTouchStartPan(event) {
			if (event.touches.length == 1) {
				panStart.set(event.touches[0].pageX, event.touches[0].pageY);
			} else {
				var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
				var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
				panStart.set(x, y);
			}
		}

		function handleTouchStartDolly(event) {
			var dx = event.touches[0].pageX - event.touches[1].pageX;
			var dy = event.touches[0].pageY - event.touches[1].pageY;
			var distance = Math.sqrt(dx * dx + dy * dy);
			dollyStart.set(0, distance);
		}

		function handleTouchStartDollyPan(event) {
			if (scope.enableZoom) handleTouchStartDolly(event);
			if (scope.enablePan) handleTouchStartPan(event);
		}

		function handleTouchStartDollyRotate(event) {
			if (scope.enableZoom) handleTouchStartDolly(event);
			if (scope.enableRotate) handleTouchStartRotate(event);
		}

		function handleTouchMoveRotate(event) {
			if (event.touches.length == 1) {
				rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
			} else {
				var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
				var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
				rotateEnd.set(x, y);
			}

			rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			rotateRad(-2 * Math.PI * rotateDelta.y / element.clientHeight, 2 * Math.PI * rotateDelta.x / element.clientWidth);

			rotateStart.copy(rotateEnd);
		}

		function handleTouchMovePan(event) {
			if (event.touches.length == 1) {
				panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
			} else {
				var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
				var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
				panEnd.set(x, y);
			}

			panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);

			pan(panDelta.x, panDelta.y);

			panStart.copy(panEnd);
		}

		function handleTouchMoveDolly(event) {
			var dx = event.touches[0].pageX - event.touches[1].pageX;
			var dy = event.touches[0].pageY - event.touches[1].pageY;
			var distance = Math.sqrt(dx * dx + dy * dy);

			dollyEnd.set(0, distance);
			dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, scope.zoomSpeed));
			dollyIn(dollyDelta.y);
			dollyStart.copy(dollyEnd);
		}

		function handleTouchMoveDollyPan(event) {
			if (scope.enableZoom) handleTouchMoveDolly(event);
			if (scope.enablePan) handleTouchMovePan(event);
		}

		function handleTouchMoveDollyRotate(event) {
			if (scope.enableZoom) handleTouchMoveDolly(event);
			if (scope.enableRotate) handleTouchMoveRotate(event);
		}

		function handleTouchEnd( /*event*/) {
			// no-op
		}

		//
		// event handlers - FSM: listen for events and reset state
		//

		function onMouseDown(event) {
			if (scope.enabled === false) return;

			// Prevent the browser from scrolling.

			event.preventDefault();

			// Manually set the focus since calling preventDefault above
			// prevents the browser from setting it automatically.

			scope.domElement.focus ? scope.domElement.focus() : window.focus();

			switch (event.button) {
				case 0:
					switch (scope.mouseButtons.LEFT) {
						case MOUSE.ROTATE:
							if (event.ctrlKey || event.metaKey || event.shiftKey) {
								if (scope.enablePan === false) return;
								handleMouseDownPan(event);
								state = STATE.PAN;
							} else {
								if (scope.enableRotate === false) return;
								handleMouseDownRotate(event);
								state = STATE.ROTATE;
							}
							break;

						case MOUSE.PAN:
							if (event.ctrlKey || event.metaKey || event.shiftKey) {
								if (scope.enableRotate === false) return;
								handleMouseDownRotate(event);
								state = STATE.ROTATE;
							} else {
								if (scope.enablePan === false) return;
								handleMouseDownPan(event);
								state = STATE.PAN;
							}
							break;

						default:
							state = STATE.NONE;
					}
					break;

				case 1:
					switch (scope.mouseButtons.MIDDLE) {
						case MOUSE.DOLLY:
							if (scope.enableZoom === false) return;
							handleMouseDownDolly(event);
							state = STATE.DOLLY;
							break;

						default:
							state = STATE.NONE;
					}
					break;

				case 2:
					switch (scope.mouseButtons.RIGHT) {
						case MOUSE.ROTATE:
							if (scope.enableRotate === false) return;
							handleMouseDownRotate(event);
							state = STATE.ROTATE;
							break;

						case MOUSE.PAN:
							if (scope.enablePan === false) return;
							handleMouseDownPan(event);
							state = STATE.PAN;
							break;

						default:
							state = STATE.NONE;
					}
					break;
			}

			if (state !== STATE.NONE) {
				document.addEventListener('mousemove', onMouseMove, false);
				document.addEventListener('mouseup', onMouseUp, false);

				scope.dispatchEvent(startEvent);
			}
		}

		function onMouseMove(event) {
			if (scope.enabled === false) return;

			event.preventDefault();

			switch (state) {
				case STATE.ROTATE:
					if (scope.enableRotate === false) return;
					handleMouseMoveRotate(event);
					break;

				case STATE.DOLLY:
					if (scope.enableZoom === false) return;
					handleMouseMoveDolly(event);
					break;

				case STATE.PAN:
					if (scope.enablePan === false) return;
					handleMouseMovePan(event);
					break;
			}
		}

		function onMouseUp(event) {
			if (scope.enabled === false) return;

			handleMouseUp(event);

			document.removeEventListener('mousemove', onMouseMove, false);
			document.removeEventListener('mouseup', onMouseUp, false);

			scope.dispatchEvent(endEvent);

			state = STATE.NONE;
		}

		function onMouseWheel(event) {
			if (scope.enabled === false || scope.enableZoom === false || (state !== STATE.NONE && state !== STATE.ROTATE)) return;

			event.preventDefault();
			event.stopPropagation();

			scope.dispatchEvent(startEvent);

			handleMouseWheel(event);

			scope.dispatchEvent(endEvent);
		}

		function onKeyDown(event) {
			if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) return;

			handleKeyDown(event);
		}

		function onTouchStart(event) {
			if (scope.enabled === false) return;

			event.preventDefault();

			switch (event.touches.length) {
				case 1:
					switch (scope.touches.ONE) {
						case TOUCH.ROTATE:
							if (scope.enableRotate === false) return;
							handleTouchStartRotate(event);
							state = STATE.TOUCH_ROTATE;
							break;

						case TOUCH.PAN:
							if (scope.enablePan === false) return;
							handleTouchStartPan(event);
							state = STATE.TOUCH_PAN;
							break;

						default:
							state = STATE.NONE;
					}
					break;

				case 2:
					switch (scope.touches.TWO) {
						case TOUCH.DOLLY_PAN:
							if (scope.enableZoom === false && scope.enablePan === false) return;
							handleTouchStartDollyPan(event);
							state = STATE.TOUCH_DOLLY_PAN;
							break;

						case TOUCH.DOLLY_ROTATE:
							if (scope.enableZoom === false && scope.enableRotate === false) return;
							handleTouchStartDollyRotate(event);
							state = STATE.TOUCH_DOLLY_ROTATE;
							break;
						default:
							state = STATE.NONE;
					}
					break;

				default:
					state = STATE.NONE;

			}

			if (state !== STATE.NONE) {
				scope.dispatchEvent(startEvent);
			}
		}

		function onTouchMove(event) {

			if (scope.enabled === false) return;

			event.preventDefault();
			event.stopPropagation();

			switch (state) {
				case STATE.TOUCH_ROTATE:
					if (scope.enableRotate === false) return;
					handleTouchMoveRotate(event);
					scope.update();
					break;

				case STATE.TOUCH_PAN:
					if (scope.enablePan === false) return;
					handleTouchMovePan(event);
					scope.update();
					break;

				case STATE.TOUCH_DOLLY_PAN:
					if (scope.enableZoom === false && scope.enablePan === false) return;
					handleTouchMoveDollyPan(event);
					scope.update();
					break;

				case STATE.TOUCH_DOLLY_ROTATE:
					if (scope.enableZoom === false && scope.enableRotate === false) return;
					handleTouchMoveDollyRotate(event);
					scope.update();
					break;

				default:
					state = STATE.NONE;
			}
		}

		function onTouchEnd(event) {
			if (scope.enabled === false) return;

			handleTouchEnd(event);

			scope.dispatchEvent(endEvent);

			state = STATE.NONE;
		}

		function onContextMenu(event) {
			if (scope.enabled === false) return;

			event.preventDefault();
		}

		function ExtendRCMatrix() {
			Matrix4.prototype.lookAtMt = function (eye, fwd, up) {
				var _x = new Vector3();
				var _y = new Vector3();
				var _z = new Vector3();
				var te = this.elements;

				_z.copy(fwd);
				// _z.negate();
				_z.normalize();
				_x.crossVectors( up, _z );
				_x.normalize();
				_y.crossVectors( _z, _x );

				te[ 0 ] = _x.x; te[ 4 ] = _y.x; te[ 8 ] = _z.x;
				te[ 1 ] = _x.y; te[ 5 ] = _y.y; te[ 9 ] = _z.y;
				te[ 2 ] = _x.z; te[ 6 ] = _y.z; te[ 10 ] = _z.z;

				return this;
			};

			Matrix4.prototype.getBaseVector = function (idx) {
				let off = 4 * --idx;
				let C = this.elements;
				return new Vector3(C[off + 0], C[off + 1], C[off + 2]);
			};

			Matrix4.prototype.getTranslation =  function () {
				let C = this.elements;
				return new Vector3(C[12], C[13], C[14]);
			};

			Matrix4.prototype.setBaseVector = function (idx, x, y, z) {
				let off = 4 * --idx;
				let C = this.elements;
				if (x.isVector3) {
					C[off + 0] = x.x; C[off + 1] = x.y; C[off + 2] = x.z;
				}
				else {
					C[off + 0] = x; C[off + 1] = y; C[off + 2] = z;
				}
			};

			Matrix4.prototype.rotateIP = function (v) {
				let M = this.elements;
				let r = v.clone();
				v.x = M[0] * r.x + M[4] * r.y + M[8] * r.z;
				v.y = M[1] * r.x + M[5] * r.y + M[9] * r.z;
				v.z = M[2] * r.x + M[6] * r.y + M[10] * r.z;
			};

			Matrix4.prototype.rotateLF = function (i1, i2, amount) {
				if (i1 == i2) return;

				let cos = Math.cos(amount); let sin = Math.sin(amount);
				let b1; let b2;
				let C = this.elements;
				i1 = (i1 - 1) * 4;
				i2 = (i2 - 1) * 4; // column major
				let off = 0;
				for (let r = 0; r < 4; ++r, ++off) {
					b1 = cos * C[i1 + off] + sin * C[i2 + off];
					b2 = cos * C[i2 + off] - sin * C[i1 + off];
					C[i1 + off] = b1; C[i2 + off] = b2;
				}
			};

			Matrix4.prototype.rotatePF = function (i1, i2, amount) {
				if (i1 == i2) return;

				let cos = Math.cos(amount); let sin = Math.sin(amount);
				let b1; let b2;
				let C = this.elements;
				--i1; --i2;
				for (let c = 0; c < 4; ++c) {
					let off = c * 4;
					b1 = cos * C[i1 + off] - sin * C[i2 + off];
					b2 = cos * C[i2 + off] + sin * C[i1 + off];
					C[i1 + off] = b1; C[i2 + off] = b2;
				}
			};

			Matrix4.prototype.moveLF = function (ai, amount) {
				let C = this.elements; let off = 4 * (ai - 1);
				C[12] += amount * C[off];
				C[13] += amount * C[off + 1];
				C[14] += amount * C[off + 2];
			};

			Matrix4.prototype.dump = function () {
				for (let x = 0; x < 4; x++) {
					let row = "[ ";
					for (let y = 0; y < 4; y++) {
						let val = this.elements[y * 4 + x].toFixed(2);
						row += val; row += " ";
					}
					console.log(row + "]");
				}
			}
		}

		scope.domElement.addEventListener('contextmenu', onContextMenu, false);

		scope.domElement.addEventListener('mousedown', onMouseDown, false);
		scope.domElement.addEventListener('wheel', onMouseWheel, false);

		scope.domElement.addEventListener('touchstart', onTouchStart, false);
		scope.domElement.addEventListener('touchend', onTouchEnd, false);
		scope.domElement.addEventListener('touchmove', onTouchMove, false);

		scope.domElement.addEventListener('mouseenter', function (event) {
			window.addEventListener('keydown', onKeyDown);
		});
		scope.domElement.addEventListener('mouseleave', function (event) {
			window.removeEventListener('keydown', onKeyDown);
		});

		// force an update at start

		this.update();
	}
};
