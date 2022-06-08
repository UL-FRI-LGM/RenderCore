import {CustomShaderMaterial} from './CustomShaderMaterial.js';
import {Color} from "../math/Color.js";
import {SPRITE_SPACE_SCREEN, SPRITE_SPACE_WORLD} from '../constants.js';


export class ZSpriteBasicMaterial extends CustomShaderMaterial {

    /**
     * WARNING:
     * - constructor does not pass arguments to parent class
     * - evades "custom" in shader name by setting programName after super
     */
    constructor(args = {}){
        super();

        this.type = "ZSpriteBasicMaterial";
        this.programName = "basic_zsprite";

        // Uniforms aspect and viewport set by MeshRenderer based on actual viewport
        this.setUniform("SpriteMode", "SpriteMode" in args ? args.SpriteMode : SPRITE_SPACE_SCREEN);
        this.setUniform("SpriteSize", "SpriteSize" in args ? args.SpriteSize : [1.0, 1.0]);

        this.color = args.color ? args.color : new Color(Math.random() * 0xffffff);
        this.emissive = args.emissive ? args.emissive : new Color(Math.random() * 0xffffff);
        this.diffuse = args.diffuse ? args.diffuse : new Color(Math.random() * 0xffffff);
    }

    clone_for_outline() {
        let o = new ZSpriteBasicMaterial( {
            SpriteMode: this.getUniform("SpriteMode"), SpriteSize: this.getUniform("SpriteSize"),
            color: this.color, emissive: this.emissive, diffuse: this.diffuse
        } );
        for (const m of this.maps) o.addMap(m);
        o.instanceData = this.instanceData;
        o.addSBFlag('OUTLINE');
        return o;
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

    get emissive() { return this._emissive; }
    set emissive(val) {
        this._emissive = val;

        // Notify onChange subscriber
        if (this._onChangeListener) {
            var update = {uuid: this._uuid, changes: {emissive: this._emissive.getHex()}};
            this._onChangeListener.materialUpdate(update)
        }
    }
    get diffuse() { return this._diffuse; }
    set diffuse(val) {
        this._diffuse = val;

        // Notify onChange subscriber
        if (this._onChangeListener) {
            var update = {uuid: this._uuid, changes: {diffuse: this._diffuse.getHex()}};
            this._onChangeListener.materialUpdate(update)
        }
    }

    update(data) {
        super.update(data);

        for (let prop in data) {
            switch (prop) {
                case "color":
                    this._color = data.color;
                    delete data.color;
                    break;
                case "emissive":
                    this._emissive = data.emissive;
                    delete data.emissive;
                    break;
                case "diffuse":
                    this._diffuse = data.diffuse;
                    delete data.diffuse;
                    break;
            }
        }
    }
}
