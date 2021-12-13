/**
 * Created by Primoz on 26-Nov-16.
 */

import {Texture} from '../textures/Texture.js';

export class RenderPass {

	constructor(type, initialize, preprocess, postprocess, target, viewport, outDepthID = null, outTextures = [], side = 0) {

		/**
		 * Can be either:
		 * RenderPass.BASIC - Requires a preprocess function to return array [Scene, Camera]. Performs basic render pass
		 *                        with the given scene and camera rendering to either Texture or Screen (defined by the target).
		 *
		 * RenderPass.TEXTURE_MERGE - Requires a preprocess function to return array [CustomShaderMaterial, [Texture,..]].
		 *                                It then uses the given CustomShaderMaterial to merge the given textures using (rendering is done on quad).
		 */
		this._type = type;

		/**
		 * This is set to true by RenderQueue after the initialize step is executed.
		 */
		this._isInitialized = false;

		/**
		 * This function is called only once, when the render pass in executed for the first time. In this step you can initialize scene, textures..
		 */
		this._initialize = initialize;

		/**
		 * This function is called before the rendering with two parameters (PreviousRPTextures, PreviousRPData). And it should return
		 * either an object {scene: Scene, camera: Camera} (for RenderPass.BASIC) or {material: CustomShaderMaterial, textures: [Texture,..]} (for RenderPass.TEXTURE_MERGE).
		 */
		this._preprocess = preprocess;

		/**
		 * Postprocessing step.
		 */
		this._postprocess = postprocess;

		/**
		 * Specifies if the render pass should render to texture (RenderPass.TEXTURE) or directly to screen (RenderPass.SCREEN)
		 */
		this._target = target;

		/**
		 * Viewport of render pass
		 */
		this._viewport = viewport;

		/**
		 * String ID to which output texture will be bound. If null is specified as the ID the depth texture will not be rendered.
		 */
		this._outDepthID = outDepthID;

		/**
		 * Array of templates (order important) for output textures, COLOR_ATTACHMENTS (when using target TEXTURE).
		 * Template format:
		 *      {
		 *          id: string,
		 *          textureConfig: {wrapS, WrapT, minFilter, magFilter, internalFormat, format, type}
		 *      }
		 * For the texture config parameters refer to Texture class and
		 * https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D
		 * for format and type explanation.
		 */
		this._outTextures = outTextures;

		this._side = side;
	}

	get type() {
		return this._type;
	}
	get initialize() {
		return this._initialize;
	}
	get preprocess() {
		return this._preprocess;
	}
	get postprocess() {
		return this._postprocess;
	}
	get target() {
		return this._target;
	}
	get viewport() {
		return this._viewport;
	}
	get outDepthID() {
		return this._outDepthID;
	}
	get outTextures() {
		return this._outTextures;
	}
	get side(){
		return this._side;
	}


	set type(value) {
		this._type = value;
	}
	set initialize(value) {
		this._initialize = value;
	}
	set preprocess(value) {
		this._preprocess = value;
	}
	set postprocess(value) {
		this._postprocess = value;
	}
	set target(value) {
		this._target = value;
	}
	set viewport(value) {
		this._viewport = value;
	}
	set outDepthID(value) {
		if (this._type === RenderPass.SCREEN) {
			console.warn("Warning: Setting output depth texture to RenderPass that renders to screen!")
		}

		this._outDepthID = value;
	}
	set outTextures(value) {
		if (this._type === RenderPass.SCREEN) {
			console.warn("Warning: Setting output color textures to RenderPass that renders to screen!")
		}

		this._outTextures = value;
	}
	set side(side){
		this._side = side;
	}
};

// Render pass types
RenderPass.BASIC = 0;
RenderPass.TEXTURE_MERGE = 1;
RenderPass.POSTPROCESS = 2;

// Render pass target
RenderPass.TEXTURE = 3;
RenderPass.TEXTURE_CUBE_MAP = 3.2;
RenderPass.SCREEN = 4;


