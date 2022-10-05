/**
 * Created by Primoz on 26-Nov-16.
 */

import {Scene} from '../core/Scene.js';
import {Quad} from '../objects/Quad.js';
import {Camera} from '../cameras/Camera.js';
import {OrthographicCamera} from '../cameras/OrthographicCamera.js';
import {Texture} from '../textures/Texture.js';
import {MeshBasicMaterial} from '../materials/MeshBasicMaterial.js';
import {CustomShaderMaterial} from '../materials/CustomShaderMaterial.js';
import {RenderTarget} from './RenderTarget.js';
import {RenderPass} from './RenderPass.js';
import {Vector2} from '../math/Vector2.js';
import {_Math} from '../math/Math.js';
import { CubeTexture } from '../textures/CubeTexture.js';

export class RenderQueue {

	constructor(renderer) {
		this._renderer = renderer;

		// Rendering sequences that are used often can be stored for quick access
		this._storedRenderQueues = {};

		// Queue for render passes. When render() is called this queue is executed in FIFO order
		this._renderQueue = [];

		// Maps ID (string) to texture
		this._textureMap = {};
		// Additional data passed through by previous render passe
		this._forwardedAdditionalData = {};

		// Init merge texture resources
		this._textureMergeScene = new Scene();
		this._textureMergeQuad = new Quad(new Vector2(-1, 1), new Vector2(1, -1), new MeshBasicMaterial());
		this._textureMergeQuad.frustumCulled = false;
		this._textureMergeCamera = new OrthographicCamera(-1, 1, 1, -1, 1, 2);
		this._textureMergeScene.add(this._textureMergeQuad);

		// Init render target
		this._renderTarget = new RenderTarget(renderer.width, renderer.height);

		// Unique identifier
		this._uuid = _Math.generateUUID();
	}

	_setupRenderTarget(renderPass) {
		let viewportRP = renderPass.viewport;

		// Clear previous draw buffers from the render target
		this._renderTarget.clearDrawBuffers();

		// Set viewport dimensions
		this._renderTarget.width = viewportRP.width;
		this._renderTarget.height = viewportRP.height;

		// Check if depth texture is requested
		if (renderPass.outDepthID !== null) {
			let cachedTexture = this._textureMap[renderPass.outDepthID];

			// If texture with this ID is already cached use that texture
			if (cachedTexture !== undefined) {
				this._renderTarget.depthTexture = cachedTexture;

				// Update dimensions
				this._renderTarget.depthTexture.width = viewportRP.width;
				this._renderTarget.depthTexture.height = viewportRP.height;
			}
			else {
				if(renderPass.target === RenderPass.TEXTURE_CUBE_MAP){
					this._renderTarget.addDepthTexture(true);
				}else{
					this._renderTarget.addDepthTexture();
				}
				// Bind depth texture to ID
				this._textureMap[renderPass.outDepthID] = this._renderTarget.depthTexture;
			}
		}else{
			this._renderTarget.depthTexture = null;
		}

		// Bind color output textures
		for (let i = 0; i < renderPass.outTextures.length; i++) {

			let texTemplate = renderPass.outTextures[i];
			let texID = texTemplate.id;
			let texConfig = texTemplate.textureConfig;

			// Check if this texture is already cached
			let cachedTexture = this._textureMap[texID];

			// If texture with this ID is already cached use that texture
			if (cachedTexture !== undefined) {
				// Update texture parameters
				cachedTexture.applyConfig(texConfig);

				// Update dimensions
				cachedTexture.width = viewportRP.width;
				cachedTexture.height = viewportRP.height;

				// Add texture as draw buffer to render target
				this._renderTarget.addDrawBuffer(cachedTexture);
			}
			else {
				// Create new texture
				let texture;
				if(renderPass.target === RenderPass.TEXTURE_CUBE_MAP){
					texture = new CubeTexture({
						textures: undefined,
						wrapS: texConfig.wrapS,
						wrapT: texConfig.wrapT,
						wrapR: texConfig.wrapR,
						minFilter: texConfig.minFilter,
						magFilter: texConfig.magFilter,
						internalFormat: texConfig.internalFormat,
						format: texConfig.format,
						type: texConfig.type,
						size: Math.min(viewportRP.width, viewportRP.height)
					});
				}else{
					texture = new Texture(
						undefined,
						texConfig.wrapS,
						texConfig.wrapT,
						texConfig.minFilter,
						texConfig.magFilter,
						texConfig.internalFormat,
						texConfig.format,
						texConfig.type,
						viewportRP.width,
						viewportRP.height
					);
				}
				texture.clearFunction = texConfig.clearFunction;

				this._renderTarget.addDrawBuffer(texture);
				// Bind depth texture to the given ID ID
				this._textureMap[texID] = texture;

				cachedTexture = texture;
			}
			// If clearColorArray is null, buffer will not be cleared without warning.
			// clearColorArray, when set, should be appropriate 4-element native array for the buffer format.
			// When clear color is not set, the buffer will be cleared with renderer's clear color.
			if (texTemplate.clearColorArray !== undefined) {
				cachedTexture.clearColorArray = texTemplate.clearColorArray;
			} else {
				delete cachedTexture.clearColorArray;
			}
		}
	}

