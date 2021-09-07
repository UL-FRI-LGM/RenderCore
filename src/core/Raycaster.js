/**
 * Created by Primoz on 1. 08. 2016.
 */
import {Ray} from '../math/Ray.js'
import {PerspectiveCamera} from '../cameras/PerspectiveCamera.js';
import {OrthographicCamera} from '../cameras/OrthographicCamera.js';

export class Raycaster {

	constructor(origin, direction, near, far) {

		// Direction should be normalized
		this.ray = new Ray(origin, direction);

		// Ray clipping planes
		this.near = near || 0;
		this.far = far || Infinity;
	}

	setFromCamera(coords, camera) {
		if (camera instanceof PerspectiveCamera) {
			this.ray.origin.setFromMatrixPosition(camera.matrixWorld);
			this.ray.direction.set(coords.x, coords.y, 0.5).unproject(camera).sub(this.ray.origin).normalize();
		}
		else if (camera instanceof OrthographicCamera) {
			this.ray.origin.set(coords.x, coords.y, (camera.near + camera.far) / (camera.near - camera.far)).unproject(camera);
			this.ray.direction.set(0, 0, -1).transformDirection(camera.matrixWorld);
		}
	}

	static _intersectObject(object, raycaster, intersects, recursive) {
		// Check if the object is visible
		if (object.visible === false)
			return;

		// Test object
		object.raycast(raycaster, intersects);

		// Recurse through the hierarchy
		if (recursive === true) {
			var children = object.children;

			for (var i = 0; i < children.length; i++) {
				Raycaster._intersectObject(children[i], raycaster, intersects, true);
			}
		}
	}

	intersectObject(object, recursive) {

		var intersects = [];

		Raycaster._intersectObject(object, this, intersects, recursive);

		// Sort the intersects by distance
		intersects.sort( function(a, b) {return a.distance - b.distance;} );

		return intersects;
	}

	intersectObjects(objects, recursive) {

		var intersects = [];

		if ( Array.isArray( objects ) === false ) {
			console.warn('Raycaster: warning the given objects is not an array.');
			return intersects;
		}

		for ( var i = 0; i < objects.length; i ++ ) {
			Raycaster._intersectObject(objects[i], this, intersects, recursive);
		}

		// Sort the intersects by distance
		intersects.sort( function(a, b) {return a.distance - b.distance;} );

		return intersects;

	}
};