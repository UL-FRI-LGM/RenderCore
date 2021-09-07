import {Mesh} from './Mesh.js';
import {Float32Attribute, Uint32Attribute} from '../core/BufferAttribute.js';
import {Geometry} from './Geometry.js';

import {MeshBasicMaterial} from '../materials/MeshBasicMaterial.js';

const PI = Math.PI;
const H_ANGLE = PI / 180 * 72;    // 72 degree = 360 / 5
const V_ANGLE = Math.atan(0.5);   // elevation = 26.565 degree

export class IcoSphere extends Mesh {
	constructor(radius, subdivision, scale, color, clockwise) {

        var geometry = new Geometry();
        var material = new MeshBasicMaterial();
        material.color = color;

        var vertexPositionData = []; // array of 12 vertices (x,y,z)
        var normalData = [];
        var textureCoordData = [];

        var z, xy;                            // coords
        var hAngle1 = -PI / 2 - H_ANGLE / 2;  // start from -126 deg at 1st row
        var hAngle2 = -PI / 2;                // start from -90 deg at 2nd row

        //var S_STEP = 186 / 2048;     // horizontal texture step
        //var T_STEP = 322 / 1024;     // vertical texture step

        var S_STEP = 1/11;
        var T_STEP = 1/3;

        // temp vertex arrays
        var vertexFirstRow = [];
        var vertexSecondRow = [];

        //  00  01  02  03  04          //
        //  /\  /\  /\  /\  /\          //
        // /  \/  \/  \/  \/  \         //
        //10--14--15--16--17--11        //
        // \  /\  /\  /\  /\  /\        //
        //  \/  \/  \/  \/  \/  \       //
        //  12--18--19--20--21--13      //
        //   \  /\  /\  /\  /\  /       //
        //    \/  \/  \/  \/  \/        //
        //    05  06  07  08  09        //


        // Top Upper Vertex at (0, 0, r)
        vertexFirstRow.push(0); vertexFirstRow.push(0); vertexFirstRow.push(radius);


        // compute 10 vertices at 1st and 2nd rows
        for(var i = 1; i <= 5; ++i)
        {
            z  = radius * Math.sin(V_ANGLE);            // elevaton
            xy = radius * Math.cos(V_ANGLE);            // length on XY plane

            vertexFirstRow.push(xy * Math.cos(hAngle1));      // x
            vertexFirstRow.push(xy * Math.sin(hAngle1));      // y
            vertexFirstRow.push(z);                           // z

            vertexSecondRow.push(xy * Math.cos(hAngle2)); // x
            vertexSecondRow.push(xy * Math.sin(hAngle2)); // y
            vertexSecondRow.push(-z);                     // z

            // next horizontal angles
            hAngle1 += H_ANGLE;
            hAngle2 += H_ANGLE;
        }

        // Bottom Lower Vertex at (0, 0, -r)
        vertexSecondRow.push(0); vertexSecondRow.push(0); vertexSecondRow.push(-radius);

        // concat both vertex arrays
        var tempVertexPositionData = vertexFirstRow.concat(vertexSecondRow);

        var vertexPositionData = [];

        // add 14 non-shared vertices first (index from 0 to 13)
        // v0 (top)
        vertexPositionData.push(tempVertexPositionData[0]);vertexPositionData.push(tempVertexPositionData[1]);vertexPositionData.push(tempVertexPositionData[2]);
        normalData.push(0);normalData.push(0);normalData.push(1);
        textureCoordData.push(S_STEP);textureCoordData.push(0);

        // v1
        vertexPositionData.push(tempVertexPositionData[0]);vertexPositionData.push(tempVertexPositionData[1]);vertexPositionData.push(tempVertexPositionData[2]);
        normalData.push(0);normalData.push(0);normalData.push(1);
        textureCoordData.push(S_STEP * 3);textureCoordData.push(0);

        // v2
        vertexPositionData.push(tempVertexPositionData[0]);vertexPositionData.push(tempVertexPositionData[1]);vertexPositionData.push(tempVertexPositionData[2]);
        normalData.push(0);normalData.push(0);normalData.push(1);
        textureCoordData.push(S_STEP * 5);textureCoordData.push(0);

        // v3
        vertexPositionData.push(tempVertexPositionData[0]);vertexPositionData.push(tempVertexPositionData[1]);vertexPositionData.push(tempVertexPositionData[2]);
        normalData.push(0);normalData.push(0);normalData.push(1);
        textureCoordData.push(S_STEP * 7);textureCoordData.push(0);

        // v4
        vertexPositionData.push(tempVertexPositionData[0]);vertexPositionData.push(tempVertexPositionData[1]);vertexPositionData.push(tempVertexPositionData[2]);
        normalData.push(0);normalData.push(0);normalData.push(1);
        textureCoordData.push(S_STEP * 9);textureCoordData.push(0);

        // v5 (bottom)
        vertexPositionData.push(tempVertexPositionData[33]);vertexPositionData.push(tempVertexPositionData[34]);vertexPositionData.push(tempVertexPositionData[35]);
        normalData.push(0);normalData.push(0);normalData.push(-1);
        textureCoordData.push(S_STEP * 2);textureCoordData.push(T_STEP * 3);

        // v6
        vertexPositionData.push(tempVertexPositionData[33]);vertexPositionData.push(tempVertexPositionData[34]);vertexPositionData.push(tempVertexPositionData[35]);
        normalData.push(0);normalData.push(0);normalData.push(-1);
        textureCoordData.push(S_STEP * 4);textureCoordData.push(T_STEP * 3);

        // v7
        vertexPositionData.push(tempVertexPositionData[33]);vertexPositionData.push(tempVertexPositionData[34]);vertexPositionData.push(tempVertexPositionData[35]);
        normalData.push(0);normalData.push(0);normalData.push(-1);
        textureCoordData.push(S_STEP * 6);textureCoordData.push(T_STEP * 3);

        // v8
        vertexPositionData.push(tempVertexPositionData[33]);vertexPositionData.push(tempVertexPositionData[34]);vertexPositionData.push(tempVertexPositionData[35]);
        normalData.push(0);normalData.push(0);normalData.push(-1);
        textureCoordData.push(S_STEP * 8);textureCoordData.push(T_STEP * 3);

        // v9
        vertexPositionData.push(tempVertexPositionData[33]);vertexPositionData.push(tempVertexPositionData[34]);vertexPositionData.push(tempVertexPositionData[35]);
        normalData.push(0);normalData.push(0);normalData.push(-1);
        textureCoordData.push(S_STEP * 10);textureCoordData.push(T_STEP * 3);

        // v10 (left)
        var tempVertexNormal = computeVertexNormal(tempVertexPositionData[3], tempVertexPositionData[4], tempVertexPositionData[5]);
        vertexPositionData.push(tempVertexPositionData[3]);vertexPositionData.push(tempVertexPositionData[4]);vertexPositionData.push(tempVertexPositionData[5]);
        normalData.push(tempVertexNormal[0]);normalData.push(tempVertexNormal[1]);normalData.push(tempVertexNormal[2]);
        textureCoordData.push(0);textureCoordData.push(T_STEP);

        // v11 (right)
        vertexPositionData.push(tempVertexPositionData[3]);vertexPositionData.push(tempVertexPositionData[4]);vertexPositionData.push(tempVertexPositionData[5]);
        normalData.push(tempVertexNormal[0]);normalData.push(tempVertexNormal[1]);normalData.push(tempVertexNormal[2]);
        textureCoordData.push(S_STEP * 10);textureCoordData.push(T_STEP);
        tempVertexNormal = [];

        // v12 (left)
        tempVertexNormal = computeVertexNormal(tempVertexPositionData[18], tempVertexPositionData[19], tempVertexPositionData[20]);
        vertexPositionData.push(tempVertexPositionData[18]);vertexPositionData.push(tempVertexPositionData[19]);vertexPositionData.push(tempVertexPositionData[20]);
        normalData.push(tempVertexNormal[0]);normalData.push(tempVertexNormal[1]);normalData.push(tempVertexNormal[2]);
        textureCoordData.push(S_STEP);textureCoordData.push(T_STEP * 2);

        // v13 (right)
        vertexPositionData.push(tempVertexPositionData[18]);vertexPositionData.push(tempVertexPositionData[19]);vertexPositionData.push(tempVertexPositionData[20]);
        normalData.push(tempVertexNormal[0]);normalData.push(tempVertexNormal[1]);normalData.push(tempVertexNormal[2]);
        textureCoordData.push(S_STEP * 11);textureCoordData.push(T_STEP * 2);
        tempVertexNormal = [];

        // add 8 shared vertices to array (index from 14 to 21)
        // v14 (shared)
        tempVertexNormal = computeVertexNormal(tempVertexPositionData[6], tempVertexPositionData[7], tempVertexPositionData[8]);
        vertexPositionData.push(tempVertexPositionData[6]);vertexPositionData.push(tempVertexPositionData[7]);vertexPositionData.push(tempVertexPositionData[8]);
        normalData.push(tempVertexNormal[0]);normalData.push(tempVertexNormal[1]);normalData.push(tempVertexNormal[2]);
        textureCoordData.push(S_STEP * 2);textureCoordData.push(T_STEP);
        tempVertexNormal = [];

        // v15 (shared)
        tempVertexNormal = computeVertexNormal(tempVertexPositionData[9], tempVertexPositionData[10], tempVertexPositionData[11]);
        vertexPositionData.push(tempVertexPositionData[9]);vertexPositionData.push(tempVertexPositionData[10]);vertexPositionData.push(tempVertexPositionData[11]);
        normalData.push(tempVertexNormal[0]);normalData.push(tempVertexNormal[1]);normalData.push(tempVertexNormal[2]);
        textureCoordData.push(S_STEP * 4);textureCoordData.push(T_STEP);
        tempVertexNormal = [];

        // v16 (shared)
        tempVertexNormal = computeVertexNormal(tempVertexPositionData[12], tempVertexPositionData[13], tempVertexPositionData[14]);
        vertexPositionData.push(tempVertexPositionData[12]);vertexPositionData.push(tempVertexPositionData[13]);vertexPositionData.push(tempVertexPositionData[14]);
        normalData.push(tempVertexNormal[0]);normalData.push(tempVertexNormal[1]);normalData.push(tempVertexNormal[2]);
        textureCoordData.push(S_STEP * 6);textureCoordData.push(T_STEP);
        tempVertexNormal = [];

        // v17 (shared)
        tempVertexNormal = computeVertexNormal(tempVertexPositionData[15], tempVertexPositionData[16], tempVertexPositionData[17]);
        vertexPositionData.push(tempVertexPositionData[15]);vertexPositionData.push(tempVertexPositionData[16]);vertexPositionData.push(tempVertexPositionData[17]);
        normalData.push(tempVertexNormal[0]);normalData.push(tempVertexNormal[1]);normalData.push(tempVertexNormal[2]);
        textureCoordData.push(S_STEP * 8);textureCoordData.push(T_STEP);
        tempVertexNormal = [];

        // v18 (shared)
        tempVertexNormal = computeVertexNormal(tempVertexPositionData[21], tempVertexPositionData[22], tempVertexPositionData[23]);
        vertexPositionData.push(tempVertexPositionData[21]);vertexPositionData.push(tempVertexPositionData[22]);vertexPositionData.push(tempVertexPositionData[23]);
        normalData.push(tempVertexNormal[0]);normalData.push(tempVertexNormal[1]);normalData.push(tempVertexNormal[2]);
        textureCoordData.push(S_STEP * 3);textureCoordData.push(T_STEP * 2);
        tempVertexNormal = [];

        // v19 (shared)
        tempVertexNormal = computeVertexNormal(tempVertexPositionData[24], tempVertexPositionData[25], tempVertexPositionData[26]);
        vertexPositionData.push(tempVertexPositionData[24]);vertexPositionData.push(tempVertexPositionData[25]);vertexPositionData.push(tempVertexPositionData[26]);
        normalData.push(tempVertexNormal[0]);normalData.push(tempVertexNormal[1]);normalData.push(tempVertexNormal[2]);
        textureCoordData.push(S_STEP * 5);textureCoordData.push(T_STEP * 2);
        tempVertexNormal = [];

        // v20 (shared)
        tempVertexNormal = computeVertexNormal(tempVertexPositionData[27], tempVertexPositionData[28], tempVertexPositionData[29]);
        vertexPositionData.push(tempVertexPositionData[27]);vertexPositionData.push(tempVertexPositionData[28]);vertexPositionData.push(tempVertexPositionData[29]);
        normalData.push(tempVertexNormal[0]);normalData.push(tempVertexNormal[1]);normalData.push(tempVertexNormal[2]);
        textureCoordData.push(S_STEP * 7);textureCoordData.push(T_STEP * 2);
        tempVertexNormal = [];

        // v21 (shared)
        tempVertexNormal = computeVertexNormal(tempVertexPositionData[30], tempVertexPositionData[31], tempVertexPositionData[32]);
        vertexPositionData.push(tempVertexPositionData[30]);vertexPositionData.push(tempVertexPositionData[31]);vertexPositionData.push(tempVertexPositionData[32]);
        normalData.push(tempVertexNormal[0]);normalData.push(tempVertexNormal[1]);normalData.push(tempVertexNormal[2]);
        textureCoordData.push(S_STEP * 9);textureCoordData.push(T_STEP * 2);
        tempVertexNormal = [];

        // indices for icosahedron (20 triangles)
        var indexData = [];

        if (clockwise){ //navzven
            // 1st row (5 tris)
            indexData.push(0);indexData.push(10);indexData.push(14);
            indexData.push(1);indexData.push(14);indexData.push(15);
            indexData.push(2);indexData.push(15);indexData.push(16);
            indexData.push(3);indexData.push(16);indexData.push(17);
            indexData.push(4);indexData.push(17);indexData.push(11);

            // 2nd row (10 tris)
            indexData.push(10);indexData.push(12);indexData.push(14);
            indexData.push(12);indexData.push(18);indexData.push(14);
            indexData.push(14);indexData.push(18);indexData.push(15);
            indexData.push(18);indexData.push(19);indexData.push(15);
            indexData.push(15);indexData.push(19);indexData.push(16);
            indexData.push(19);indexData.push(20);indexData.push(16);
            indexData.push(16);indexData.push(20);indexData.push(17);
            indexData.push(20);indexData.push(21);indexData.push(17);
            indexData.push(17);indexData.push(21);indexData.push(11);
            indexData.push(21);indexData.push(13);indexData.push(11);

            // 3rd row (5 tris)
            indexData.push(5);indexData.push(18);indexData.push(12);
            indexData.push(6);indexData.push(19);indexData.push(18);
            indexData.push(7);indexData.push(20);indexData.push(19);
            indexData.push(8);indexData.push(21);indexData.push(20);
            indexData.push(9);indexData.push(13);indexData.push(21);
        } else { //
            // 1st row (5 tris)
            indexData.push(0);indexData.push(14);indexData.push(10);
            indexData.push(1);indexData.push(15);indexData.push(14);
            indexData.push(2);indexData.push(16);indexData.push(15);
            indexData.push(3);indexData.push(17);indexData.push(16);
            indexData.push(4);indexData.push(11);indexData.push(17);

            // 2nd row (10 tris)
            indexData.push(10);indexData.push(14);indexData.push(12);
            indexData.push(12);indexData.push(14);indexData.push(18);
            indexData.push(14);indexData.push(15);indexData.push(18);
            indexData.push(18);indexData.push(15);indexData.push(19);
            indexData.push(15);indexData.push(16);indexData.push(19);
            indexData.push(19);indexData.push(16);indexData.push(20);
            indexData.push(16);indexData.push(17);indexData.push(20);
            indexData.push(20);indexData.push(17);indexData.push(21);
            indexData.push(17);indexData.push(11);indexData.push(21);
            indexData.push(21);indexData.push(11);indexData.push(13);

            // 3rd row (5 tris)
            indexData.push(5);indexData.push(12);indexData.push(18);
            indexData.push(6);indexData.push(18);indexData.push(19);
            indexData.push(7);indexData.push(19);indexData.push(20);
            indexData.push(8);indexData.push(20);indexData.push(21);
            indexData.push(9);indexData.push(21);indexData.push(13);
        }

    // iterate all subdivision levels
        for(var i = 1; i < subdivision; ++i) {
            // copy prev vertex/index arrays and clear
            var tmpVertices = vertexPositionData.slice();
            var tmpIndices = indexData.slice();
            vertexPositionData = [];
            indexData = [];

            var tempTextureCoordData = textureCoordData.slice();
            var tempNormalData = normalData.slice();
            textureCoordData = [];
            normalData = [];

            var index = 0;

            // perform subdivision for each triangle
            for(var j = 0; j < tmpIndices.length; j += 3) {
                // get 3 textureCoordinates of a triangle
                var t1 = [tempTextureCoordData[tmpIndices[j] * 2], tempTextureCoordData[tmpIndices[j] * 2 + 1]];
                var t2 = [tempTextureCoordData[tmpIndices[j+1] * 2], tempTextureCoordData[tmpIndices[j+1] * 2 + 1]];
                var t3 = [tempTextureCoordData[tmpIndices[j+2] * 2], tempTextureCoordData[tmpIndices[j+2] * 2 + 1]];

                // get 3 vertices of a triangle
                var v1 = [tmpVertices[tmpIndices[j] * 3], tmpVertices[tmpIndices[j] * 3 + 1], tmpVertices[tmpIndices[j] * 3 + 2]];
                var v2 = [tmpVertices[tmpIndices[j+1] * 3], tmpVertices[tmpIndices[j+1] * 3 + 1], tmpVertices[tmpIndices[j+1] * 3 + 2]];
                var v3 = [tmpVertices[tmpIndices[j+2] * 3], tmpVertices[tmpIndices[j+2] * 3 + 1], tmpVertices[tmpIndices[j+2] * 3 + 2]];

                // compute 3 new vertices by spliting half on each edge
                //         v1
                //        / \
                // newV1 *---* newV3
                //      / \ / \
                //    v2---*---v3
                //       newV2
                var newV1 = computeHalfVertex(v1, v2, radius);
                var newV2 = computeHalfVertex(v2, v3, radius);
                var newV3 = computeHalfVertex(v1, v3, radius);

                // compute 3 new texture coordinates
                var newT1 = computeHalfTexCoord(t1[0], t1[1], t2[0], t2[1]);
                var newT2 = computeHalfTexCoord(t2[0], t2[1], t3[0], t3[1]);
                var newT3 = computeHalfTexCoord(t1[0], t1[1], t3[0], t3[1]);

                // add 4 new triangles to vertex/texture/normals array
                // 1st triangle
                vertexPositionData.push(v1[0]);vertexPositionData.push(v1[1]);vertexPositionData.push(v1[2]);
                vertexPositionData.push(newV1[0]);vertexPositionData.push(newV1[1]);vertexPositionData.push(newV1[2]);
                vertexPositionData.push(newV3[0]);vertexPositionData.push(newV3[1]);vertexPositionData.push(newV3[2]);

                textureCoordData.push(t1[0]); textureCoordData.push(t1[1]);
                textureCoordData.push(newT1[0]); textureCoordData.push(newT1[1]);
                textureCoordData.push(newT3[0]); textureCoordData.push(newT3[1]);

                var normal = computeFaceNormal(v1, newV1, newV3);
                normalData.push(normal[0]); normalData.push(normal[1]); normalData.push(normal[2]);
                normalData.push(normal[0]); normalData.push(normal[1]); normalData.push(normal[2]);
                normalData.push(normal[0]); normalData.push(normal[1]); normalData.push(normal[2]);

                // 2nd triangle
                vertexPositionData.push(newV1[0]);vertexPositionData.push(newV1[1]);vertexPositionData.push(newV1[2]);
                vertexPositionData.push(v2[0]);vertexPositionData.push(v2[1]);vertexPositionData.push(v2[2]);
                vertexPositionData.push(newV2[0]);vertexPositionData.push(newV2[1]);vertexPositionData.push(newV2[2]);

                textureCoordData.push(newT1[0]); textureCoordData.push(newT1[1]);
                textureCoordData.push(t2[0]); textureCoordData.push(t2[1]);
                textureCoordData.push(newT2[0]); textureCoordData.push(newT2[1]);

                normal = computeFaceNormal(newV1, v2, newV2);
                normalData.push(normal[0]); normalData.push(normal[1]); normalData.push(normal[2]);
                normalData.push(normal[0]); normalData.push(normal[1]); normalData.push(normal[2]);
                normalData.push(normal[0]); normalData.push(normal[1]); normalData.push(normal[2]);

                // 3rd triangle
                vertexPositionData.push(newV1[0]);vertexPositionData.push(newV1[1]);vertexPositionData.push(newV1[2]);
                vertexPositionData.push(newV2[0]);vertexPositionData.push(newV2[1]);vertexPositionData.push(newV2[2]);
                vertexPositionData.push(newV3[0]);vertexPositionData.push(newV3[1]);vertexPositionData.push(newV3[2]);

                textureCoordData.push(newT1[0]); textureCoordData.push(newT1[1]);
                textureCoordData.push(newT2[0]); textureCoordData.push(newT2[1]);
                textureCoordData.push(newT3[0]); textureCoordData.push(newT3[1]);

                normal = computeFaceNormal(newV1, newV2, newV3);
                normalData.push(normal[0]); normalData.push(normal[1]); normalData.push(normal[2]);
                normalData.push(normal[0]); normalData.push(normal[1]); normalData.push(normal[2]);
                normalData.push(normal[0]); normalData.push(normal[1]); normalData.push(normal[2]);

                // 4th triangle
                vertexPositionData.push(newV3[0]);vertexPositionData.push(newV3[1]);vertexPositionData.push(newV3[2]);
                vertexPositionData.push(newV2[0]);vertexPositionData.push(newV2[1]);vertexPositionData.push(newV2[2]);
                vertexPositionData.push(v3[0]);vertexPositionData.push(v3[1]);vertexPositionData.push(v3[2]);

                textureCoordData.push(newT3[0]); textureCoordData.push(newT3[1]);
                textureCoordData.push(newT2[0]); textureCoordData.push(newT2[1]);
                textureCoordData.push(t3[0]); textureCoordData.push(t3[1]);

                normal = computeFaceNormal(newV3, newV2, v3);
                normalData.push(normal[0]); normalData.push(normal[1]); normalData.push(normal[2]);
                normalData.push(normal[0]); normalData.push(normal[1]); normalData.push(normal[2]);
                normalData.push(normal[0]); normalData.push(normal[1]); normalData.push(normal[2]);

                // add indices of 4 new triangles
                indexData.push(index);indexData.push(index+1);indexData.push(index+2);
                indexData.push(index+3);indexData.push(index+4);indexData.push(index+5);
                indexData.push(index+6);indexData.push(index+7);indexData.push(index+8);
                indexData.push(index+9);indexData.push(index+10);indexData.push(index+11);
                index += 12;    // next index
            }
        }

        // this has to be done at the end
        geometry.vertices = Float32Attribute(vertexPositionData,3);

        for (let i = 0; i < geometry.vertices.array.length; i++) {
            geometry.vertices.array[i] *= scale;
        }

        geometry.indices = Uint32Attribute(indexData, 1);
        geometry.normals = Float32Attribute(normalData,3);
        //geometry.computeVertexNormals();
        geometry.uv = Float32Attribute(textureCoordData,2);

        // Super M3D.Mesh
		super(geometry, material);

		this.type = "IcoSphere";
    }
};

