import {_Math} from '../math/Math.js';
import {BufferAttribute, Uint32Attribute, Float32Attribute} from '../core/BufferAttribute.js';
import { Geometry } from './Geometry.js';

export class SpriteGeometry extends Geometry {
	constructor(args = {}) {
		super();
		this.type = "SpriteGeometry";

		//ASSEMBLE GEOMETRY
		if(!args.baseGeometry.normals) args.baseGeometry.computeVertexNormals();

		this.vertices = SpriteGeometry._setupVertices(args.baseGeometry);
		this.indices = SpriteGeometry._setupIndices(args.baseGeometry);
		this.normals = SpriteGeometry._setupNormals(args.baseGeometry);
	}

	static _setupVertices(baseGeometry) {
        if(baseGeometry.indices){
            const vertices = baseGeometry.vertices;
            const indices = baseGeometry.indices;
            const spriteVertices = new Array(indices.count() * vertices.itemSize * 4);

            for(let i = 0; i < indices.count(); i++) {
                spriteVertices[i*12 +  0] = vertices.array[indices.array[i]*3 + 0];
                spriteVertices[i*12 +  1] = vertices.array[indices.array[i]*3 + 1];
                spriteVertices[i*12 +  2] = vertices.array[indices.array[i]*3 + 2];

                spriteVertices[i*12 +  3] = vertices.array[indices.array[i]*3 + 0];
                spriteVertices[i*12 +  4] = vertices.array[indices.array[i]*3 + 1];
                spriteVertices[i*12 +  5] = vertices.array[indices.array[i]*3 + 2];

                spriteVertices[i*12 +  6] = vertices.array[indices.array[i]*3 + 0];
                spriteVertices[i*12 +  7] = vertices.array[indices.array[i]*3 + 1];
                spriteVertices[i*12 +  8] = vertices.array[indices.array[i]*3 + 2];

                spriteVertices[i*12 +  9] = vertices.array[indices.array[i]*3 + 0];
                spriteVertices[i*12 + 10] = vertices.array[indices.array[i]*3 + 1];
                spriteVertices[i*12 + 11] = vertices.array[indices.array[i]*3 + 2];
            }

            return new Float32Attribute(spriteVertices, vertices.itemSize);
        }else{
            const vertices = baseGeometry.vertices;
            const spriteVertices = new Array(vertices.count() * vertices.itemSize * 4);

            for(let v = 0; v < vertices.count(); v++) {
                spriteVertices[v*12 +  0] = vertices.array[v*3 + 0];
                spriteVertices[v*12 +  1] = vertices.array[v*3 + 1];
                spriteVertices[v*12 +  2] = vertices.array[v*3 + 2];

                spriteVertices[v*12 +  3] = vertices.array[v*3 + 0];
                spriteVertices[v*12 +  4] = vertices.array[v*3 + 1];
                spriteVertices[v*12 +  5] = vertices.array[v*3 + 2];

                spriteVertices[v*12 +  6] = vertices.array[v*3 + 0];
                spriteVertices[v*12 +  7] = vertices.array[v*3 + 1];
                spriteVertices[v*12 +  8] = vertices.array[v*3 + 2];

                spriteVertices[v*12 +  9] = vertices.array[v*3 + 0];
                spriteVertices[v*12 + 10] = vertices.array[v*3 + 1];
                spriteVertices[v*12 + 11] = vertices.array[v*3 + 2];
            }

            return new Float32Attribute(spriteVertices, vertices.itemSize);
        }
    }
    static _setupIndices(baseGeometry) {

        if(baseGeometry.indices){
            const indices = baseGeometry.indices;
            const spriteIndices = new Array(indices.count() * 6);

            for(let i = 0; i < indices.count(); i++) {
                spriteIndices[i*6 + 0] = 2*(i*2 + 0) + 0;
                spriteIndices[i*6 + 1] = 2*(i*2 + 0) + 1;
                spriteIndices[i*6 + 2] = 2*(i*2 + 1) + 0;

                spriteIndices[i*6 + 3] = 2*(i*2 + 1) + 1;
                spriteIndices[i*6 + 4] = 2*(i*2 + 1) + 0;
                spriteIndices[i*6 + 5] = 2*(i*2 + 0) + 1;
            }

            return new Uint32Attribute(spriteIndices, 1);
        }else{
            const vertices = baseGeometry.vertices;
            const spriteIndices = new Array(vertices.count() * 6);

            for(let v = 0; v < vertices.count(); v++) {
                spriteIndices[v*6 + 0] = 2*(v*2 + 0) + 0;
                spriteIndices[v*6 + 1] = 2*(v*2 + 0) + 1;
                spriteIndices[v*6 + 2] = 2*(v*2 + 1) + 0;

                spriteIndices[v*6 + 3] = 2*(v*2 + 1) + 1;
                spriteIndices[v*6 + 4] = 2*(v*2 + 1) + 0;
                spriteIndices[v*6 + 5] = 2*(v*2 + 0) + 1;
            }

            return new Uint32Attribute(spriteIndices, 1);
        }
    }
    static _setupNormals(baseGeometry) {
        if(baseGeometry.indices){
            const indices = baseGeometry.indices;
            const normals = baseGeometry.normals;
            const spriteNormals = new Array(indices.count() * normals.itemSize * 4);

            for(let i = 0; i < indices.count(); i++) {
                spriteNormals[i*12 +  0] = normals.array[indices.array[i]*3 + 0];
                spriteNormals[i*12 +  1] = normals.array[indices.array[i]*3 + 1];
                spriteNormals[i*12 +  2] = normals.array[indices.array[i]*3 + 2];

                spriteNormals[i*12 +  3] = normals.array[indices.array[i]*3 + 0];
                spriteNormals[i*12 +  4] = normals.array[indices.array[i]*3 + 1];
                spriteNormals[i*12 +  5] = normals.array[indices.array[i]*3 + 2];

                spriteNormals[i*12 +  6] = normals.array[indices.array[i]*3 + 0];
                spriteNormals[i*12 +  7] = normals.array[indices.array[i]*3 + 1];
                spriteNormals[i*12 +  8] = normals.array[indices.array[i]*3 + 2];

                spriteNormals[i*12 +  9] = normals.array[indices.array[i]*3 + 0];
                spriteNormals[i*12 + 10] = normals.array[indices.array[i]*3 + 1];
                spriteNormals[i*12 + 11] = normals.array[indices.array[i]*3 + 2];
            }

            return new Float32Attribute(spriteNormals, indices.itemSize);
        }else{
            const vertices = baseGeometry.vertices;
            const normals = baseGeometry.normals;
            const spriteNormals = new Array(vertices.count() * normals.itemSize * 4);

            for(let v = 0; v < vertices.count(); v++) {
                spriteNormals[v*12 +  0] = normals.array[v*3 + 0];
                spriteNormals[v*12 +  1] = normals.array[v*3 + 1];
                spriteNormals[v*12 +  2] = normals.array[v*3 + 2];

                spriteNormals[v*12 +  3] = normals.array[v*3 + 0];
                spriteNormals[v*12 +  4] = normals.array[v*3 + 1];
                spriteNormals[v*12 +  5] = normals.array[v*3 + 2];

                spriteNormals[v*12 +  6] = normals.array[v*3 + 0];
                spriteNormals[v*12 +  7] = normals.array[v*3 + 1];
                spriteNormals[v*12 +  8] = normals.array[v*3 + 2];

                spriteNormals[v*12 +  9] = normals.array[v*3 + 0];
                spriteNormals[v*12 + 10] = normals.array[v*3 + 1];
                spriteNormals[v*12 + 11] = normals.array[v*3 + 2];
            }

            return new Float32Attribute(spriteNormals, normals.itemSize);
        }
    }

