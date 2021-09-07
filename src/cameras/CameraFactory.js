import {Camera} from './Camera.js';
import {OrthographicCamera} from './OrthographicCamera.js';
import {PerspectiveCamera} from './PerspectiveCamera.js';

export class CameraFactory {
	constructor() {}
}

CameraFactory.getCameraClass = function(cameraTypeString) {
	switch (cameraTypeString) {
		case "Camera" : return Camera;
		case "OrthographicCamera" : return OrthographicCamera;
		case "PerspectiveCamera" : return PerspectiveCamera;
	}
};