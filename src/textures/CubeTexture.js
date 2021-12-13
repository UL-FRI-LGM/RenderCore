import {_Math} from '../math/Math.js';
import { Texture } from './Texture.js';


export class CubeTexture extends Texture{

	constructor(args = {}) {
		super(null, args.wrapS, args.wrapT, args.minFilter, args.magFilter, args.internalFormat, args.format, args.type, args.size, args.size);
		this._uuid = _Math.generateUUID();

		this._wrapR = args.wrapR ? args.wrapR : this.ClampToEdgeWrapping;

		this._textures = new Map();

		if(args.textures){
			args.textures["right"] ? this._textures.set("right", args.textures["right"]) : this._textures.set("right", new Texture());
			args.textures["left"] ? this._textures.set("left", args.textures["left"]) : this._textures.set("left", new Texture());
			args.textures["top"] ? this._textures.set("top", args.textures["top"]) : this._textures.set("top", new Texture());
			args.textures["bottom"] ? this._textures.set("bottom", args.textures["bottom"]) : this._textures.set("bottom", new Texture());
			args.textures["front"] ? this._textures.set("front", args.textures["front"]) : this._textures.set("front", new Texture());
			args.textures["back"] ? this._textures.set("back", args.textures["back"]) : this._textures.set("back", new Texture());
		}else if(args.images){
			args.images["right"] ? this._textures.set("right", new Texture(args.images["right"], args.wrapS, args.wrapT, args.minFilter, args.magFilter, args.internalFormat, args.format, args.type, args.size, args.size)) : this._textures.set("right", new Texture());
			args.images["left"] ? this._textures.set("left", new Texture(args.images["left"], args.wrapS, args.wrapT, args.minFilter, args.magFilter, args.internalFormat, args.format, args.type, args.size, args.size)) : this._textures.set("left", new Texture());
			args.images["top"] ? this._textures.set("top", new Texture(args.images["top"], args.wrapS, args.wrapT, args.minFilter, args.magFilter, args.internalFormat, args.format, args.type, args.size, args.size)) : this._textures.set("top", new Texture());
			args.images["bottom"] ? this._textures.set("bottom", new Texture(args.images["bottom"], args.wrapS, args.wrapT, args.minFilter, args.magFilter, args.internalFormat, args.format, args.type, args.size, args.size)) : this._textures.set("bottom", new Texture());
			args.images["front"] ? this._textures.set("front", new Texture(args.images["front"], args.wrapS, args.wrapT, args.minFilter, args.magFilter, args.internalFormat, args.format, args.type, args.size, args.size)) : this._textures.set("front", new Texture());
			args.images["back"] ? this._textures.set("back", new Texture(args.images["back"], args.wrapS, args.wrapT, args.minFilter, args.magFilter, args.internalFormat, args.format, args.type, args.size, args.size)) : this._textures.set("back", new Texture());
		}else{
			this._textures.set("right", new Texture());
			this._textures.set("left", new Texture());
			this._textures.set("top", new Texture());
			this._textures.set("bottom", new Texture());
			this._textures.set("front", new Texture());
			this._textures.set("back", new Texture());
		}
	}


	get wrapR() {
		return this._wrapR;
	}
	set wrapR(value) {
		if (value !== this._wrapR) {
			this._wrapR = value;
			this._dirty = true;
		}
	}
	get textures(){
		return this._textures;
	}
	set textures(textures){
		this._textures = textures;
		this._dirty = true;
	}

	get right(){ return this._textures.get("right"); }
	set right(right){
		this._textures.set("right", right);
		this._dirty = true;
	}
	get left(){ return this._textures.get("left"); }
	set left(left){
		this._textures.set("left", left);
		this._dirty = true;
	}
	get top(){ return this._textures.get("top"); }
	set top(top){
		this._textures.set("top", top);
		this._dirty = true;
	}
	get bottom(){ return this._textures.get("bottom"); }
	set bottom(bottom){
		this._textures.set("bottom", bottom);
		this._dirty = true;
	}
	get front(){ return this._textures.get("front"); }
	set front(front){
		this._textures.set("front", front);
		this._dirty = true;
	}
	get back(){ return this._textures.get("back"); }
	set back(back){
		this._textures.set("back", back);
		this._dirty = true;
	}
};

