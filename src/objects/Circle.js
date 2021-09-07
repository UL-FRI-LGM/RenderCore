/**
 * Created by Primoz on 6. 08. 2016.
 */

import {Float32Attribute, Uint32Attribute} from '../core/BufferAttribute.js';

import {Geometry} from './Geometry.js';
import {Mesh} from './Mesh.js';

export class Circle  extends Mesh {
	constructor(radius, n, material, geometry) {
		// Default radius: 1
		var _radius = (radius) ? radius : 1;
		// N must be at least 10 or greater to form a circle
		var _n = (n && n > 10) ? n : 10;

		if (geometry === undefined) {
			var step = (2 * Math.PI) / _n;

			var tempVertices = [];
			var tempIndices = [];

			// Generate buffers
			for (var i = 0; i < _n; i++) {
				// Vertices
				tempVertices.push(Math.cos(i * step) * _radius);  // X
				tempVertices.push(Math.sin(i * step) * _radius);  // Y
				tempVertices.push(0);                             // Z

				// Triangle indices
				tempIndices.push(i, (i + 1) % _n, _n);
			}

			// Center vertex
			tempVertices.push(0, 0, 0);

			var geometry = new Geometry();

			// Quad vertices
			geometry.vertices = Float32Attribute(tempVertices, 3);


			// Quad triangle vertices
			geometry.indices = Uint32Attribute(tempIndices, 1);
			geometry.computeVertexNormals();
		}

		// Super Mesh
		super(geometry, material);

		this._n = _n;
		this._radius = _radius;

		this.type = "Circle";
	}

	setVerticesColors(centerColor, borderColor, centerAlpha, borderAlpha) {
		var verticesColors = [];

		if (centerAlpha === undefined) {
			centerAlpha = 1;
		}

		if (borderAlpha === undefined) {
			borderAlpha = 1;
		}

		for (var i = 0; i < this._n; i++) {
			verticesColors.push(borderColor.r, borderColor.g, borderColor.b, borderAlpha)
		}

		verticesColors.push(centerColor.r, centerColor.g, centerColor.b, centerAlpha);

		this._geometry.vertColor = Float32Attribute(verticesColors, 4);
	}


	toJson() {
		var obj = super.toJson();

		// Add Circle parameters
		obj.n = this._n;
		obj.radius = this._radius;

		return obj;
	}

	static fromJson(data, geometry, material) {
		// Create mesh object
		var circle = new Circle(data.n, data.radius, material, geometry);

		// Import Object3D parameters
		circle = super.fromJson(data, undefined, undefined, circle);

		return circle;
	}

};