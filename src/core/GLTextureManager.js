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


		this._defaultTexture = new Texture(
			null,
			Texture.ClampToEdgeWrapping,
			Texture.ClampToEdgeWrapping,
			Texture.NearestFilter,
			Texture.NearestFilter,
			Texture.DEPTH_COMPONENT32F,
			Texture.DEPTH_COMPONENT,
			Texture.FLOAT,
			1,
			1
		);
		this.updateTexture(this._defaultTexture, false);
		
		this._defaultCubeTexture = new CubeTexture({
			textures: null,
			wrapS: Texture.ClampToEdgeWrapping,
			wrapT: Texture.ClampToEdgeWrapping,
			wrapR: Texture.ClampToEdgeWrapping,
			minFilter: Texture.NearestFilter,
			magFilter: Texture.NearestFilter,
			internalFormat: Texture.DEPTH_COMPONENT32F,
			format: Texture.DEPTH_COMPONENT,
			type: Texture.FLOAT,
			size: 1
		});
		this.updateCubeTexture(this._defaultCubeTexture, false);
	}

	updateTexture(texture, isRTT) {
		texture.idleTime = 0;


		let newTexture = false;

		// Check if the texture is already created and cached
		let glTexture = this._cached_textures.get(texture);

		// If texture was not found, create a new one and add it to the cached textures
		if (glTexture === undefined) {
			glTexture = this._gl.createTexture();
			this._cached_textures.set(texture, glTexture);
			newTexture = true;
		}

		// Check if the texture needs to be updated
		if (!texture.dirty && !newTexture) {
				return glTexture;
		}

		this._gl.bindTexture(this._gl.TEXTURE_2D, glTexture);

		if (texture.flipy) {
			this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, true);
		}

		// Parse texture data
		let internalFormat = this._formatToGL(texture._internalFormat);
		let format = this._formatToGL(texture._format);
		let magFilter = this._magFilterToGL(texture._magFilter);
		let minFilter = this._minFilterToGL(texture._minFilter);
		let wrapS = this._wrapToGL(texture._wrapS);
		let wrapT = this._wrapToGL(texture._wrapT);
		let type = this._typeToGL(texture._type);
		let width = texture._width;
		let height = texture._height;

		// Filters
		this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, magFilter);
		this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, minFilter);

		// Wrapping
		this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, wrapS);
		this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, wrapT);

		// If this texture is not a part of the RTT, load it from the image and unbind the texture.
		if (!isRTT) {
			// Normal texture
			if (texture.image === null) {
				this._gl.texImage2D(this._gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
				//this.clearBoundTexture();
			}
			else if(this._gl.getParameter(this._gl.VERSION).includes("WebGL 2.0")) {
				this._gl.texImage2D(this._gl.TEXTURE_2D, 0, internalFormat, texture.width, texture.height, 0, format, type, texture.image);
			}
			else{
				this._gl.texImage2D(this._gl.TEXTURE_2D, 0, internalFormat, format, type, texture.image);
			}
		}
		// Otherwise create empty texture (width * height) and leave the texture unbinding to function caller
		else {
			// RTT texture
			this._gl.texImage2D(this._gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
		}

		// Generate mipmaps
		if (texture._generateMipmaps) {
				this._gl.generateMipmap(this._gl.TEXTURE_2D);
		}

		if (texture.flipy) {
			this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, false);
		}

		this._gl.bindTexture(this._gl.TEXTURE_2D, null);

		texture._dirty = false;

		// Return created WebGL Texture
		return glTexture;
	}

	updateCubeTexture(texture, isRTT = false) {
		texture.idleTime = 0;


		let newTexture = false;

		// Check if the texture is already created and cached
		let glTexture = this._cached_textures.get(texture);

		// If texture was not found, create a new one and add it to the cached textures
		if (glTexture === undefined) {
				glTexture = this._gl.createTexture();
				this._cached_textures.set(texture, glTexture);
				newTexture = true;
		}

		// Check if the texture needs to be updated
		if (!texture.dirty && !newTexture) {
				return glTexture;
		}

		this._gl.bindTexture(this._gl.TEXTURE_CUBE_MAP, glTexture);

		this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, false);

		// Parse texture data
		let internalFormat = this._formatToGL(texture._internalFormat);
		let format = this._formatToGL(texture._format);
		let magFilter = this._magFilterToGL(texture._magFilter);
		let minFilter = this._minFilterToGL(texture._minFilter);
		let wrapS = this._wrapToGL(texture._wrapS);
		let wrapT = this._wrapToGL(texture._wrapT);
		let wrapR = this._wrapToGL(texture._wrapR);

		let type = this._typeToGL(texture._type);
		let width = texture._width;
		let height = texture._height;

		// Filters
		this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_MAG_FILTER, magFilter);
		this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_MIN_FILTER, minFilter);

		// Wrapping
		this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_WRAP_S, wrapS);
		this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_WRAP_T, wrapT);
		this._gl.texParameteri(this._gl.TEXTURE_CUBE_MAP, this._gl.TEXTURE_WRAP_R, wrapR);

		// If this texture is not a part of the RTT, load it from the image and unbind the texture.
		if (!isRTT) {
			// Normal texture
			if (texture.images === null) {
				const size = Math.min(width, height);

				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, internalFormat, size, size, 0, format, type, null);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, internalFormat, size, size, 0, format, type, null);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, internalFormat, size, size, 0, format, type, null);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, internalFormat, size, size, 0, format, type, null);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, internalFormat, size, size, 0, format, type, null);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, internalFormat, size, size, 0, format, type, null);
			}
			else if(this._gl.getParameter(this._gl.VERSION).includes("WebGL 2.0")) {
				const size = Math.min(texture.width, texture.height);

				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, internalFormat, size, size, 0, format, type, texture.images.right);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, internalFormat, size, size, 0, format, type, texture.images.left);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, internalFormat, size, size, 0, format, type, texture.images.top);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, internalFormat, size, size, 0, format, type, texture.images.bottom);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, internalFormat, size, size, 0, format, type, texture.images.front);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, internalFormat, size, size, 0, format, type, texture.images.back);
			}
			else{
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, internalFormat, format, type, texture.images.right);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, internalFormat, format, type, texture.images.left);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, internalFormat, format, type, texture.images.top);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, internalFormat, format, type, texture.images.bottom);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, internalFormat, format, type, texture.images.front);
				this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, internalFormat, format, type, texture.images.back);
			}
		}
		// Otherwise create empty texture (width * height) and leave the texture unbinding to function caller
		else {
			// RTT texture
			const size = Math.min(width, height);

			this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, internalFormat, size, size, 0, format, type, null);
			this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, internalFormat, size, size, 0, format, type, null);
			this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, internalFormat, size, size, 0, format, type, null);
			this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, internalFormat, size, size, 0, format, type, null);
			this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, internalFormat, size, size, 0, format, type, null);
			this._gl.texImage2D(this._gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, internalFormat, size, size, 0, format, type, null);
		}


		// Generate mipmaps
		if (texture._generateMipmaps) {
			this._gl.generateMipmap(this._gl.TEXTURE_CUBE_MAP);
		}


		this._gl.bindTexture(this._gl.TEXTURE_CUBE_MAP, null);


		texture._dirty = false;

		// Return created WebGL Texture
		return glTexture;
	}

	getTexture(reference) {
		reference.idleTime = 0;

		if(this._cached_textures.has(reference)){
			return this._cached_textures.get(reference);
		}else{
			//console.warn("Warning: Texture reference not found: [" + reference + "]!");

			return this._cached_textures.get(this._defaultTexture);
		}
	}
	getCubeTexture(reference) {
		reference.idleTime = 0;

		if(this._cached_textures.has(reference)){
			return this._cached_textures.get(reference);
		}else{
			//console.warn("Warning: Cube texture reference not found: [" + reference + "]!");

			return this._cached_textures.get(this._defaultCubeTexture);
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
		this._cached_textures.delete(texture);
		this._gl.deleteTexture(glTexture);

		texture.dirty = true;
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
			case Texture.R8:
				return this._gl.R8;
				break;
			case Texture.RED:
				return this._gl.RED;
				break;
			case Texture.RED_INTEGER:
				return this._gl.RED_INTEGER;
				break;
			case Texture.RGBA:
				return this._gl.RGBA;
				break;
			case Texture.RGB:
				return this._gl.RGB;
				break;
			case Texture.ALPHA:
				return this._gl.ALPHA;
				break;
			case Texture.LUMINANCE:
				return this._gl.LUMINANCE;
				break;
			case Texture.LUMINANCE_ALPHA:
				return this._gl.LUMINANCE_ALPHA;
				break;
			case Texture.DEPTH_COMPONENT:
				return this._gl.DEPTH_COMPONENT;
				break;
			case Texture.DEPTH_COMPONENT24:
				return this._gl.DEPTH_COMPONENT24;
				break;
			case Texture.DEPTH_COMPONENT32F:
				return this._gl.DEPTH_COMPONENT32F;
				break;
			case Texture.RGB16F:
				return this._gl.RGB16F;
				break;
			case Texture.RGB32F:
				return this._gl.RGB32F;
				break;
			case Texture.RGBA16F:
				return this._gl.RGBA16F;
				break;
			case Texture.RGBA32F:
				return this._gl.RGBA32F;
				break;
			case Texture.R16F:
				return this._gl.R16F;
				break;
			case Texture.R32F:
				return this._gl.R32F;
				break;
			case Texture.R32I:
				return this._gl.R32I;
				break;
			case Texture.R32UI:
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
			case Texture.NearestFilter:
				return this._gl.NEAREST;
				break;
			case Texture.LinearFilter:
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
			case Texture.NearestFilter:
				return this._gl.NEAREST;
				break;
			case Texture.LinearFilter:
				return this._gl.LINEAR;
				break;
			case Texture.NearestMipMapNearestFilter:
				return this._gl.NEAREST_MIPMAP_NEAREST;
				break;
			case Texture.NearestMipMapLinearFilter:
				return this._gl.NEAREST_MIPMAP_LINEAR;
				break;
			case Texture.LinearMipMapNearestFilter:
				return this._gl.LINEAR_MIPMAP_NEAREST;
				break;
			case Texture.LinearMipMapLinearFilter:
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
			case Texture.RepeatWrapping:
				return this._gl.REPEAT;
				break;
			case Texture.ClampToEdgeWrapping:
				return this._gl.CLAMP_TO_EDGE;
				break;
			case Texture.MirroredRepeatWrapping:
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
			case Texture.UNSIGNED_BYTE:
				return this._gl.UNSIGNED_BYTE;
				break;
			case Texture.UNSIGNED_INT_24_8:
				return this._gl.UNSIGNED_INT_24_8;
				break;
			case Texture.UNSIGNED_SHORT:
				return this._gl.UNSIGNED_SHORT;
				break;
			case Texture.UNSIGNED_INT:
				return this._gl.UNSIGNED_INT;
				break;
			case Texture.INT:
				return this._gl.INT;
				break;
			case Texture.FLOAT:
				return this._gl.FLOAT;
				break;
			case Texture.HALF_FLOAT:
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
