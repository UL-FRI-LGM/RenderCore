/**
 * Created by Sebastien.
 */
import {Mesh} from './Mesh.js';
import {MeshBasicMaterial} from '../materials/MeshBasicMaterial.js';
import {Float32Attribute} from '../core/BufferAttribute.js';
import {POINTS} from "../constants.js";
import {PickingShaderMaterial} from "../materials/PickingShaderMaterial.js";
import {FRONT_SIDE} from "../constants.js";


export class Point extends Mesh {
    constructor(geometry, material = new MeshBasicMaterial(), pickingMaterial = new PickingShaderMaterial("POINTS", {pointSize: 1.0})) {
        // Super RC.Mesh
        super(geometry, material, pickingMaterial);


        this.type = "Point";
        this.renderingPrimitive = POINTS;


        //OUTLINE
        this.outline.renderingPrimitive = POINTS;
        this.outline.material.side = FRONT_SIDE;
        this.outline.material.usePoints = true;
        this.outline.material.pointSize = this.material.pointSize * 1.1;
        this.outline.material.offset = 0.0;
    }


    set points(points) {
        this.geometry.vertices = Float32Attribute(points, 3);
    }
    get points(){
        return this.geometry.vertices;
    }


    static fromJson(data, geometry, material) {
        // Create mesh object
        let point = new Point(geometry, material);

        // Import Object3D parameters
        point = super.fromJson(data, undefined, undefined, point);

        return point;
    }

}