/**
 * Created by Sebastien.
 */
import { SpriteBasicMaterial } from "../RenderCore.js";
import {Mesh} from "./Mesh.js";
import { Sprite } from "./Sprite.js";
import { SpriteGeometry } from "./SpriteGeometry.js";
import {SPRITE_SPACE_SCREEN} from '../constants.js';
import { CustomShaderMaterial } from '../materials/CustomShaderMaterial.js';


export class Stripes extends Mesh {
    constructor(args = {}) {
        //SUPER
        super(args.geometry, args.material, args.pickingMaterial);

        
        this.type = "Stripes";
        
        this.GBufferMaterial = (args.GBufferMaterial !== undefined) ? args.GBufferMaterial : Stripes.assembleGBufferMaterial({baseMaterial: this.material});


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


    get material() { return super.material; }
    set material(material) {
        super.material = material;


        this.GBufferMaterial.setUniform("halfLineWidth", this.material.lineWidth/2.0);
        this.GBufferMaterial.setUniform("MODE", this.material.mode);

        this.GBufferMaterial.setAttribute("prevVertex", this.material.prevVertex);
        this.GBufferMaterial.setAttribute("nextVertex", this.material.nextVertex);
        this.GBufferMaterial.setAttribute("deltaOffset", this.material.deltaOffset);
    }
    get GBufferMaterial() { return super.GBufferMaterial; }
    set GBufferMaterial(GBufferMaterial) {
        super.GBufferMaterial = GBufferMaterial;
    }

    set dashed(dashed) { this._dashed = dashed; } //todo dashed line
    get dashed() { return this._dashed; }


    static assembleGBufferMaterial(args){
        return new CustomShaderMaterial("GBuffer_stripes", 
            {
                "halfLineWidth": args.baseMaterial.lineWidth/2.0,
                "MODE": args.baseMaterial.mode
            }, 
            {
                "prevVertex": args.baseMaterial.prevVertex,
                "nextVertex": args.baseMaterial.nextVertex,
                "deltaOffset": args.baseMaterial.deltaOffset
            }
        );
    }
}