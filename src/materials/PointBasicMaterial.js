import { MeshBasicMaterial } from './MeshBasicMaterial.js';


export class PointBasicMaterial extends MeshBasicMaterial {
    constructor(args = {}){
        super(args);

        this.type = "PointBasicMaterial";


        //ASSEMBLE MATERIAL
        this.usePoints = args.usePoints ? args.usePoints : true;
        this.pointSize = args.pointSize ? args.pointSize : 1.0;
        this.drawCircles = args.drawCircles ? args.drawCircles : false;
    }
}