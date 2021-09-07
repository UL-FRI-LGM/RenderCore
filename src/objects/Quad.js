/**
 * Created by Primoz on 23. 07. 2016.
 */

import {Mesh} from './Mesh.js';
import {Geometry} from './Geometry.js';

import {Float32Attribute, Uint32Attribute} from '../core/BufferAttribute.js';

export class Quad extends Mesh {
	constructor(xy0, xy1, material, geometry, flipped = false) {

		if (geometry === undefined) {
			var geometry = new Geometry();

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
			} else {
				geometry.vertices = Float32Attribute(
					[
						xy0.x, xy1.y, 0,
						xy1.x, xy0.y, 0,
						xy0.x, xy0.y, 0,
						xy1.x, xy1.y, 0
					], 3
				);
			}

			geometry.vertColor = Float32Attribute(
				[
					1, 1, 1, 1,
					1, 1, 1, 1,
					1, 1, 1, 1,
					1, 1, 1, 1
				], 4
			);
			if (flipped) {
				geometry.uv = Float32Attribute(
					[
						0, 0,
						1, 0,
						1, 1,
						0, 1
					], 2
				);
			} else {
				geometry.uv = Float32Attribute(
					[
						0, 0,
						1, 1,
						0, 1,
						1, 0
					], 2
				);
			}

			// Quad triangle vertices
			if (flipped) {
				geometry.indices = Uint32Attribute([0, 1, 2, 0, 2, 3], 1);
			} else {
				geometry.indices = Uint32Attribute([0, 1, 2, 0, 3, 1], 1);
			}
			geometry.computeVertexNormals();
		}

		// Super Mesh
		super(geometry, material);

		this._xy0 = xy0;
		this._xy1 = xy1;

		this.type = "Quad";
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