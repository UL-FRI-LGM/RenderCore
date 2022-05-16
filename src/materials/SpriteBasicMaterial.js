import {CustomShaderMaterial} from './CustomShaderMaterial.js';
import {Color} from "../math/Color.js";
import {Vector2} from '../math/Vector2.js';
import {SPRITE_SPACE_SCREEN} from '../constants.js';
import { Float32Attribute } from '../core/BufferAttribute.js';


export class SpriteBasicMaterial extends CustomShaderMaterial {
    constructor(args = {}){
        super();

        this.type = "SpriteBasicMaterial";
        this.programName = "basic_sprite";

        //ASSEMBLE MATERIAL
        this.emissive = args.emissive ? args.emissive : new Color(Math.random() * 0xffffff);
        this.color = args.color ? args.color : new Color(Math.random() * 0xffffff);
        this.drawCircles = args.drawCircles ? args.drawCircles : false;

        this._spriteSize = new Vector2(1, 1);//deprecated
        this.setUniform("spriteSize", args.spriteSize ? args.spriteSize : [1.0, 1.0]);
        // Uniforms aspect and viewport set by MeshRenderer based on actual viewport
        this.setUniform("MODE", args.mode ? args.mode : SPRITE_SPACE_SCREEN);
        this.setAttribute("deltaOffset", args.baseGeometry ? SpriteBasicMaterial._setupDeltaDirections(args.baseGeometry) : null);
    }


    get spriteSize() { return this._spriteSize; }
    set spriteSize(val) {
		if (!val.equals(this._spriteSize)) {
			this._spriteSize = val;

			// Notify onChange subscriber
			if (this._onChangeListener) {
				var update = {uuid: this._uuid, changes: {spriteSize: this._spriteSize}};
				this._onChangeListener.materialUpdate(update)
			}
		}
	}
    get emissive() { return this._emissive; }
    set emissive(val) {
        this._emissive = val;

        // Notify onChange subscriber
        if (this._onChangeListener) {
            var update = {uuid: this._uuid, changes: {emissive: this._emissive.getHex()}};
            this._onChangeListener.materialUpdate(update)
        }
    }
    get color() { return this._color; }
    set color(val) {
        this._color = val;

        // Notify onChange subscriber
        if (this._onChangeListener) {
            var update = {uuid: this._uuid, changes: {color: this._color.getHex()}};
            this._onChangeListener.materialUpdate(update)
        }
    }


    update(data) {
        super.update(data);

        for (let prop in data) {
            switch (prop) {
                case "emissive":
                    this._emissive = data.emissive;
                    delete data.emissive;
                    break;
                case "color":
                    this._color = data.color;
                    delete data.color;
                    break;
                case "spriteSize":
                    this._spriteSize = data.spriteSize;
                    delete data.spriteSize;
                    break;
            }
        }
    }


    static _setupDeltaDirections(baseGeometry){
        if(baseGeometry.indices){
            const indices = baseGeometry.indices;
            const spriteDirections = new Array(indices.count() * 2 * 4);

            for(let i = 0; i < indices.count(); i++) {
                spriteDirections[i*8 + 0] = -1;
                spriteDirections[i*8 + 1] = +1;

                spriteDirections[i*8 + 2] = -1;
                spriteDirections[i*8 + 3] = -1;

                spriteDirections[i*8 + 4] = +1;
                spriteDirections[i*8 + 5] = +1;

                spriteDirections[i*8 + 6] = +1;
                spriteDirections[i*8 + 7] = -1;
            }

            return new Float32Attribute(spriteDirections, 2);
        }else{
            const vertices = baseGeometry.vertices;
            const spriteDirections = new Array(vertices.count() * 2 * 4);

            for(let v = 0; v < vertices.count(); v++) {
                spriteDirections[v*8 + 0] = -1;
                spriteDirections[v*8 + 1] = +1;

                spriteDirections[v*8 + 2] = -1;
                spriteDirections[v*8 + 3] = -1;

                spriteDirections[v*8 + 4] = +1;
                spriteDirections[v*8 + 5] = +1;

                spriteDirections[v*8 + 6] = +1;
                spriteDirections[v*8 + 7] = -1;
            }

            return new Float32Attribute(spriteDirections, 2);
        }
    }
}