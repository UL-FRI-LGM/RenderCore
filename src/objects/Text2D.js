import {Mesh} from "./Mesh.js";
import {Geometry} from "./Geometry.js";
import {Float32Attribute, Uint32Attribute} from "../core/BufferAttribute.js";
import {Vector2} from "../math/Vector2.js";
import { Text2DMaterial } from "../materials/Text2DMaterial.js";
import { TEXT2D_SPACE_SCREEN, TEXT2D_SPACE_WORLD } from "../constants.js";


//Text2D API
export class Text2D extends Mesh{
    constructor(args = {}){
        super();

        this.type = "Text2D";
        this.frustumCulled = false;

        this.pickable = false;
        this.remove(this.outline);

        this._text = args.text !== undefined ? args.text : "New text";
        this._fontTexture = args.fontTexture !== undefined ? args.fontTexture : null; //this._fontTexture = this.initializeText2D(fontTexturePath);
        //this._scene = scene;
        this._xPos = args.xPos !== undefined ? args.xPos : 0;
        this._yPos = args.yPos !== undefined ? args.yPos : 0;
        this._fontSize = args.fontSize !== undefined ? args.fontSize : 32;
        this._mode = args.mode !== undefined ? args.mode : TEXT2D_SPACE_SCREEN;

        //TODO refactor this
        if (this._mode === TEXT2D_SPACE_SCREEN){
            this.geometry = this.setText2D(this._text, this._xPos, this._yPos, this._fontSize);
            this.material = new Text2DMaterial();
            this.material.setAttribute("deltaOffset", new Float32Attribute([]));
            // Uniforms aspect and viewport set by MeshRenderer based on actual viewport
            this.material.setUniform("MODE", TEXT2D_SPACE_SCREEN);

            this.material.addMap(this._fontTexture);
        }else if (this._mode === TEXT2D_SPACE_WORLD){
            this.geometry = Text2D._assembleGeometry({text: this._text});
            this.material = Text2D._assembleMaterial({text: this._text, fontSize: this._fontSize, offset: new Vector2(this._xPos, this._yPos),  mode: this._mode});

            this.material.addMap(this._fontTexture);
        }else {
            console.error('[' + this.type + "]: Unknow mode [" + args.mode + ']');
        }
    }

    set text(text){
        this._text = text;
        this.geometry = this.setText2D(this._text, this._xPos, this._yPos, this._fontSize);
    }
    get text(){
        return this._text;
    }
    set fontTexture(fontTexture){
        this._fontTexture = fontTexture;
        this.material.clearMaps();
        this.material.addMap(this._fontTexture);
    }
    get fontTexture(){
        return this._fontTexture;
    }
    set xPos(xPos){
        this._xPos = xPos;
    }
    get xPos(){
        return this._xPos;
    }
    set yPos(yPos){
        this._yPos = yPos;
    }
    get yPos(){
        return this._yPos;
    }
    set fontSize(fontSize){
        this._fontSize = fontSize;
    }
    get fontSize(){
        return this._fontSize;
    }

