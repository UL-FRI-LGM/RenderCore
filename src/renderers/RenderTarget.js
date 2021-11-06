/**
 * Created by Primoz on 25.7.2016.
 */

import {_Math} from '../math/Math.js';
import {Vector4} from '../math/Vector4.js';
import { CubeTexture } from '../textures/CubeTexture.js';
import {Texture} from '../textures/Texture.js';

export class RenderTarget {

	constructor(width, height) {
		this._uuid = _Math.generateUUID();
		this.type = "RenderTarget";

		this._width = (width !== undefined) ? width : 800;
		this._height = (height !== undefined) ? height : 600;

		this._viewport = new Vector4( 0, 0, width, height );

		// Framebuffer color attachments (textures) - Order is important
		this._drawBuffers = [];

		// Depth texture (if null then depth texture wont be fetched)
		this._depthTexture = null;
	}

	get width() {
		return this._width;
	}
	get height() {
		return this._height;
	}
	get depthTexture() {
		return this._depthTexture;
	}

	set width(width) {
		this._width = width;
		// Update viewport
		this._viewport = new Vector4(0, 0, this._width, this._height);
	}
	set height(height) {
		this._height = height;
		// Update viewport
		this._viewport = new Vector4(0, 0, this._width, this._height);
	}

	set depthTexture(texture) {
		this._depthTexture = texture;
	}

	addDepthTexture(isCube) {
		if(isCube){
			this._depthTexture = new CubeTexture({
				textures: undefined,
				wrapS: Texture.ClampToEdgeWrapping,
				wrapT: Texture.ClampToEdgeWrapping,
				wrapR: Texture.ClampToEdgeWrapping,
				minFilter: Texture.NearestFilter,
				magFilter: Texture.NearestFilter,
				internalFormat: Texture.DEPTH_COMPONENT32F,
				format: Texture.DEPTH_COMPONENT,
				type: Texture.FLOAT,
				width: this._width,
				height: this._height
			});
		}else{
			this._depthTexture = new Texture(
				undefined,
				Texture.ClampToEdgeWrapping,
				Texture.ClampToEdgeWrapping,
				Texture.NearestFilter,
				Texture.NearestFilter,
				Texture.DEPTH_COMPONENT32F,
				Texture.DEPTH_COMPONENT,
				Texture.FLOAT,
				this._width,
				this._height
			);

		}
	}

	rmDepthTexture() {
		this._depthTexture = null;
	}

	addDrawBuffer(texture) {
		this._drawBuffers.push(texture);
	}

	rmDrawBuffer(idx) {
		return this._drawBuffers.splice(idx, 1);
	}

	getDrawBuffer(idx) {
		return this._drawBuffers[idx];
	}

	sizeDrawBuffers() {
		return this._drawBuffers.length;
	}

	clearDrawBuffers() {
		this._drawBuffers = [];
	}
};