/**
 * Created by Sebastien.
 */
import {Mesh} from './Mesh.js';
import {Float32Attribute} from '../core/BufferAttribute.js';
import {POINTS} from "../constants.js";
import {PickingShaderMaterial} from "../materials/PickingShaderMaterial.js";
import {FRONT_SIDE} from "../constants.js";
import { Geometry } from './Geometry.js';
import { PointBasicMaterial } from '../RenderCore.js';


export class Point extends Mesh {
    constructor(args = {}) {
        //DEFAULTS
        const geometry = args.geometry ? args.geometry : new Geometry({vertices: new Float32Attribute([0, 0, 0], 3)});
        const material = args.material ? args.material : new PointBasicMaterial();

        //SUPER
        super(geometry, material, new PickingShaderMaterial("POINTS", {pointSize: 1.0}));


        this.type = "Point";
        this.renderingPrimitive = POINTS;
    }


    set points(points) {
        this.geometry.vertices = Float32Attribute(points, 3);
    }
    get points() {
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