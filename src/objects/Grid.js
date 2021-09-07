import {Mesh} from "./Mesh.js";
import {MeshBasicMaterial} from "../materials/MeshBasicMaterial.js";
import {Geometry} from "./Geometry.js";
import {LINES, FUNC_ALWAYS, FRONT_AND_BACK_SIDE} from "../constants.js";
import {Uint8Attribute, Uint32Attribute, Float32Attribute} from "../core/BufferAttribute.js";
import { CustomShaderMaterial } from "../materials/CustomShaderMaterial.js";
import { Plane } from "../math/Plane.js";
import { Vector3 } from "../math/Vector3.js";


export class Grid extends Mesh{
    constructor(geometry, material, unitSize = 1.0, orderOfMagnitude = 10.0, lineBase = 128, showUnits = false){
        super(geometry, material);
        this.type = "Grid";
        this.remove(this.outline);
        this.pickable = false;
        this.frustumCulled = false;


        this._plane = new Plane(new Vector3(0, 1, 0), 0);
        this._n = lineBase * (1.0 / unitSize); //more dense the minimum, more lines are needed



        this.geometry = new Geometry();
        this.geometry.vertices = new Float32Attribute(this._generateLinePositionsAttribute().concat(this._generateLinePositionsAttribute()), 3);

        this.material = new CustomShaderMaterial(
            "grid",
            {
                "plane.normal": this._plane.normal.toArray(),
                "plane.constant": this._plane.constant,
                "unitSize": unitSize,
                "orderOfMagnitude": orderOfMagnitude,
                "LColor": [0.5, 0.5, 0.5],
                "UColor": [0.5, 0.5, 0.5],
                "lineBase" : this._n
            },
            {
                "VIDLU": new Float32Attribute(this._generateLineIDsAttribute(0.0).concat(this._generateLineIDsAttribute(1.0)), 1),
                "offset": new Float32Attribute(this._generateLineOffsetAttribute(1).concat(this._generateLineOffsetAttribute(1)), 3)
            }
        )
        this.material.transparent = true;
        this.material.lights = false;

        this.renderingPrimitive = LINES;
    }

    _generateLines(){
        const points = [];
        const halfLengths = +1024*2;
        const spacing = +9;


        //0
        points.push(-halfLengths, 0, 0, +halfLengths, 0, 0);
        //0 -> -
        for(let i = -1; i >= -64; i--){
            points.push(-halfLengths, 0, i*spacing, +halfLengths, 0, i*spacing);

        }
        //0 -> +
        for(let i = 1; i <= 64; i++){
            points.push(-halfLengths, 0, i*spacing, +halfLengths, 0, i*spacing);
        }

        //0
        points.push(0, 0, -halfLengths, 0, 0, +halfLengths);
        //0 -> -
        for(let i = -1; i >= -64; i--){
            points.push(i*spacing, 0, -halfLengths, i*spacing, 0, +halfLengths);

        }
        //0 -> +
        for(let i = 1; i <= 64; i++){
            points.push(i*spacing, 0, -halfLengths, i*spacing, 0, +halfLengths);
        }

        return points;
    }
    _generateLineIDsAttribute(ID){
        const IDs = new Array();
        const n = this._n;

        //0
        IDs.push(ID, ID);
        //0 -> -
        for(let i = -1; i >= -n; i--){
            IDs.push(ID, ID);
        }
        //0 -> +
        for(let i = 1; i <= n; i++){
            IDs.push(ID, ID);
        }

        //0
        IDs.push(ID, ID);
        //0 -> -
        for(let i = -1; i >= -n; i--){
            IDs.push(ID, ID);
        }
        //0 -> +
        for(let i = 1; i <= n; i++){
            IDs.push(ID, ID);
        }

        return IDs;
    }
    _generateLinePositionsAttribute(){
        const points = new Array();
        const halfLengths = 1.0;
        const n = this._n;

        //0
        points.push(-halfLengths, 0, 0, +halfLengths, 0, 0);
        //0 -> -
        for(let i = -1; i >= -n; i--){
            points.push(-halfLengths, 0, 0, +halfLengths, 0, 0);

        }
        //0 -> +
        for(let i = 1; i <= n; i++){
            points.push(-halfLengths, 0, 0, +halfLengths, 0, 0);
        }

        //0
        points.push(0, 0, -halfLengths, 0, 0, +halfLengths);
        //0 -> -
        for(let i = -1; i >= -n; i--){
            points.push(0, 0, -halfLengths, 0, 0, +halfLengths);

        }
        //0 -> +
        for(let i = 1; i <= n; i++){
            points.push(0, 0, -halfLengths, 0, 0, +halfLengths);
        }


        return points;
    }
    _generateLineOffsetAttribute(unitSize = 1.0){
        const offsets = new Array();
        const n = this._n;

        //0
        offsets.push(0, 0, 0, 0, 0, 0);
        //0 -> -
        for(let i = -1; i >= -n; i--){
            offsets.push(0, 0, i*unitSize, 0, 0, i*unitSize);

        }
        //0 -> +
        for(let i = 1; i <= n; i++){
            offsets.push(0, 0, i*unitSize, 0, 0, i*unitSize);
        }

        //0
        offsets.push(0, 0, 0, 0, 0, 0);
        //0 -> -
        for(let i = -1; i >= -n; i--){
            offsets.push(i*unitSize, 0, 0, i*unitSize, 0, 0);

        }
        //0 -> +
        for(let i = 1; i <= n; i++){
            offsets.push(i*unitSize, 0, 0, i*unitSize, 0, 0);
        }

        return offsets;
    }
}