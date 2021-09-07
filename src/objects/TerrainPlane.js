/**
 * Created by Aljaz on 18. 10. 2019.
 */

import {Mesh} from './Mesh.js';
import {Geometry} from './Geometry.js';

import {Float32Attribute, Uint32Attribute} from '../core/BufferAttribute.js';

export class TerrainPlane extends Mesh {
  constructor(width, height, widthSegment, heightSegment, material, geometry){
    if(geometry === undefined) {
      var geometry = new Geometry();

      let xStep = width / widthSegment;
      let yStep = height / heightSegment;

      let xTexStep = 1 / widthSegment;
      let yTexStep = 1 / heightSegment;

      let vert;
      let tempVertices = [];
      let tempTexCords = [];

      // Generate vertices
      for(let y = 0; y <= heightSegment; y++) {
        for(let x = 0; x <= widthSegment; x++) {
            tempVertices.push(...[x * xStep, 0, y * yStep]);
            tempTexCords.push(...[x * xTexStep, y * yTexStep]);
        }
      }

      geometry.vertices = Float32Attribute(tempVertices, 3);
      geometry.uv = Float32Attribute(tempTexCords, 2);


      let basePos = 0;
      let tempIndices = [];

      // Generate indices
      for(let y = 1; y <= heightSegment; y++) {
        for(let x = 0; x < widthSegment; x++) {

          tempIndices.push(basePos + (widthSegment + 1) + x,
                           basePos + x + 1,
                           basePos + x);

          tempIndices.push(basePos + (widthSegment + 1) + x,
                           basePos + (widthSegment + 1) + x + 1,
                           basePos + x + 1);
        }

        basePos += widthSegment + 1;
      }

      geometry.indices = Uint32Attribute(tempIndices, 1);
      geometry.computeVertexNormals();
    }

    // Super Mesh
    super(geometry, material);

    this._width = width;
    this._height = height;
    this._widthSegment = widthSegment;
    this._heightSegment = heightSegment;

    this.type = "Plane";
  }

  toJson() {
      var obj = super.toJson();

      // Add Plane parameters
      obj.width = this._width;
      obj.height = this._height;
      obj.widthSegment = this._widthSegment;
      obj.heightSegment = this._heightSegment;

      return obj;
  }

  static fromJson(data, geometry, material) {
      // Create mesh object
      var plane = new Plane(data.width, data.height, data.widthSegment,
                                  data.heightSegment, material, geometry);

      // Import Object3D parameters
      plane = super.fromJson(data, undefined, undefined, plane);

      return plane;
  }

  get width() { return this._width; }
  get height() { return this._height; }
  get widthSegment() { return this._widthSegment; }
  get heightSegment() { return this._heightSegment; }
};
