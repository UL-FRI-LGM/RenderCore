import { Mesh } from "./Mesh.js";
import { ConeGeometry } from "./ConeGeometry.js";


export class Cone extends Mesh{
    constructor(args = {}){
        //SUPER
        super(args.geometry !== undefined ? args.geometry : new ConeGeometry(), args.material);
        this.type = "Cone";
        
    }
}