	render_begin() {
		if (this._saved_vp) {
			console.error("RenderQueue.render_begin called without an intervening end.");
			return;
		}
		// Store current renderer viewport
		this._saved_vp = this._renderer.getViewport();
	}

	render_pass_idx(i) {
		this.render_pass(this._renderQueue[i], i);
	}

	render_pass(renderPass, i) {
		// Check if the render pass is initialized
		if (!renderPass._isInitialized) {
			renderPass._initialize(this._textureMap, this._forwardedAdditionalData);
			renderPass._isInitialized = true;
		}

		let viewportRP = renderPass.viewport;

		// Execute preprocess step
		let preprocOutput = renderPass.preprocess(this._textureMap, this._forwardedAdditionalData);

		// If prepossessing step outputs null skip this render pass.
		if (preprocOutput === null) {
			return;
		}

		// Determine the render pass type
		if (renderPass.type === RenderPass.BASIC) {
			// This is a BASIC scene rendering render pass

			// Validate preprocess output
			if (preprocOutput.scene === undefined || !(preprocOutput.scene instanceof Scene) ||
				preprocOutput.camera === undefined || !(preprocOutput.camera instanceof Camera)) {
				console.error("Render pass " + i + " has invalid preprocess output!");
				return;
			}

			// Render to specified target
			if (renderPass.target === RenderPass.SCREEN) {
				// RENDER TO SCREEN
				// Set requested viewport
				this._renderer.updateViewport(viewportRP.width, viewportRP.height, viewportRP.xOffset, viewportRP.yOffset);

				// Render to screen
				this._renderer.render(preprocOutput.scene, preprocOutput.camera);
			}
			else if (renderPass.target === RenderPass.TEXTURE) {
				// RENDER TO TEXTURE
				// Setup render target as the render pass specifies
				this._setupRenderTarget(renderPass);

				// Render to render target
				this._renderer.render(preprocOutput.scene, preprocOutput.camera, this._renderTarget)
			}
			else if (renderPass.target === RenderPass.TEXTURE_CUBE_MAP) {
				// RENDER TO TEXTURE_CUBE_MAP
				// Setup render target as the render pass specifies
				this._setupRenderTarget(renderPass);

				// Render to render target
				this._renderer.render(preprocOutput.scene, preprocOutput.camera, this._renderTarget, true, renderPass.side);
			}
			else {
				console.error("Unknown render pass " + i + " target.");
				return;
			}
		}
		else if (renderPass.type === RenderPass.TEXTURE_MERGE) {
			// This is a texture merging render pass

			// Validate preprocess output
			if (preprocOutput.material === undefined || !(preprocOutput.material instanceof CustomShaderMaterial) ||
				preprocOutput.textures === undefined || !Array.isArray(preprocOutput.textures)) {
				console.error("Render pass " + i + " has invalid preprocess output!");
				return;
			}

			// Remove possible previous maps
			preprocOutput.material.clearMaps();

			// Add textures to material
			for (let i = 0; i < preprocOutput.textures.length; i++) {
				preprocOutput.material.addMap(preprocOutput.textures[i]);
			}

			// Set quad material so that the correct shader will be used
			this._textureMergeQuad.material = preprocOutput.material;

			// Render to specified target
			if (renderPass.target === RenderPass.SCREEN) {
				// RENDER TO SCREEN
				// Set requested viewport
				this._renderer.updateViewport(viewportRP.width, viewportRP.height, viewportRP.xOffset, viewportRP.yOffset);

				// Render to screen
				this._renderer.render(this._textureMergeScene, this._textureMergeCamera);
			}
			else if (renderPass.target === RenderPass.TEXTURE) {
				// RENDER TO TEXTURE
				// Setup render target as the render pass specifies
				this._setupRenderTarget(renderPass);

				// Render to render target
				this._renderer.render(this._textureMergeScene, this._textureMergeCamera, this._renderTarget);
			}
			else {
				console.error("Unknown render pass " + i + " target.");
				return;
			}
		}
		else if (renderPass.type === RenderPass.POSTPROCESS) {
			// This is a texture merging render pass

			// Validate preprocess output
			if (preprocOutput.material === undefined || !(preprocOutput.material instanceof CustomShaderMaterial) ||
				preprocOutput.textures === undefined || !Array.isArray(preprocOutput.textures)) {
				console.error("Render pass " + i + " has invalid preprocess output!");
				return;
			}

			// Remove possible previous maps
			preprocOutput.material.clearMaps();

			// Add textures to material
			for (let i = 0; i < preprocOutput.textures.length; i++) {
				preprocOutput.material.addMap(preprocOutput.textures[i]);
			}

			// Set quad material so that the correct shader will be used
			this._textureMergeQuad.material = preprocOutput.material;

			// Render to specified target
			if (renderPass.target === RenderPass.SCREEN) {
				// RENDER TO SCREEN
				// Set requested viewport
				this._renderer.updateViewport(viewportRP.width, viewportRP.height, viewportRP.xOffset, viewportRP.yOffset);

				// Render to screen
				this._renderer.render(this._textureMergeScene, this._textureMergeCamera);
			}
			else if (renderPass.target === RenderPass.TEXTURE) {
				// RENDER TO TEXTURE
				// Setup render target as the render pass specifies
				this._setupRenderTarget(renderPass);

				// Render to render target
				this._renderer.render(this._textureMergeScene, this._textureMergeCamera, this._renderTarget);
			}
			else {
				console.error("Unknown render pass " + i + " target.");
				return;
			}
		}
		else {
			console.error("Render queue contains RenderPass of unsupported type!");
			return;
		}

		// Postprocessing step
		renderPass.postprocess(this._textureMap, this._forwardedAdditionalData);
	}

