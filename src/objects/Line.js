/**
 * Created by Primoz on 6. 08. 2016.
 */

import {Mesh} from './Mesh.js';
import {Geometry} from './Geometry.js';
import {MeshBasicMaterial} from '../materials/MeshBasicMaterial.js';
import {LINE_STRIP} from "../constants.js";

export class Line extends Mesh {
	constructor(geometry, material) {

		if (material === undefined) {
			material = new MeshBasicMaterial();
		}

		// Super Mesh
		super(geometry, material);

		this.type = "Line";
		this.renderingPrimitive = LINE_STRIP;
	}

	setPoints(points) {
		if (this._geometry === undefined) {
	 		this._geometry = new Geometry();
		}
		// Quad vertices
		this._geometry.vertices.array = new Float32Array(points);
	}

	static fromJson(data, geometry, material) {
		// Create mesh object
		var line = new Line(geometry, material);

		// Import Object3D parameters
		line = super.fromJson(data, undefined, undefined, line);

		return line;
	}

};