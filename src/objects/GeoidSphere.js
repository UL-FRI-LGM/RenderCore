import {Mesh} from './Mesh.js';
import {Float32Attribute, Uint32Attribute} from '../core/BufferAttribute.js';
import {Geometry} from './Geometry.js';
import {MeshPhongMaterial} from '../materials/MeshPhongMaterial.js';

export class GeoidSphere extends Mesh {
	constructor(radius, latitudeBands, longitudeBands, scale, color) {

		var geometry = new Geometry();
    var material = new MeshPhongMaterial();
    material.color = color;

    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];

    // calculate normals, texture coordinates and positions
    for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
      var theta = latNumber * Math.PI / latitudeBands;
      var sinTheta = Math.sin(theta);
      var cosTheta = Math.cos(theta);

      for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
        var phi = longNumber * 2 * Math.PI / longitudeBands;
        var sinPhi = Math.sin(phi);
        var cosPhi = Math.cos(phi);

        var x = cosPhi * sinTheta;
        var y = cosTheta;
        var z = sinPhi * sinTheta;
        var u = 1 - (longNumber / longitudeBands);
        var v = 1 - (latNumber / latitudeBands);

        normalData.push(x);
        normalData.push(y);
        normalData.push(z);
        textureCoordData.push(u);
        textureCoordData.push(v);
        vertexPositionData.push(radius * x);
        vertexPositionData.push(radius * y);
        vertexPositionData.push(radius * z);
      }
    }

    // calculate indices
    var indexData = [];
    for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
      for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
        var first = (latNumber * (longitudeBands + 1)) + longNumber;
        var second = first + longitudeBands + 1;
        indexData.push(first);
        indexData.push(second);
        indexData.push(first + 1);

        indexData.push(second);
        indexData.push(second + 1);
        indexData.push(first + 1);
      }
    }

    geometry.vertices = Float32Attribute(vertexPositionData,3);

    for (let i = 0; i < geometry.vertices.array.length; i++) {
      geometry.vertices.array[i] *= scale;
    }

    geometry.indices = Uint32Attribute(indexData,1);
    geometry.normals = Float32Attribute(normalData,3);
    geometry.computeVertexNormals();
    geometry.uv = Float32Attribute(textureCoordData,2);

    // Super RC.Mesh
    super(geometry, material);


		this.type = "GeoidSphere";
    }
};