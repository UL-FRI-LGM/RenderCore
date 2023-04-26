/**
 * Based on ZSprite by Matevz.
 *
 */

import {Mesh} from './Mesh.js';
import {Quad} from './Quad.js';
import {ZShapeBasicMaterial} from '../materials/ZShapeBasicMaterial.js';
import {Vector2} from '../RenderCore.js';
import {Geometry} from './Geometry.js';
import {Float32Attribute, Uint32Attribute} from '../core/BufferAttribute.js';


export class ZShape extends Mesh {
    constructor(geometry = null, material = null) {
        if (geometry === null) {
            /*
            let xy0 = new Vector2(-0.5, 0.5);
            let xy1 = new Vector2(0.5, -0.5);
            geometry = Quad.makeGeometry(xy0, xy1, false, true, false, false);
            */
           geometry = ZShape.makeCubeGeometry();
           console.log("zshape cube geometry ", geometry);
           this._geometry = geometry;
        }

        if (material === null) {
            material = new ZShapeBasicMaterial();
        }
        // MT for Sebastien -- what would be the best way to clone material?
        // ZShapeBasicMaterial.clone_for_outline() seems OK (but one needs to 
        // take care with uniform / texture / instanceData updates).
        let pmat = material.clone_for_picking();
        let omat = material.clone_for_outline();

        //SUPER
        super(geometry, material, pmat, omat);
        this.type = "ZShape";
    }

    static makeCubeGeometry() {
        let cube = new Geometry();
		cube.vertices = Float32Attribute([
			// Front face
			-1.0, -1.0,  1.0,
			1.0, -1.0,  1.0,
			1.0,  1.0,  1.0,
			-1.0,  1.0,  1.0,

			// Back face
			-1.0, -1.0, -1.0,
			-1.0,  1.0, -1.0,
			1.0,  1.0, -1.0,
			1.0, -1.0, -1.0,

			// Top face
			-1.0,  1.0, -1.0,
			-1.0,  1.0,  1.0,
			1.0,  1.0,  1.0,
			1.0,  1.0, -1.0,

			// Bottom face
			-1.0, -1.0, -1.0,
			1.0, -1.0, -1.0,
			1.0, -1.0,  1.0,
			-1.0, -1.0,  1.0,

			// Right face
			1.0, -1.0, -1.0,
			1.0,  1.0, -1.0,
			1.0,  1.0,  1.0,
			1.0, -1.0,  1.0,

			// Left face
			-1.0, -1.0, -1.0,
			-1.0, -1.0,  1.0,
			-1.0,  1.0,  1.0,
			-1.0,  1.0, -1.0
		], 3);


		cube.indices = Uint32Attribute([
			0, 1, 2,      0, 2, 3,    // Front face
			4, 5, 6,      4, 6, 7,    // Back face
			8, 9, 10,     8, 10, 11,  // Top face
			12, 13, 14,   12, 14, 15, // Bottom face
			16, 17, 18,   16, 18, 19, // Right face
			20, 21, 22,   20, 22, 23  // Left face
        ], 1);
        cube.computeVertexNormals();
        
        //per face UVs
        cube.uv = Float32Attribute([
            // Front face
            0.0,  0.0,
            1.0,  0.0,
            1.0,  1.0,
            0.0,  1.0,
            
            // Back face
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,
            
            // Top face
            0.0,  0.0,
            0.0,  1.0,
            1.0,  1.0,
            1.0,  0.0,
            
            // Bottom face
            0.0, 1.0,
            1.0, 1.0,
            1.0, 0.0,
            0.0, 0.0,
            
            // Right face
            0.0, 0.0,
            0.0, 1.0,
            1.0, 1.0,
            1.0, 0.0,
            
            // Left face
            1.0, 0.0,
            0.0, 0.0,
            0.0, 1.0,
            1.0, 1.0,
        ], 2);

        cube.type = "Cube";
        return cube;
    }