    static _assembleGeometry(args){
        const geometry = new Geometry();

        geometry.vertices = Text2D._setupVertices(args.text);
        geometry.indices = Text2D._setupIndices(args.text);
        geometry.uv = Text2D._setupUVs(args.text);

        return geometry;
    }
    static _setupVertices(text){
        const textVertices = new Array(text.length * 4 * 2);

        //FOR EVERY CHARACTER OF THE TEXT STRING
        for(let c = 0; c < text.length; c++){
            textVertices[c*4*2 + 0] = 0;
            textVertices[c*4*2 + 1] = 0;

            textVertices[c*4*2 + 2] = 0;
            textVertices[c*4*2 + 3] = 0;

            textVertices[c*4*2 + 4] = 0;
            textVertices[c*4*2 + 5] = 0;

            textVertices[c*4*2 + 6] = 0;
            textVertices[c*4*2 + 7] = 0;
        }

        return new Float32Attribute(textVertices, 2);
    }
    static _setupIndices(text){
        const textIndices = new Array(text.length * 6);

        //FOR EVERY CHARACTER OF THE TEXT STRING
        for(let c = 0; c < text.length; c++){
            textIndices[c*6 + 0] = 2*(c*2 + 0) + 0;
            textIndices[c*6 + 1] = 2*(c*2 + 0) + 1;
            textIndices[c*6 + 2] = 2*(c*2 + 1) + 0;

            textIndices[c*6 + 3] = 2*(c*2 + 1) + 1;
            textIndices[c*6 + 4] = 2*(c*2 + 1) + 0;
            textIndices[c*6 + 5] = 2*(c*2 + 0) + 1;
        }

        return new Uint32Attribute(textIndices, 1);
    }
    static _setupUVs(text){
        const textUVs = new Array(text.length * 4 * 2);

        //FOR EVERY CHARACTER OF THE TEXT STRING
        for(let c = 0; c < text.length; c++){
            const character = text.charAt(c);
            const uv_x = (character.charCodeAt() % 16) / 16.0;
            const uv_y = (Math.floor(character.charCodeAt() / 16)) / 16.0;
            const uv_step = 1.0/16.0;

            const uv_up_left = new Vector2(uv_x, 1.0 - uv_y);
            const uv_down_left = new Vector2(uv_x, 1.0 - (uv_y + uv_step));
            const uv_up_right = new Vector2(uv_x + uv_step, 1.0 - uv_y);
            const uv_down_right = new Vector2(uv_x + uv_step, 1.0 - (uv_y + uv_step));


            textUVs[c*4*2 + 0] = uv_up_left.x;
            textUVs[c*4*2 + 1] = uv_up_left.y;

            textUVs[c*4*2 + 2] = uv_down_left.x;
            textUVs[c*4*2 + 3] = uv_down_left.y;

            textUVs[c*4*2 + 4] = uv_up_right.x;
            textUVs[c*4*2 + 5] = uv_up_right.y;

            textUVs[c*4*2 + 6] = uv_down_right.x;
            textUVs[c*4*2 + 7] = uv_down_right.y;
        }

        return new Float32Attribute(textUVs, 2);
    }
    static _assembleMaterial(args){
        const material = new Text2DMaterial();

        material.setAttribute("deltaOffset", Text2D._setupDeltaDirections(args.text, args.fontSize, args.offset));
        // Uniforms aspect and viewport set by MeshRenderer based on actual viewport
        material.setUniform("MODE", args.mode);

        return material;
    }
    static _setupCenterOffsets(text){
        const charCenters = new Array(text.length * 4 * 2);

        for(let c = 0; c < text.length; c++){
            charCenters[c*4*2 + 0] = c;
            charCenters[c*4*2 + 1] = 0;

            charCenters[c*4*2 + 2] = c;
            charCenters[c*4*2 + 3] = 0;

            charCenters[c*4*2 + 4] = c;
            charCenters[c*4*2 + 5] = 0;

            charCenters[c*4*2 + 6] = c;
            charCenters[c*4*2 + 7] = 0;
        }

        return new Float32Attribute(charCenters, 2);
    }
    static _setupPositionIdentifiers(text){
        const charPositionIdentifiers = new Array(text.length * 4 * 2);

        for(let c = 0; c < text.length; c++){
            charPositionIdentifiers[c*4*2 + 0] = -1;
            charPositionIdentifiers[c*4*2 + 1] = +1;

            charPositionIdentifiers[c*4*2 + 2] = -1;
            charPositionIdentifiers[c*4*2 + 3] = -1;

            charPositionIdentifiers[c*4*2 + 4] = +1;
            charPositionIdentifiers[c*4*2 + 5] = +1;

            charPositionIdentifiers[c*4*2 + 6] = +1;
            charPositionIdentifiers[c*4*2 + 7] = -1;
        }

        return new Float32Attribute(charPositionIdentifiers, 2);
    }
    static _setupDeltaDirections(text, fontSize, offset){
        const charDeltaDirections = new Array(text.length * 4 * 2);

        for(let c = 0; c < text.length; c++){
            charDeltaDirections[c*4*2 + 0] = -1*fontSize/2 + c*fontSize + offset.x;
            charDeltaDirections[c*4*2 + 1] = +1*fontSize/2 + 0*fontSize + offset.y;

            charDeltaDirections[c*4*2 + 2] = -1*fontSize/2 + c*fontSize + offset.x;
            charDeltaDirections[c*4*2 + 3] = -1*fontSize/2 + 0*fontSize + offset.y;

            charDeltaDirections[c*4*2 + 4] = +1*fontSize/2 + c*fontSize + offset.x;
            charDeltaDirections[c*4*2 + 5] = +1*fontSize/2 + 0*fontSize + offset.y;

            charDeltaDirections[c*4*2 + 6] = +1*fontSize/2 + c*fontSize + offset.x;
            charDeltaDirections[c*4*2 + 7] = -1*fontSize/2 + 0*fontSize + offset.y;
        }

        return new Float32Attribute(charDeltaDirections, 2);
    }

    setText2D(text, x, y, fontSize){
        const vertices_positions = new Array();
        const vertices_uvs = new Array();

        //FOR EVERY CHARACTER OF THE TEXT STRING
        for(let c = 0; c < text.length; c++){

            //POSITIONs
            const position_up_left = new Vector2(x + c*fontSize, y + fontSize);
            const position_up_right = new Vector2(x + c*fontSize + fontSize, y + fontSize);
            const position_down_left = new Vector2(x + c*fontSize, y);
            const position_down_right = new Vector2(x + c*fontSize + fontSize, y);

            vertices_positions.push(position_up_left.x, position_up_left.y);
            vertices_positions.push(position_down_left.x, position_down_left.y);
            vertices_positions.push(position_up_right.x, position_up_right.y);
            vertices_positions.push(position_up_right.x, position_up_right.y);
            vertices_positions.push(position_down_left.x, position_down_left.y);
            vertices_positions.push(position_down_right.x, position_down_right.y);

            //UVs
            const character = text.charAt(c);
            const uv_x = (character.charCodeAt() % 16) / 16.0;
            const uv_y = (Math.floor(character.charCodeAt() / 16)) / 16.0;
            const uv_step = 1.0/16.0;

            const uv_up_left = new Vector2(uv_x, 1.0 - uv_y);
            const uv_up_right = new Vector2(uv_x + uv_step, 1.0 - uv_y);
            const uv_down_left = new Vector2(uv_x, 1.0 - (uv_y + uv_step));
            const uv_down_right = new Vector2(uv_x + uv_step, 1.0 - (uv_y + uv_step));

            vertices_uvs.push(uv_up_left.x, uv_up_left.y);
            vertices_uvs.push(uv_down_left.x, uv_down_left.y);
            vertices_uvs.push(uv_up_right.x, uv_up_right.y);
            vertices_uvs.push(uv_up_right.x, uv_up_right.y);
            vertices_uvs.push(uv_down_left.x, uv_down_left.y);
            vertices_uvs.push(uv_down_right.x, uv_down_right.y);
        }

        const geometry = new Geometry();
        geometry.vertices = new Float32Attribute(vertices_positions, 2);
        geometry.uv = new Float32Attribute(vertices_uvs, 2);

        return geometry;
    }

}
