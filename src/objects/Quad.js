/**
 * Created by Primoz on 23. 07. 2016.
 */

import {Mesh} from './Mesh.js';
import {Geometry} from './Geometry.js';

import {Float32Attribute, Uint32Attribute} from '../core/BufferAttribute.js';

export class Quad extends Mesh {
	constructor(xy0, xy1, material, geometry, flipped = false) {

		if (geometry === undefined)
			geometry = Quad.makeGeometry(xy0, xy1, flipped);

		// Super Mesh
		super(geometry, material);

		this._xy0 = xy0;
		this._xy1 = xy1;

		this.type = "Quad";
	}

	static makeGeometry(xy0, xy1, flipped, do_normals = true, do_color = true) {
		let geometry = new Geometry();

		// Quad vertices
		if (flipped) {
			geometry.vertices = Float32Attribute(
				[
					xy0.x, xy0.y, 0,
					xy1.x, xy0.y, 0,
					xy1.x, xy1.y, 0,
					xy0.x, xy1.y, 0
				], 3
			);
			geometry.indices = Uint32Attribute([0, 1, 2, 0, 2, 3], 1);
			geometry.uv = Float32Attribute(
				[
					0, 0,
					1, 0,
					1, 1,
					0, 1
				], 2
			);
		} else {
			geometry.vertices = Float32Attribute(
				[
					xy0.x, xy1.y, 0,
					xy1.x, xy0.y, 0,
					xy0.x, xy0.y, 0,
					xy1.x, xy1.y, 0
				], 3
			);
			geometry.indices = Uint32Attribute([0, 1, 2, 0, 3, 1], 1);
			geometry.uv = Float32Attribute(
				[
					0, 0,
					1, 1,
					0, 1,
					1, 0
				], 2
			);
		}
		if (do_color)
			geometry.vertColor = Float32Attribute(
				[
					1, 1, 1, 1,
					1, 1, 1, 1,
					1, 1, 1, 1,
					1, 1, 1, 1
				], 4
			);
		if (do_normals)
			geometry.computeVertexNormals();

		return geometry;
	}

	toJson() {
		var obj = super.toJson();

		// Add Quad parameters
		obj.xy0 = this._xy0;
		obj.xy1 = this._xy1;

		return obj;
	}

	static fromJson(data, geometry, material) {
		// Create mesh object
		var quad = new Quad(data.xy0, data.xy1, material, geometry);

		// Import Object3D parameters
		quad = super.fromJson(data, undefined, undefined, quad);

		return quad;
	}
};