// find middle point of 2 vertices
// NOTE: new vertex must be resized, so the length is equal to the radius
function computeHalfVertex(oneV, twoV, radius) {
    var newV = [];
    newV.push(oneV[0] + twoV[0]);    // x
    newV.push(oneV[1] + twoV[1]);    // y
    newV.push(oneV[2] + twoV[2]);    // z
    var scaleV = radius / Math.sqrt(newV[0]*newV[0] + newV[1]*newV[1] + newV[2]*newV[2]);
    newV[0] *= scaleV;
    newV[1] *= scaleV;
    newV[2] *= scaleV;
    return newV;
}


// find middle texcoords of 2 tex coords and return new coord
function computeHalfTexCoord(tex1x, tex1y, tex2x, tex2y) {
    var newT = [];
    newT.push((tex1x + tex2x) * 0.5);
    newT.push((tex1y + tex2y) * 0.5);
    return newT;
}

// return vertex normal by normalizing the vertex vector
function computeVertexNormal(vertexX, vertexY, vertexZ) {
    //normalize
    var scale = computeScaleForLength(vertexX, vertexY, vertexZ, 1);
    var normal = []
    normal.push(vertexX * scale);
    normal.push(vertexY * scale);
    normal.push(vertexZ * scale);
    return  normal;
}