	render_end() {
		// Restore viewport to original value
		this._renderer.updateViewport(this._saved_vp.width, this._saved_vp.height, this._saved_vp.xOffset, this._saved_vp.yOffset);
		delete this._saved_vp;

		return {textures: this._textureMap,
				additionalData: this._forwardedAdditionalData};
	}

	render() {
		this.render_begin();

		for (let i = 0; i < this._renderQueue.length; i++) {
			this.render_pass(this._renderQueue[i], i);
		}

		return this.render_end();
	}

	addTexture(name, texture) {
		this._textureMap[name] = texture;
	}

	setDataValue(name, value) {
		this._forwardedAdditionalData[name] = value;
	}

	// region QUEUE CONSTRUCTION
	/**
	 * Creates the render queue from the given array of render passes
	 */
	setRenderQueue(queue) {
		// Validate the given queue
		for (let i = 0; i < queue.length; i++) {
			if (!(queue[i] instanceof RenderPass)) {
				console.error("Given render queue contains invalid elements!");
				return;
			}
		}

		this._renderQueue = queue;
	}

	takeScreenshot(name, sizeMultiplier = 1, segmented = false){
		const reference = this._textureMap[name];
		this._renderer.takeScreenshot(reference, sizeMultiplier, segmented, this);
	}
	pickRGB(name, pickX, pickY){
		const reference = this._textureMap[name];
		return this._renderer.pickRGB(reference, pickX, pickY, this);
	}
	pickUINT(name, pickX, pickY){
		const reference = this._textureMap[name];
		return this._renderer.pickUINT(reference, pickX, pickY, this);
	}

	downloadTexture(name){
		const reference = this._textureMap[name];
		return this._renderer.downloadTexture(reference, name);
	}

	downloadAllTextures() {
		const keys = Object.keys(this._textureMap)
		for	(var i = 0; i < keys.length; i++){
			this.downloadTexture(keys[i]);
		}
	}

	/**
	 * Removes all the RenderPasses from the queue
	 */
	clearRenderQueue() {
		this._renderQueue = [];
	}

	/**
	 * Adds new RenderPass to the end of the queue
	 */
	pushRenderPass(renderPass) {
		// Validate renderPass
		if (!(renderPass instanceof RenderPass)) {
			console.error("Given argument is not a RenderPass!");
			return;
		}

		this._renderQueue.push(renderPass);
	}

	/**
	 * Removes the Render Pass from the render queue.
	 */
	removeRenderPass(renderPass) {
		let index = this._renderQueue.indexOf(renderPass);

		if (index > -1) {
			this._renderQueue.splice(index, 1);
		}
	}

	/**
	 * Adds render pass at given index.
	 */
	addRenderPass(renderPass, index) {
		this._renderQueue.splice(index, 0, renderPass);
	}

	/**
	 * Pops last render pass in the render queue
	 */
	popRenderPass() {
		return this._renderQueue.pop();
	}
	// endregion

	// region QUEUE MANAGEMENT
	/**
	 * Stores currently setup render queue.
	 * @param id {string} Identificator through which the stored render queue will be accessible.
	 */
	storeRenderQueue(id) {
		this._storedRenderQueues[id] = this._renderQueue;
	}

	loadRenderQueue(id) {
		let queue = this._storedRenderQueues[id];

		if (queue === undefined) {
			console.error("Error: Could not find the requested queue.")
		}
		else {
			this._renderQueue = queue;
		}
	}

	pushRenderQueue(renderQueue){
		if (!(renderQueue instanceof RenderQueue)){
			console.error("Given argument is not a RenderQueue!");
			return;
		}

		const renderPasses = renderQueue._renderQueue;
		for (let rp = 0; rp < renderPasses.length; rp++) {
			this.pushRenderPass(renderPasses[rp])
		}
	}
	// endregion
};