RenderPass.DEFAULT_R8_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.LinearFilter,
	magFilter: Texture.LinearFilter,
	internalFormat: Texture.R8,
	format: Texture.RED,
	type: Texture.UNSIGNED_BYTE,
	clearFunction: 3
};
RenderPass.DEFAULT_R32I_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.LinearFilter,
	magFilter: Texture.LinearFilter,
	internalFormat: Texture.R32I,
	format: Texture.RED,
	type: Texture.INT
};
RenderPass.DEFAULT_R32UI_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.LinearFilter,
	magFilter: Texture.LinearFilter,
	internalFormat: Texture.R32UI,
	format: Texture.RED_INTEGER,
	type: Texture.UNSIGNED_INT,
	clearFunction: 1
};
RenderPass.DEFAULT_RGB_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.LinearFilter,
	magFilter: Texture.LinearFilter,
	internalFormat: Texture.RGB,
	format: Texture.RGB,
	type: Texture.UNSIGNED_BYTE
};

RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.LinearFilter,
	magFilter: Texture.LinearFilter,
	internalFormat: Texture.RGBA,
	format: Texture.RGBA,
	type: Texture.UNSIGNED_BYTE,
	clearFunction: 128
};

RenderPass.DEFAULT_RGBA_NEAREST_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.NearestFilter,
	magFilter: Texture.NearestFilter,
	internalFormat: Texture.RGBA,
	format: Texture.RGBA,
	type: Texture.UNSIGNED_BYTE
};


//16F (HALF FLOAT)
RenderPass.DEFAULT_R16F_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.LinearFilter,
	magFilter: Texture.LinearFilter,
	internalFormat: Texture.R16F,
	format: Texture.RED,
	type: Texture.HALF_FLOAT
};
RenderPass.DEFAULT_R16F_TEXTURE_CUBE_MAP_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	wrapR: Texture.ClampToEdgeWrapping,
	minFilter: Texture.LinearFilter,
	magFilter: Texture.LinearFilter,
	internalFormat: Texture.R16F,
	format: Texture.RED,
	type: Texture.HALF_FLOAT,
	clearFunction: 128
};
RenderPass.NEAREST_R16F_TEXTURE_CUBE_MAP_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	wrapR: Texture.ClampToEdgeWrapping,
	minFilter: Texture.NearestFilter,
	magFilter: Texture.NearestFilter,
	internalFormat: Texture.R16F,
	format: Texture.RED,
	type: Texture.HALF_FLOAT,
	clearFunction: 128
};
RenderPass.DEFAULT_RGB16F_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.LinearFilter,
	magFilter: Texture.LinearFilter,
	internalFormat: Texture.RGB16F,
	format: Texture.RGBA,
	type: Texture.HALF_FLOAT
};
RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.LinearFilter,
	magFilter: Texture.LinearFilter,
	internalFormat: Texture.RGBA16F,
	format: Texture.RGBA,
	type: Texture.HALF_FLOAT,
	clearFunction: 128
};
RenderPass.NEAREST_RGBA16F_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.NearestFilter,
	magFilter: Texture.NearestFilter,
	internalFormat: Texture.RGBA16F,
	format: Texture.RGBA,
	type: Texture.HALF_FLOAT,
	clearFunction: 128
};

RenderPass.FLOAT_RGB_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.LinearFilter,
	magFilter: Texture.LinearFilter,
	internalFormat: Texture.RGBA16F,
	format: Texture.RGBA,
	type: Texture.HALF_FLOAT
};

RenderPass.FULL_FLOAT_RGB_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.LinearFilter,
	magFilter: Texture.LinearFilter,
	internalFormat: Texture.RGBA16F,
	format: Texture.RGBA,
	type: Texture.FLOAT
};

RenderPass.FULL_FLOAT_RGB_NEAREST_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.NearestFilter,
	magFilter: Texture.NearestFilter,
	internalFormat: Texture.RGBA16F,
	format: Texture.RGBA,
	type: Texture.FLOAT
};

//32F
RenderPass.FULL_FLOAT_R32F_TEXTURE_CONFIG = {
	wrapS: Texture.ClampToEdgeWrapping,
	wrapT: Texture.ClampToEdgeWrapping,
	minFilter: Texture.LinearFilter,
	magFilter: Texture.LinearFilter,
	internalFormat: Texture.R32F,
	format: Texture.RED,
	type: Texture.FLOAT
};
