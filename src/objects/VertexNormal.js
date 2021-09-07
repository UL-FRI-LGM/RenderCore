import { Line } from "./Line.js";
import { LINES } from "../constants.js";
import { VertexNormalMaterial } from "../materials/VertexNormalMaterial.js";
import { Geometry } from "./Geometry.js";
import { Float32Attribute } from "../core/BufferAttribute.js";


export class VertexNormal extends Line {
    constructor(args = {}) {
        super(args.geometry, args.material);

        this.type = "VertexNormal";
        this.renderingPrimitive = LINES;
    }

    static assembleGeometry(args){
        const baseGeometry = args.geometry;
        const newGeometry = new Geometry();

        if(baseGeometry){
            const vertexNormalVertices = VertexNormal._setupVertices(baseGeometry);
            const vertexNormalNormals = VertexNormal._setupNormals(baseGeometry);
            newGeometry.vertices = vertexNormalVertices;
            newGeometry.normals = vertexNormalNormals;
        }

        return newGeometry;
    }
    static assembleMaterial(args){
        const baseGeometry = args.geometry;
        const baseMaterial = args.material;
        const newMaterial = new VertexNormalMaterial(args);

        const vertexNormalIndicators = VertexNormal._setupIndicators(baseGeometry);

        newMaterial.setAttribute("vertexNormalIndicators", vertexNormalIndicators);

        return newMaterial;
    }

    static _setupVertices(baseGeometry){
        const vertices = baseGeometry.vertices;
        const vertexNormalVertices = new Array(vertices.count() * vertices.itemSize * 2);

        for(let v = 0; v < vertices.count(); v++){
            vertexNormalVertices[v*3*2 + 0] = vertices.array[v*3 + 0];
            vertexNormalVertices[v*3*2 + 1] = vertices.array[v*3 + 1];
            vertexNormalVertices[v*3*2 + 2] = vertices.array[v*3 + 2];

            vertexNormalVertices[v*3*2 + 3] = vertices.array[v*3 + 0];
            vertexNormalVertices[v*3*2 + 4] = vertices.array[v*3 + 1];
            vertexNormalVertices[v*3*2 + 5] = vertices.array[v*3 + 2];
        }

        return new Float32Attribute(vertexNormalVertices, vertices.itemSize);
    }
    static _setupNormals(baseGeometry){
        const normals = baseGeometry.normals;
        const vertexNormalNormals = new Array(normals.count() * normals.itemSize * 2);

        normals.count()
        for(let v = 0; v < normals.count(); v++){
            vertexNormalNormals[v*3*2 + 0] = normals.array[v*3 + 0];
            vertexNormalNormals[v*3*2 + 1] = normals.array[v*3 + 1];
            vertexNormalNormals[v*3*2 + 2] = normals.array[v*3 + 2];

            vertexNormalNormals[v*3*2 + 3] = normals.array[v*3 + 0];
            vertexNormalNormals[v*3*2 + 4] = normals.array[v*3 + 1];
            vertexNormalNormals[v*3*2 + 5] = normals.array[v*3 + 2];
        }

        return new Float32Attribute(vertexNormalNormals, normals.itemSize);
    }
    static _setupIndicators(baseGeometry){
        const vertices = baseGeometry.vertices;
        const vertexNormalIndicators = new Array(vertices.count() * 2);

        for(let v = 0; v < vertices.count(); v++){
            vertexNormalIndicators[v*2 + 0] = 0;
            vertexNormalIndicators[v*2 + 1] = 1;
        }


        return new Float32Attribute(vertexNormalIndicators, 1);
    }
}