// return face normal of a triangle v1-v2-v3
// if a triangle has no surface (normal length = 0), then return a zero vector
function computeFaceNormal(v1, v2, v3) {
    const EPSILON = 0.000001;
    var n = [];

    // default return value (0, 0, 0)
    n.push(0);
    n.push(0);
    n.push(0);

    // find 2 edge vectors: v1-v2, v1-v3
    var ex1 = v2[0] - v1[0];
    var ey1 = v2[1] - v1[1];
    var ez1 = v2[2] - v1[2];
    var ex2 = v3[0] - v1[0];
    var ey2 = v3[1] - v1[1];
    var ez2 = v3[2] - v1[2];

    // cross product: e1 x e2
    var nx, ny, nz;
    nx = ey1 * ez2 - ez1 * ey2;
    ny = ez1 * ex2 - ex1 * ez2;
    nz = ex1 * ey2 - ey1 * ex2;

    // normalize only if the length is > 0
    var length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if(length > EPSILON)
    {
        // normalize
        var lengthInv = 1.0 / length;
        n[0] = nx * lengthInv;
        n[1] = ny * lengthInv;
        n[2] = nz * lengthInv;
    }

    return n;
}

function computeScaleForLength(vertexX, vertexY, vertexZ, length) {
    return length / Math.sqrt(vertexX*vertexX + vertexY*vertexY + vertexZ*vertexZ);
}