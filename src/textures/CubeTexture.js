import {_Math} from '../math/Math.js';
import { Texture } from './Texture.js';


export class CubeTexture extends Texture{
	static DEFAULT_IMAGES = {
		right: null,
		left: null,
		top: null,
		bottom: null,
		front: null,
		back: null
	};


	constructor(args = {}) {
		super(null, args.wrapS, args.wrapT, args.minFilter, args.magFilter, args.internalFormat, args.format, args.type, args.size, args.size);
		
		
		this._uuid = _Math.generateUUID();

		this._wrapR = (args.wrapR !== undefined) ? args.wrapR : Texture.WRAPPING.ClampToEdgeWrapping;

		this.images = (args.images !== undefined) ? args.images : CubeTexture.DEFAULT_IMAGES;
		this.flipy = false;
	}


	get images(){ return this._images; }
	set images(images){
		this._images = images;
		this._dirty = true;
	}

	get wrapR() { return this._wrapR; }
	set wrapR(value) {
		if (value !== this._wrapR) {
			this._wrapR = value;
			this._dirty = true;
		}
	}


	applyConfig(texConfig) {
		super.applyConfig(texConfig);

		this.wrapR = texConfig.wrapR;
	}
};

