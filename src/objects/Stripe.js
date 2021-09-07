/**
 * Created by Sebastien.
 */
import {Geometry} from "./Geometry.js";
import {Mesh} from "./Mesh.js";
import {Float32Attribute, Uint32Attribute, Uint16Attribute, Uint8Attribute} from "../core/BufferAttribute.js";
import {StripeBasicMaterial} from "../materials/StripeBasicMaterial.js";
import {PickingShaderMaterial} from "../materials/PickingShaderMaterial.js";


export class Stripe extends Mesh {
    constructor(points, material = new StripeBasicMaterial(), pickingMaterial = new PickingShaderMaterial("stripe"), smooth = false, N_segments = 8) {

        if(Array.isArray(points)) points = new Float32Attribute(points, 3);
        if(smooth) points = _perp(points, N_segments);


        const geometry = new Geometry();
        const stripeIndex = _setupIndex(points);
        const stripeVertex = _setupVertex(points);

        geometry.indices = new Uint32Attribute(stripeIndex, 1);
        geometry.vertices = new Float32Attribute(stripeVertex.stripePositions, points.itemSize);

        material.setAttribute("prevPosition", new Float32Attribute(stripeVertex.stripePrevPosition, points.itemSize));
        material.setAttribute("nextPosition", new Float32Attribute(stripeVertex.stripeNextPosition, points.itemSize));
        material.setAttribute("normalDirection", new Float32Attribute(stripeVertex.stripeNormalDirection, 1));
        material.setUniform("aspect", window.innerWidth/window.innerHeight);
        material.setUniform("lineWidth", 1.0);

        super(geometry, material, pickingMaterial);

        this.type = "Stripe";

        //OUTLINE
        this.outline.material = new StripeBasicMaterial();
        this.outline.material.setAttribute("prevPosition", new Float32Attribute(stripeVertex.stripePrevPosition, points.itemSize));
        this.outline.material.setAttribute("nextPosition", new Float32Attribute(stripeVertex.stripeNextPosition, points.itemSize));
        this.outline.material.setAttribute("normalDirection", new Float32Attribute(stripeVertex.stripeNormalDirection, 1));
        this.outline.material.setUniform("aspect", window.innerWidth/window.innerHeight);
        this.outline.material.lineWidth = this.material.lineWidth * 1.1;

        this._dashed = false;
    }

    set dashed(dashed) { this._dashed = dashed; } //todo dashed line
    get dashed() { return this._dashed; }
}

