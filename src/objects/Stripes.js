/**
 * Created by Sebastien.
 */
import { SpriteBasicMaterial } from "../RenderCore.js";
import {Mesh} from "./Mesh.js";
import { Sprite } from "./Sprite.js";
import { SpriteGeometry } from "./SpriteGeometry.js";
import {SPRITE_SPACE_SCREEN} from '../constants.js';


export class Stripes extends Mesh {
    constructor(args = {}) {
        //SUPER
        super(args.geometry, args.material, args.pickingMaterial);

        
        this.type = "Stripes";


        //ASSEMBLE GEOMETRY/MATERIAL
        //this.geometry = args.geometry !== undefined ? Stripes.assembleGeometry(args) : Stripes.assembleGeometry(new Geometry());
        //this.material = args.material !== undefined ? Stripes.assembleMaterial(args) : Stripes.assembleMaterial(args);
        //this.pickingMaterial = args.pickingMaterial !== undefined ? args.pickingMaterial : new PickingShaderMaterial("stripe");//todo stripes picking mat


        this._dashed = false;


        // const spriteGeometry = new SpriteGeometry({baseGeometry: args.geometry});
        // const spriteMaterial = new SpriteBasicMaterial({
        //     color: this.material.color,
        //     drawCircles: true,
        //     spriteSize: [this.material.lineWidth/2.0, this.material.lineWidth/2.0],
        //     mode: SPRITE_SPACE_SCREEN,
        //     baseGeometry: args.geometry
        // });
        // const sprite = new Sprite({geometry: spriteGeometry, material: spriteMaterial});
        // this.add(sprite);
    }


    set dashed(dashed) { this._dashed = dashed; } //todo dashed line
    get dashed() { return this._dashed; }
}