    static _setupCenters(baseGeometry){
        if(baseGeometry.indices){
            const vertices = baseGeometry.vertices;
            const indices = baseGeometry.indices;
            const spriteCenters = new Array(indices.count() * vertices.itemSize * 4);

            for(let i = 0; i < indices.count(); i++) {
                spriteCenters[i*12 +  0] = vertices.array[indices.array[i]*3 + 0];
                spriteCenters[i*12 +  1] = vertices.array[indices.array[i]*3 + 1];
                spriteCenters[i*12 +  2] = vertices.array[indices.array[i]*3 + 2];

                spriteCenters[i*12 +  3] = vertices.array[indices.array[i]*3 + 0];
                spriteCenters[i*12 +  4] = vertices.array[indices.array[i]*3 + 1];
                spriteCenters[i*12 +  5] = vertices.array[indices.array[i]*3 + 2];

                spriteCenters[i*12 +  6] = vertices.array[indices.array[i]*3 + 0];
                spriteCenters[i*12 +  7] = vertices.array[indices.array[i]*3 + 1];
                spriteCenters[i*12 +  8] = vertices.array[indices.array[i]*3 + 2];

                spriteCenters[i*12 +  9] = vertices.array[indices.array[i]*3 + 0];
                spriteCenters[i*12 + 10] = vertices.array[indices.array[i]*3 + 1];
                spriteCenters[i*12 + 11] = vertices.array[indices.array[i]*3 + 2];
            }

            return new Float32Attribute(spriteCenters, vertices.itemSize);
        }else{
            const vertices = baseGeometry.vertices;
            const spriteCenters = new Array(vertices.count() * vertices.itemSize * 4);

            for(let v = 0; v < vertices.count(); v++) {
                spriteCenters[v*12 +  0] = vertices.array[v*3 + 0];
                spriteCenters[v*12 +  1] = vertices.array[v*3 + 1];
                spriteCenters[v*12 +  2] = vertices.array[v*3 + 2];

                spriteCenters[v*12 +  3] = vertices.array[v*3 + 0];
                spriteCenters[v*12 +  4] = vertices.array[v*3 + 1];
                spriteCenters[v*12 +  5] = vertices.array[v*3 + 2];

                spriteCenters[v*12 +  6] = vertices.array[v*3 + 0];
                spriteCenters[v*12 +  7] = vertices.array[v*3 + 1];
                spriteCenters[v*12 +  8] = vertices.array[v*3 + 2];

                spriteCenters[v*12 +  9] = vertices.array[v*3 + 0];
                spriteCenters[v*12 + 10] = vertices.array[v*3 + 1];
                spriteCenters[v*12 + 11] = vertices.array[v*3 + 2];
            }

            return new Float32Attribute(spriteCenters, vertices.itemSize);
        }
    }
}