    static makeHexagonGeometry() {
        let vBuff = new Float32Array((7 * 2 + 6 * 4 )* 3);
        let stepAngle = Math.PI / 3;
        let R = 1;
        // bottom vertex
        vBuff[0] = vBuff[1] = vBuff[2] = 0;
        // circle vertices
        let off = 3;
        for (let j = 0; j < 6; ++j) {
            let angle = j * stepAngle;
            let x = R * Math.cos(angle);
            let y = R * Math.sin(angle);
            let z = 0;
            vBuff[off] = x;
            vBuff[off + 1] = y;
            vBuff[off + 2] = z;
            off += 3;
        }
        // z depth vertices
        let hexHeight = 1;
        let ro = 0;
        for (let j = 0; j < 7; ++j) {
            vBuff[ro + 21] = vBuff[ro];
            vBuff[ro + 22] = vBuff[ro + 1];
            vBuff[ro + 23] = vBuff[ro + 2] + hexHeight;
            ro += 3;
        }
        
        // side vertices
        off = 7*2*3;
        for (let j = 0; j < 6; ++j) {
            let angle = j * stepAngle;
            let x = R * Math.cos(angle);
            let y = R * Math.sin(angle);

            vBuff[off    ] = x;
            vBuff[off + 1] = y;
            vBuff[off + 2] = 0;

            vBuff[off + 3] = x;
            vBuff[off + 4] = y;
            vBuff[off + 5] = hexHeight;

            let x2 = R * Math.cos(angle+ stepAngle);
            let y2 = R * Math.sin(angle+ stepAngle);

            vBuff[off + 6] = x2;
            vBuff[off + 7] = y2;
            vBuff[off + 8] = hexHeight;

            vBuff[off + 9] = x2;
            vBuff[off + 10] = y2;
            vBuff[off + 11] = 0;

            off += 12;
        }

        let idxBuffSize = 6*3*2+ 6*6;
        let idxBuff = new Uint32Array(idxBuffSize);
        let protoIdcs = [0,1,2, 0,2,3, 0,3,4, 0,4,5, 0,5,6, 0,6,1];
        let b = 0;

        // top
        for (let c = 0; c < protoIdcs.length; c++) {
            idxBuff[b++] = protoIdcs[c];
        
        }
        // bottom
        for (let c = 0; c < protoIdcs.length; c++) {
            idxBuff[b++] = protoIdcs[c] + 7;
        }

        //  sides
        let protoSide = [0,1,2,2,3,0];

        for (let side = 0; side < 6; ++side) {
            for (let c = 0; c < protoSide.length; c++) {
                idxBuff[b++] = 14 + side*4 + protoSide[c];
            }
        }

        let hex = new Geometry();
		hex.vertices = Float32Attribute(vBuff,3);
		hex.indices = Uint32Attribute(idxBuff,1);
        hex.computeVertexNormals();

        hex.type = "Hexagon";
        return hex;
    }

    // Tesselate cone. Note: main cone axis are aligned with z axis
    static makeConeGeometry(drawCap) {
        //
        // vertices
        //
        let nStep = 36;
        let vBuff = new Float32Array((nStep * 2 + 2) * 3);

        // apex cone at the center
        vBuff[0] = vBuff[1] = vBuff[2] = 0;

        // plate vertices
        let stepAngle = 2 * Math.PI / nStep;
        let H = 1.0;
        let R = 1.0;
        let off = 3;
        for (let i = 0; i < nStep; ++i) {
            let angle = i * stepAngle;
            let x = R * Math.cos(angle);
            let y = R * Math.sin(angle);

            vBuff[off    ] = x;
            vBuff[off + 1] = y;
            vBuff[off + 2] = H;

            off += 3;
        }

        // plate center
        vBuff[off    ] = 0;
        vBuff[off + 1] = 0;
        vBuff[off + 2] = H;

        off += 3;
        // duplicate vertices
        for (let i = 0; i < nStep; ++i) {
            let angle = i * stepAngle;
            let x = R * Math.cos(angle);
            let y = R * Math.sin(angle);

            vBuff[off    ] = x;
            vBuff[off + 1] = y;
            vBuff[off + 2] = H;

            off += 3;
        }

        //
        // indices
        //
        let idxBuffSize = nStep * 3;
        if (drawCap)
           idxBuffSize *= 2;
        let lastCIdx = nStep * 3 - 1;
        let idxBuff = new Uint32Array(idxBuffSize);
        // make polygon for each angle step
        let b  = 0;
        for (let i = 0; i < nStep; ++i) {
            idxBuff[b++] = 0;
            idxBuff[b++] = i + 1;
            if (b == lastCIdx)
                idxBuff[b++] = 1
            else
                idxBuff[b++] = i + 2;
        }

        if (drawCap) {
            let lvx = nStep + 1;
            for (let i = 0; i < nStep; ++i) {
                idxBuff[b++] = lvx;
                idxBuff[b++] = lvx + i + 1;
                if (b == (idxBuffSize - 1))
                    idxBuff[b++] = lvx + 1
                else
                    idxBuff[b++] = lvx + i + 2;

            }
        }

        console.log("Idx budd ", idxBuff);
        //
        // Geometry
        //
        let cone = new Geometry();
        cone.vertices = Float32Attribute(vBuff,3);
        cone.indices = Uint32Attribute(idxBuff,1);
        cone.computeVertexNormals();

        cone.type = "Cone";
        return cone;
    }
}
