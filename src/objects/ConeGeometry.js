import {_Math} from '../math/Math.js';
import {BufferAttribute, Uint32Attribute, Float32Attribute} from '../core/BufferAttribute.js';
import { Geometry } from './Geometry.js';

export class ConeGeometry extends Geometry {
	constructor(args = {}) {
		super();
		this.type = "ConeGeometry";

        this._radius = args.radius !== undefined ? args.radius : 1.0;
        this._height = args.height !== undefined ? args.height : 1.0;
        this._nSegments = args.nSegments !== undefined ? args.nSegments : 8;
        this._indexed = args.indexed !== undefined ? args.indexed : true;

		//ASSEMBLE GEOMETRY
		this.vertices = ConeGeometry._setupVertices(this._radius, this._height, this._nSegments, this._indexed);
		this.indices = ConeGeometry._setupIndices(this._radius, this._height, this._nSegments, this._indexed);
		// this.normals = SpriteGeometry._setupNormals(args.baseGeometry);
        this.computeVertexNormals();
	}

	static _setupVertices(radius, height, nSegments, indexed) {
      
        if(indexed){
            const vertices = new Array((2 + nSegments)*3);

            vertices[0] = 0.0;
            vertices[1] = 0.0;
            vertices[2] = 0.0;

            vertices[3] = 0.0;
            vertices[4] = height;
            vertices[5] = 0.0;

            for(let v = 0; v < nSegments; v++) {
                const phi = 2*Math.PI * (v + 0)/nSegments;

                const x = radius * Math.cos(phi);
                const z = radius * Math.sin(phi);


                vertices[(v + 2)*3 +  0] = x;
                vertices[(v + 2)*3 +  1] = 0.0;
                vertices[(v + 2)*3 +  2] = z;
            }

            return new Float32Attribute(vertices, 3);
        }else{
            const vertices = new Array(nSegments*3 * 3 * 2);

            for(let v = 0; v < nSegments; v++) {
                const phi1 = 2*Math.PI * (v + 0)/nSegments;
                const phi2 = 2*Math.PI * (v + 1)/nSegments;

                const x1 = radius * Math.cos(phi1);
                const z1 = radius * Math.sin(phi1);
                const x2 = radius * Math.cos(phi2);
                const z2 = radius * Math.sin(phi2);


                vertices[v*18 +  0] = x1;
                vertices[v*18 +  1] = 0.0;
                vertices[v*18 +  2] = z1;

                vertices[v*18 +  3] = x2;
                vertices[v*18 +  4] = 0.0;
                vertices[v*18 +  5] = z2;

                vertices[v*18 +  6] = 0.0;
                vertices[v*18 +  7] = 0.0;
                vertices[v*18 +  8] = 0.0;


                vertices[v*18 +  9] = x2;
                vertices[v*18 + 10] = 0.0;
                vertices[v*18 + 11] = z2;

                vertices[v*18 + 12] = x1;
                vertices[v*18 + 13] = 0.0;
                vertices[v*18 + 14] = z1;

                vertices[v*18 + 15] = 0.0;
                vertices[v*18 + 16] = height;
                vertices[v*18 + 17] = 0.0;
            }

            return new Float32Attribute(vertices, 3);
        }
    }
    static _setupIndices(radius, height, nSegments, indexed) {

        if(indexed){
            const indices = new Array(nSegments*3 * 2);

            for(let v = 0; v < nSegments-1; v++) {
                indices[v*6 + 0] = v + 2;
                indices[v*6 + 1] = v + 3;
                indices[v*6 + 2] = 0;

                indices[v*6 + 3] = v + 3;
                indices[v*6 + 4] = v + 2;
                indices[v*6 + 5] = 1;
            }
            indices[(nSegments-1)*6 + 0] = nSegments + 1;
            indices[(nSegments-1)*6 + 1] = 2;
            indices[(nSegments-1)*6 + 2] = 0;

            indices[(nSegments-1)*6 + 3] = 2;
            indices[(nSegments-1)*6 + 4] = nSegments + 1;
            indices[(nSegments-1)*6 + 5] = 1;

            console.error(new Uint32Attribute(indices, 1));
            return new Uint32Attribute(indices, 1);
        }else{
            return null;
        }
    }

}