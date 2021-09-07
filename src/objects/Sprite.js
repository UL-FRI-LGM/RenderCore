/**
 * Created by Sebastien.
 */
import {Quad} from './Quad.js';


export class Sprite extends Quad{
    constructor(args = {}){
        //SUPER
        super(null, null, args.material, args.geometry);
        this.type = "Sprite";
    }
}