function _setupIndex(points) {
    let stripeIndex = [];

    for(let i = 0; i < points.count()*2-2; i++) {
        if (i % 2 === 0){
            stripeIndex.push(i + 0);
            stripeIndex.push(i + 1);
            stripeIndex.push(i + 2);
        }else {
            stripeIndex.push(i + 0);
            stripeIndex.push(i + 2);
            stripeIndex.push(i + 1);
        }
    }

    return stripeIndex
}
function _setupVertex(points) {
    const stripePositions = new Array(points.count() * points.itemSize * 2);
    const stripePrevPosition = new Array(points.count() * points.itemSize * 2);
    const stripeNextPosition = new Array(points.count() * points.itemSize * 2);
    const stripeNormalDirection = new Array(points.count() * 2);

    for(let i = 0; i < points.count(); i++){
        //clone
        stripePositions[i*points.itemSize*2 + 0] = points.array[i*points.itemSize + 0];//todo vec2, vecx, (0, 1, 2 = vec3)
        stripePositions[i*points.itemSize*2 + 1] = points.array[i*points.itemSize + 1];
        stripePositions[i*points.itemSize*2 + 2] = points.array[i*points.itemSize + 2];

        stripePositions[i*points.itemSize*2 + 3] = points.array[i*points.itemSize + 0];
        stripePositions[i*points.itemSize*2 + 4] = points.array[i*points.itemSize + 1];
        stripePositions[i*points.itemSize*2 + 5] = points.array[i*points.itemSize + 2];

        if(i === 0) {
            stripePrevPosition[i*points.itemSize*2 + 0] = points.array[i*points.itemSize - 0 + 0];
            stripePrevPosition[i*points.itemSize*2 + 1] = points.array[i*points.itemSize - 0 + 1];
            stripePrevPosition[i*points.itemSize*2 + 2] = points.array[i*points.itemSize - 0 + 2];

            stripePrevPosition[i*points.itemSize*2 + 3] = points.array[i*points.itemSize - 0 + 0];
            stripePrevPosition[i*points.itemSize*2 + 4] = points.array[i*points.itemSize - 0 + 1];
            stripePrevPosition[i*points.itemSize*2 + 5] = points.array[i*points.itemSize - 0 + 2];

            stripeNextPosition[i*points.itemSize*2 + 0] = points.array[i*points.itemSize + points.itemSize + 0];
            stripeNextPosition[i*points.itemSize*2 + 1] = points.array[i*points.itemSize + points.itemSize + 1];
            stripeNextPosition[i*points.itemSize*2 + 2] = points.array[i*points.itemSize + points.itemSize + 2];

            stripeNextPosition[i*points.itemSize*2 + 3] = points.array[i*points.itemSize + points.itemSize + 0];
            stripeNextPosition[i*points.itemSize*2 + 4] = points.array[i*points.itemSize + points.itemSize + 1];
            stripeNextPosition[i*points.itemSize*2 + 5] = points.array[i*points.itemSize + points.itemSize + 2];
        }else if (i >= 1 && i <= points.count()-2) {
            stripePrevPosition[i*points.itemSize*2 + 0] = points.array[i*points.itemSize - points.itemSize + 0];
            stripePrevPosition[i*points.itemSize*2 + 1] = points.array[i*points.itemSize - points.itemSize + 1];
            stripePrevPosition[i*points.itemSize*2 + 2] = points.array[i*points.itemSize - points.itemSize + 2];

            stripePrevPosition[i*points.itemSize*2 + 3] = points.array[i*points.itemSize - points.itemSize + 0];
            stripePrevPosition[i*points.itemSize*2 + 4] = points.array[i*points.itemSize - points.itemSize + 1];
            stripePrevPosition[i*points.itemSize*2 + 5] = points.array[i*points.itemSize - points.itemSize + 2];

            stripeNextPosition[i*points.itemSize*2 + 0] = points.array[i*points.itemSize + points.itemSize + 0];
            stripeNextPosition[i*points.itemSize*2 + 1] = points.array[i*points.itemSize + points.itemSize + 1];
            stripeNextPosition[i*points.itemSize*2 + 2] = points.array[i*points.itemSize + points.itemSize + 2];

            stripeNextPosition[i*points.itemSize*2 + 3] = points.array[i*points.itemSize + points.itemSize + 0];
            stripeNextPosition[i*points.itemSize*2 + 4] = points.array[i*points.itemSize + points.itemSize + 1];
            stripeNextPosition[i*points.itemSize*2 + 5] = points.array[i*points.itemSize + points.itemSize + 2];
        }else if (i === points.count()-1){
            stripePrevPosition[i*points.itemSize*2 + 0] = points.array[i*points.itemSize - points.itemSize + 0];
            stripePrevPosition[i*points.itemSize*2 + 1] = points.array[i*points.itemSize - points.itemSize + 1];
            stripePrevPosition[i*points.itemSize*2 + 2] = points.array[i*points.itemSize - points.itemSize + 2];

            stripePrevPosition[i*points.itemSize*2 + 3] = points.array[i*points.itemSize - points.itemSize + 0];
            stripePrevPosition[i*points.itemSize*2 + 4] = points.array[i*points.itemSize - points.itemSize + 1];
            stripePrevPosition[i*points.itemSize*2 + 5] = points.array[i*points.itemSize - points.itemSize + 2];

            stripeNextPosition[i*points.itemSize*2 + 0] = points.array[i*points.itemSize + 0 + 0];
            stripeNextPosition[i*points.itemSize*2 + 1] = points.array[i*points.itemSize + 0 + 1];
            stripeNextPosition[i*points.itemSize*2 + 2] = points.array[i*points.itemSize + 0 + 2];

            stripeNextPosition[i*points.itemSize*2 + 3] = points.array[i*points.itemSize + 0 + 0];
            stripeNextPosition[i*points.itemSize*2 + 4] = points.array[i*points.itemSize + 0 + 1];
            stripeNextPosition[i*points.itemSize*2 + 5] = points.array[i*points.itemSize + 0 + 2];
        }

        stripeNormalDirection[i*2 + 0] = +1;
        stripeNormalDirection[i*2 + 1] = -1;
    }

    return {stripePositions, stripePrevPosition, stripeNextPosition, stripeNormalDirection};
}

function _perp(data, ns){
    let newData = [];

    for(let t = 0.0; t <= 1.0; t += (1.0/ns)){

        let x = 0, y = 0, z = 0;
        for(let i = 0; i < data.count(); i++){
            const bint = _bint(i, data.count()-1, t);
            x += data.array[i*data.itemSize + 0] * bint;
            y += data.array[i*data.itemSize + 1] * bint;
            z += data.array[i*data.itemSize + 2] * bint;
        }
        newData.push(x, y, z);
    }

    data.array = newData;
    return data;
}
function _bint(i, n, t){
    return _binomial(n, i) * Math.pow(t, i) * Math.pow((1 - t), (n - i));
}
function _binomial(n, k) {
    if ((typeof n !== 'number') || (typeof k !== 'number'))
        return false;
    var coeff = 1;
    for (var x = n-k+1; x <= n; x++) coeff *= x;
    for (x = 1; x <= k; x++) coeff /= x;
    return coeff;
}