/**
 * Created by Primoz on 25. 07. 2016.
 */
import {Texture} from '../textures/Texture.js'
import { CubeTexture } from '../RenderCore.js';


export class GLTextureManager {

	/**
	 * @param {WebGLRenderingContext} gl WebGL rendering context used for buffer allocation.
	 */
	constructor(gl) {
		this._gl = gl;
		this._cached_textures = new Map();

		this._colorClearFramebuffer = this._gl.createFramebuffer();
	}


	_createGLTexture(texture){
		const internalFormat = this._formatToGL(texture._internalFormat);
		const format = this._formatToGL(texture._format);
		const magFilter = this._magFilterToGL(texture._magFilter);
		const minFilter = this._minFilterToGL(texture._minFilter);
		const wrapS = this._wrapToGL(texture._wrapS);
		const wrapT = this._wrapToGL(texture._wrapT);
		const type = this._typeToGL(texture._type);
		const width = texture._width;
		const height = texture._height;

		const glTexture = this._gl.createTexture();
		this._gl.bindTexture(this._gl.TEXTURE_2D, glTexture);
		this._gl.texImage2D(this._gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null); //allocation

		this._cached_textures.set(texture, glTexture);


		return glTexture;
	}

	_updateTexture(texture){
		if(!texture.image) console.error(texture);
		const glTexture = this._cached_textures.get(texture);

		const internalFormat = this._formatToGL(texture._internalFormat);
		const format = this._formatToGL(texture._format);
		const magFilter = this._magFilterToGL(texture._magFilter);
		const minFilter = this._minFilterToGL(texture._minFilter);
		const wrapS = this._wrapToGL(texture._wrapS);
		const wrapT = this._wrapToGL(texture._wrapT);
		const type = this._typeToGL(texture._type);
		const width = texture._width;
		const height = texture._height;

		this._gl.bindTexture(this._gl.TEXTURE_2D, glTexture);
		// Filters
		this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, magFilter);
		this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, minFilter);
		// Wrapping
		this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, wrapS);
		this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, wrapT);

		this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, texture.flipy);
		// this._gl.texImage2D(this._gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, texture.image);
		this._gl.texSubImage2D(this._gl.TEXTURE_2D, 0, 0, 0, width, height, format, type, texture.image);
		this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, false);

		// Generate mipmaps
		if (texture._generateMipmaps) {
				this._gl.generateMipmap(this._gl.TEXTURE_2D);
		}


		texture.dirty = false;
	}
	// updateTexture(texture, isRTT) {
	// 	texture.idleTime = 0;


	// 	let newTexture = false;

	// 	// Check if the texture is already created and cached
	// 	let glTexture = this._cached_textures.get(texture);

	// 	// If texture was not found, create a new one and add it to the cached textures
	// 	if (glTexture === undefined) {
	// 		glTexture = this._gl.createTexture();
	// 		this._cached_textures.set(texture, glTexture);
	// 		newTexture = true;
	// 	}

	// 	// Check if the texture needs to be updated
	// 	if (!texture.dirty && !newTexture) {
	// 			return glTexture;
	// 	}

	// 	this._gl.bindTexture(this._gl.TEXTURE_2D, glTexture);

	// 	if (texture.flipy) {
	// 		this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, true);
	// 	}

	// 	// Parse texture data
	// 	const internalFormat = this._formatToGL(texture._internalFormat);
	// 	const format = this._formatToGL(texture._format);
	// 	const magFilter = this._magFilterToGL(texture._magFilter);
	// 	const minFilter = this._minFilterToGL(texture._minFilter);
	// 	const wrapS = this._wrapToGL(texture._wrapS);
	// 	const wrapT = this._wrapToGL(texture._wrapT);
	// 	const type = this._typeToGL(texture._type);
	// 	const width = texture._width;
	// 	const height = texture._height;

	// 	// Filters
	// 	this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, magFilter);
	// 	this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, minFilter);

	// 	// Wrapping
	// 	this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, wrapS);
	// 	this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, wrapT);

	// 	if (!isRTT && texture.image !== null) {
	// 		// Normal texture // If this texture is not a part of the RTT, load it from the image and unbind the texture.
	// 		this._gl.texImage2D(this._gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, texture.image);
	// 	} else {
	// 		// RTT texture // Otherwise create empty texture (width * height) and leave the texture unbinding to function caller
	// 		this._gl.texImage2D(this._gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
	// 	}

	// 	// Generate mipmaps
	// 	if (texture._generateMipmaps) {
	// 			this._gl.generateMipmap(this._gl.TEXTURE_2D);
	// 	}

	// 	if (texture.flipy) {
	// 		this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, false);
	// 	}

	// 	this._gl.bindTexture(this._gl.TEXTURE_2D, null);

	// 	texture.dirty = false;

	// 	// Return created WebGL Texture
	// 	return glTexture;
	// }

	_createGLCubeTexture(texture){
		const internalFormat = this._formatToGL(texture._internalFormat);
		const format = this._formatToGL(texture._format);
		const magFilter = this._magFilterToGL(texture._magFilter);
		const minFilter = this._minFilterToGL(texture._minFilter);
		const wrapS = this._wrapToGL(texture._wrapS);
		const wrapT = this._wrapToGL(texture._wrapT);
		const wrapR = this._wrapToGL(texture._wrapR);
		const type = this._typeToGL(texture._type);
		const width = texture._width;
		const height = texture._height;
		const size = Math.min(width, height);

		const glTexture = this._gl.createTexture();
		this._gl.bindTexture(this._gl.TEXTURE_CUBE_MAP, glTexture);
		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, internalFormat, size, size, 0, format, type, null); //allocation
		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, internalFormat, size, size, 0, format, type, null);
		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, internalFormat, size, size, 0, format, type, null);
		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, internalFormat, size, size, 0, format, type, null);
		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, internalFormat, size, size, 0, format, type, null);
		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, internalFormat, size, size, 0, format, type, null);

		this._cached_textures.set(texture, glTexture);


		return glTexture;
	}
	_updateCubeTexture(texture){
		if(!texture.image) console.error(texture);
		const glTexture = this._cached_textures.get(texture);

		const internalFormat = this._formatToGL(texture._internalFormat);
		const format = this._formatToGL(texture._format);
		const magFilter = this._magFilterToGL(texture._magFilter);
		const minFilter = this._minFilterToGL(texture._minFilter);
		const wrapS = this._wrapToGL(texture._wrapS);
		const wrapT = this._wrapToGL(texture._wrapT);
		const wrapR = this._wrapToGL(texture._wrapR);
		const type = this._typeToGL(texture._type);
		const width = texture._width;
		const height = texture._height;
		const size = Math.min(width, height);

		this._gl.bindTexture(this._gl.TEXTURE_CUBE_MAP, glTexture);
		// Filters
		this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_MAG_FILTER, magFilter);
		this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_MIN_FILTER, minFilter);

		// Wrapping
		this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_WRAP_S, wrapS);
		this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_WRAP_T, wrapT);
		this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_WRAP_R, wrapR);

		this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, texture.flipy);
		// this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, internalFormat, size, size, 0, format, type, texture.images.right);
		// this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, internalFormat, size, size, 0, format, type, texture.images.left);
		// this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, internalFormat, size, size, 0, format, type, texture.images.top);
		// this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, internalFormat, size, size, 0, format, type, texture.images.bottom);
		// this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, internalFormat, size, size, 0, format, type, texture.images.front);
		// this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, internalFormat, size, size, 0, format, type, texture.images.back);
		this._gl.texSubImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, 0, 0, size, size, format, type, texture.images.right);
		this._gl.texSubImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, 0, 0, size, size, format, type, texture.images.left);
		this._gl.texSubImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, 0, 0, size, size, format, type, texture.images.top);
		this._gl.texSubImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, 0, 0, size, size, format, type, texture.images.bottom);
		this._gl.texSubImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, 0, 0, size, size, format, type, texture.images.front);
		this._gl.texSubImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, 0, 0, size, size, format, type, texture.images.back);
		this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, false);

		// Generate mipmaps
		if (texture._generateMipmaps) {
			this._gl.generateMipmap(this._gl.TEXTURE_CUBE_MAP);
		}


		texture.dirty = false;
	}
	// updateCubeTexture(texture, isRTT = false) {
	// 	texture.idleTime = 0;


	// 	let newTexture = false;

	// 	// Check if the texture is already created and cached
	// 	let glTexture = this._cached_textures.get(texture);

	// 	// If texture was not found, create a new one and add it to the cached textures
	// 	if (glTexture === undefined) {
	// 			glTexture = this._gl.createTexture();
	// 			this._cached_textures.set(texture, glTexture);
	// 			newTexture = true;
	// 	}

	// 	// Check if the texture needs to be updated
	// 	if (!texture.dirty && !newTexture) {
	// 			return glTexture;
	// 	}

	// 	this._gl.bindTexture(this._gl.TEXTURE_CUBE_MAP, glTexture);

	// 	this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, false);

	// 	// Parse texture data
	// 	const internalFormat = this._formatToGL(texture._internalFormat);
	// 	const format = this._formatToGL(texture._format);
	// 	const magFilter = this._magFilterToGL(texture._magFilter);
	// 	const minFilter = this._minFilterToGL(texture._minFilter);
	// 	const wrapS = this._wrapToGL(texture._wrapS);
	// 	const wrapT = this._wrapToGL(texture._wrapT);
	// 	const wrapR = this._wrapToGL(texture._wrapR);
	// 	const type = this._typeToGL(texture._type);
	// 	const width = texture._width;
	// 	const height = texture._height;
	// 	const size = Math.min(width, height);

	// 	// Filters
	// 	this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_MAG_FILTER, magFilter);
	// 	this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_MIN_FILTER, minFilter);

	// 	// Wrapping
	// 	this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_WRAP_S, wrapS);
	// 	this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_WRAP_T, wrapT);
	// 	this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_WRAP_R, wrapR);

	// 	if (!isRTT && texture.images !== null) {
	// 		// Normal texture // If this texture is not a part of the RTT, load it from the image and unbind the texture.
	// 		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, internalFormat, size, size, 0, format, type, texture.images.right);
	// 		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, internalFormat, size, size, 0, format, type, texture.images.left);
	// 		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, internalFormat, size, size, 0, format, type, texture.images.top);
	// 		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, internalFormat, size, size, 0, format, type, texture.images.bottom);
	// 		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, internalFormat, size, size, 0, format, type, texture.images.front);
	// 		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, internalFormat, size, size, 0, format, type, texture.images.back);
	// 	} else {
	// 		// RTT texture // Otherwise create empty texture (width * height) and leave the texture unbinding to function caller
	// 		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, internalFormat, size, size, 0, format, type, null);
	// 		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, internalFormat, size, size, 0, format, type, null);
	// 		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, internalFormat, size, size, 0, format, type, null);
	// 		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, internalFormat, size, size, 0, format, type, null);
	// 		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, internalFormat, size, size, 0, format, type, null);
	// 		this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, internalFormat, size, size, 0, format, type, null);
	// 	}


	// 	// Generate mipmaps
	// 	if (texture._generateMipmaps) {
	// 		this._gl.generateMipmap(this._gl.TEXTURE_CUBE_MAP);
	// 	}


	// 	this._gl.bindTexture(this._gl.TEXTURE_CUBE_MAP, null);


	// 	texture.dirty = false;

	// 	// Return created WebGL Texture
	// 	return glTexture;
	// }

	getGLTexture(texture) {
		texture.idleTime = 0;

		if(this._cached_textures.has(texture)){
			const glTexture = this._cached_textures.get(texture);
			if(texture.dirty) this._updateTexture(texture);


			return glTexture; 
		}else{
			//console.warn("Warning: Texture texture not found: [" + texture + "]!");
			const glTexture = this._createGLTexture(texture);
			if(texture.dirty) this._updateTexture(texture);


			return glTexture;
		}
	}
	getGLCubeTexture(texture) {
		texture.idleTime = 0;

		if(this._cached_textures.has(texture)){
			const glCubeTexture = this._cached_textures.get(texture);
			if(texture.dirty) this._updateCubeTexture(texture);


			return glCubeTexture; 
		}else{
			//console.warn("Warning: Cube texture texture not found: [" + texture + "]!");
			const glCubeTexture = this._createGLCubeTexture(texture);
			if(texture.dirty) this._updateCubeTexture(texture);


			return glCubeTexture;
		}
	}

	clearBoundTexture() {
		// Clear texture color
		let currentFramebuffer = this._gl.getParameter(this._gl.DRAW_FRAMEBUFFER_BINDING);
		let currentClearColor = this._gl.getParameter(this._gl.COLOR_CLEAR_VALUE);

		this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._colorClearFramebuffer);
		this._gl.framebufferTexture2D(this._gl.FRAMEBUFFER, this._gl.COLOR_ATTACHMENT0, this._gl.TEXTURE_2D, glTexture, 0);
		this._gl.drawBuffers([this._gl.COLOR_ATTACHMENT0]);

		this._gl.clearColor(0, 0, 0, 0);
		this._gl.clear(this._gl.COLOR_BUFFER_BIT);

		this._gl.framebufferTexture2D(this._gl.FRAMEBUFFER, this._gl.COLOR_ATTACHMENT0, this._gl.TEXTURE_2D, null, 0);
		this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, currentFramebuffer);
		this._gl.clearColor(currentClearColor[0], currentClearColor[1], currentClearColor[2], currentClearColor[3]);
	}

	deleteTexture(texture, glTexture) {
		texture.dirty = true;
		this._cached_textures.delete(texture);
		this._gl.deleteTexture(glTexture);
	}
	deleteTextures(checkIdleTime = false, idleTimeDelta = 1000) {
		// Delete all cached textures
		if(checkIdleTime){
			for (const [key_texture, val_glTexture] of this._cached_textures) {
				if(key_texture.idleTime >= idleTimeDelta) this.deleteTexture(key_texture, val_glTexture);
			}
		}else{
			for (const [key_texture, val_glTexture] of this._cached_textures) {
				this.deleteTexture(key_texture, val_glTexture);
			}
		}
	}

	incrementTime(){
		for (const [key_texture, val_glTexture] of this._cached_textures) {
			key_texture.idleTime = key_texture.idleTime + 1;
		}
	}

	// region CONSTANT CONVERSION
	_formatToGL(format) {
		switch (format) {
			case Texture.FORMAT.R8:
				return this._gl.R8;
				break;
			case Texture.FORMAT.RED:
				return this._gl.RED;
				break;
			case Texture.FORMAT.RED_INTEGER:
				return this._gl.RED_INTEGER;
				break;
			case Texture.FORMAT.RGBA:
				return this._gl.RGBA;
				break;
			case Texture.FORMAT.RGB:
				return this._gl.RGB;
				break;
			case Texture.FORMAT.ALPHA:
				return this._gl.ALPHA;
				break;
			case Texture.FORMAT.LUMINANCE:
				return this._gl.LUMINANCE;
				break;
			case Texture.FORMAT.LUMINANCE_ALPHA:
				return this._gl.LUMINANCE_ALPHA;
				break;
			case Texture.FORMAT.DEPTH_COMPONENT:
				return this._gl.DEPTH_COMPONENT;
				break;
			case Texture.FORMAT.DEPTH_COMPONENT24:
				return this._gl.DEPTH_COMPONENT24;
				break;
			case Texture.FORMAT.DEPTH_COMPONENT32F:
				return this._gl.DEPTH_COMPONENT32F;
				break;
			case Texture.FORMAT.RGB16F:
				return this._gl.RGB16F;
				break;
			case Texture.FORMAT.RGB32F:
				return this._gl.RGB32F;
				break;
			case Texture.FORMAT.RGBA16F:
				return this._gl.RGBA16F;
				break;
			case Texture.FORMAT.RGBA32F:
				return this._gl.RGBA32F;
				break;
			case Texture.FORMAT.R16F:
				return this._gl.R16F;
				break;
			case Texture.FORMAT.R32F:
				return this._gl.R32F;
				break;
			case Texture.FORMAT.R32I:
				return this._gl.R32I;
				break;
			case Texture.FORMAT.R32UI:
				return this._gl.R32UI;
				break;
			default:
				console.warn("Warning: Received unsupported texture format: [" + format + "]!");
				return this._gl.RGBA;
				break;
		}

	}

	_magFilterToGL(filter) {
		switch (filter) {
			case Texture.FILTER.NearestFilter:
				return this._gl.NEAREST;
				break;
			case Texture.FILTER.LinearFilter:
				return this._gl.LINEAR;
				break;
			default:
				console.warn("Warning: Received unsupported texture filter: [" + filter + "]!");
				return this._gl.LINEAR;
				break;
		}
	}

	_minFilterToGL(filter) {
		switch (filter) {
			case Texture.FILTER.NearestFilter:
				return this._gl.NEAREST;
				break;
			case Texture.FILTER.LinearFilter:
				return this._gl.LINEAR;
				break;
			case Texture.FILTER.NearestMipMapNearestFilter:
				return this._gl.NEAREST_MIPMAP_NEAREST;
				break;
			case Texture.FILTER.NearestMipMapLinearFilter:
				return this._gl.NEAREST_MIPMAP_LINEAR;
				break;
			case Texture.FILTER.LinearMipMapNearestFilter:
				return this._gl.LINEAR_MIPMAP_NEAREST;
				break;
			case Texture.FILTER.LinearMipMapLinearFilter:
				return this._gl.LINEAR_MIPMAP_LINEAR;
				break;
			default:
				console.warn("Warning: Received unsupported texture filter: [" + filter + "]!");
				return this._gl.LINEAR;
				break;
		}
	}

	_wrapToGL(wrap) {
		switch (wrap) {
			case Texture.WRAPPING.RepeatWrapping:
				return this._gl.REPEAT;
				break;
			case Texture.WRAPPING.ClampToEdgeWrapping:
				return this._gl.CLAMP_TO_EDGE;
				break;
			case Texture.WRAPPING.MirroredRepeatWrapping:
				return this._gl.MIRRORED_REPEAT;
				break;
			default:
				console.warn("Warning: Received unsupported texture wrap: [" + wrap + "]!");
				return this._gl.CLAMP_TO_EDGE;
				break;
		}
	}

	_typeToGL(type) {
		switch (type) {
			case Texture.TYPE.UNSIGNED_BYTE:
				return this._gl.UNSIGNED_BYTE;
				break;
			case Texture.TYPE.UNSIGNED_INT_24_8:
				return this._gl.UNSIGNED_INT_24_8;
				break;
			case Texture.TYPE.UNSIGNED_SHORT:
				return this._gl.UNSIGNED_SHORT;
				break;
			case Texture.TYPE.UNSIGNED_INT:
				return this._gl.UNSIGNED_INT;
				break;
			case Texture.TYPE.INT:
				return this._gl.INT;
				break;
			case Texture.TYPE.FLOAT:
				return this._gl.FLOAT;
				break;
			case Texture.TYPE.HALF_FLOAT:
				return this._gl.HALF_FLOAT;
				break;
			default:
				console.warn("Warning: Received unsupported texture type: [" + type + "] (using default)!");
				return this._gl.UNSIGNED_BYTE;
				break;
		}
	}
	// endregion
};
