/**
 * Created by Ziga on 25.3.2016.
 */


/**
 * Interface for renderers, implemented by VolumeRenderer, MeshRenderer, etc.
 * @class Renderer
 */

import {ShaderLoader} from '../loaders/ShaderLoader.js';
import {GLManager} from '../core/GLManager.js';
import {GLProgramManager} from '../program_management/GLProgramManager.js';
import {Camera} from '../cameras/Camera.js';

import {_Math} from '../math/Math.js';

export class Renderer {
	// Subclasses perform WebGL initialization, texture allocation, etc.
	// Renderers can be run offline, without WebGL.
	constructor(canvas, gl_version, optionalContextAttributes) {
		// Create new gl manager with appropriate version
		this._glManager = new GLManager(canvas, gl_version, optionalContextAttributes);
		this._canvas = canvas;

		// Retrieve context from gl manager
		this._gl = this._glManager.context;


		// Program management
		this._glProgramManager = new GLProgramManager(this._glManager);
		this._shaderLoader = new ShaderLoader();

		this._requiredPrograms = new Map();
		this._loadingPrograms = new Map();
		this._compiledPrograms = new Map();

		// Render target
		this._currentRenderTarget = null;

		//region Execution values
		this._autoClear = true;
		//endregion

		this._selectedRenderer = null;

		this._uuid = _Math.generateUUID();
		// material ID map
		this._materialIDMap = new Map();
		this._materialID = 0;

		//screenshot
		this._takeScreenshot = false;
		this._screenshotInProgress = false;
		this._segmentedScreenshot = false;
		this._screenshotSizeMultiplier = 1;
		this._renderQueue = undefined;
		this._screenshotTextureReference = undefined;
		this._screenshotData = new Uint8ClampedArray();

		//viewport
		this._viewport = {xOffset: 0, yOffset: 0, width: this._canvas.width, height: this._canvas.height};

		//logLevel: 0 - error, 1 - warning, 2 - info, 3 - debug
		this._logLevel = 2;
	}

	render(scene, camera, renderTarget, cubeTarget = false, side = 0) {
		// Check if correct object instance was passed as camera
		if (camera instanceof Camera === false) {
			console.error(LOGTAG + "Given camera is not an instance of Camera");
			return;
		}

		// If camera is not part of the scene.. Update its worldMatrix anyways
		if (camera.parent === null)
			camera.updateMatrixWorld();

		camera.matrixWorldInverse.getInverse(camera.matrixWorld);

		// Check if render target was specified
		if (renderTarget !== undefined) {
			this._initRenderTarget(renderTarget, cubeTarget, side);
		}

		// Clear color, depth and stencil buffer
		if (this._glManager.autoClear) {
			this._glManager.clear(true, true, true);
		}

		// Calls selected renderer function which should be overrided in the extending class
		this._selectedRenderer(scene, camera);

		// Last stop: take screenshot
		if(this._takeScreenshot) {
			this._takeScreenshot = false;
			this._screenshotInProgress = true;


			console.log("Taking screenshot...");
			const imageData = (this._segmentedScreenshot) ? this._takeSegmentedScreenshot(scene, camera, renderTarget,  this._renderQueue, this._screenshotTextureReference) : this._takeFullScreenshot(this._screenshotTextureReference);
			this._glManager.openImageInNewTab(imageData);

			this._screenshotInProgress = false;
		}

		// If RTT cleanup viewport and frame-buffer
		if (this._currentRenderTarget) {
			this._cleanupRenderTarget();
			this._currentRenderTarget = null;
		}
	}

	_takeFullScreenshot(texture = undefined){
		const width = (texture)? texture.width : this.getViewport().width;
		const height = (texture)? texture.height : this.getViewport().height;

		if(this._screenshotData.length !== width * height * 4) this._screenshotData = new Uint8ClampedArray(width * height * 4);

		//PREP
		if(texture){
			const fb = this._gl.createFramebuffer();
			this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, fb);
			const glTexture = this._glManager._textureManager.getGLTexture(texture);
			this._gl.framebufferTexture2D(this._gl.FRAMEBUFFER, this._gl.COLOR_ATTACHMENT0, this._gl.TEXTURE_2D, glTexture, 0);
		}

		//READ
		this._gl.readPixels(0, 0, width, height, this._gl.RGBA, this._gl.UNSIGNED_BYTE, this._screenshotData);

		//CLEAN
		if(texture){
			this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
		}

		this._glManager.flipImage(this._screenshotData, width, height);
		const imageData = new ImageData(this._screenshotData, width, height);


		return imageData;
	}
	_takeSegmentedScreenshot(scene, camera, renderTarget, renderQueue = undefined, texture = undefined){
		const width = (texture)? texture.width : this.getViewport().width;
		const height = (texture)? texture.height : this.getViewport().height;

		const originalLeft = camera.left;
		const originalRight = camera.right;
		const originalTop = camera.top;
		const originalBottom = camera.bottom;


		const n_piecesX = this._screenshotSizeMultiplier;
		const n_piecesY = this._screenshotSizeMultiplier;
		const stepX = (-originalLeft + originalRight) / n_piecesX;
		const stepY = (originalTop - originalBottom) / n_piecesY;
		let arr = new Uint8ClampedArray(width*n_piecesX*4 * height*n_piecesY);

		let blockY = 0;
		for(let y = originalTop; y > originalBottom; y-=stepY){
			camera.top = y;
			camera.bottom = y - stepY;

			let blockX = 0;
			for(let x = originalLeft; x < originalRight; x+=stepX){
				camera.left = x;
				camera.right = x + stepX;

				//update projection matrix + render
				(renderQueue)? renderQueue.render() : this.render(scene, camera, renderTarget);
				console.log("Taking screenshot block...");
				const imageDataBlock = this._takeFullScreenshot(texture);

				//combine final image by blocks, inline
				for(let h = 0; h < height; h++){
					for(let w = 0; w < width*4; w++){
						arr[blockY*width*n_piecesX*height*4 + h*width*n_piecesX*4 + blockX*width*4 + w] = imageDataBlock.data[h*width*4 + w];
					}
				}

				//blockX.push(imageDataBlock.data);
				blockX++;
			}
			blockY++;
		}

		//reset camera
		camera.left = originalLeft;
		camera.right = originalRight;
		camera.top = originalTop;
		camera.bottom = originalBottom;
		(renderQueue)? renderQueue.render() : this.render(scene, camera, renderTarget);

		const imageData = new ImageData(arr, width*n_piecesX, height*n_piecesY);
		return imageData;
	}

	// region PROGRAM MANAGEMENT
	_downloadProgram(program) {
		let scope = this;
		const programName = program.name;

		// Called when the program template is loaded.. Initiates shader compilation
		let onLoad = function (programTemplateSrc) {
			if (scope._logLevel >= 2)
				console.log("(Down)loaded: " + program.programID + ": " + programName + '.');
			scope._glProgramManager.addTemplate(programTemplateSrc);
			scope._loadingPrograms.delete(program.name);
		};

		// Something went wrong while fetching the program templates
		let onError = function (event) {
			console.error("Failed to load program: " + program.programID + ": " + programName + '.');
			scope._loadingPrograms.delete(program.name);
		};

		// Check if the program is already loading
		if (!this._loadingPrograms.has(program.name)) {
			if (this._logLevel >= 2)
				console.log("(Down)loading: " + program.programID + ": " + programName + '.');
			this._loadingPrograms.set(program.name, program);

			// Initiate loading
			this._shaderLoader.loadProgramSources(programName, onLoad, undefined, onError);
		}
	}

	downloadTexture(texture, name) {
		return this._glManager.downloadTexture(texture, name);
	}

	_loadRequiredPrograms() {
		let everythingLoaded = true;

		for (let [key, program] of this._requiredPrograms) {
			// Check is the required program template is already downloaded
			if (!this._glProgramManager.isTemplateDownloaded(program.name)) {
				everythingLoaded = false;

				this._downloadProgram(program);
			}
			else {
				// TODO: Put this somewhere else? here?
				this._compileProgram(program);

				this._requiredPrograms.delete(key);
			}
		}

		return everythingLoaded;
	}
	_compileProgram(program){
		// Build program for specific number of lights (is disregarded if the shader is not using lights)
		let numDLights = 0;
		let numPLights = 0;
		let numSLights = 0;
		if (this._lightsCombined) {
			numDLights = this._lightsCombined.directional.length;
			numPLights = this._lightsCombined.point.length;
			numSLights = this._lightsCombined.spot.length;
		}

		const compiledProgram = this._glProgramManager.fetchProgram(program, numDLights, numPLights, numSLights);

		// Bind required program and compiled program
		this._compiledPrograms.set(program.programID, compiledProgram);


		//console.log("Compiled: " + program.name + '.');
	}

	preDownloadPrograms(programList) {

		for (let i = 0; i < programList.length; i++) {
			if (!this._glProgramManager.isTemplateDownloaded(programList[i])) {
				this._downloadProgram(programList[i]);
			}
		}
	}
	// endregion

	// region RENDER TARGET
	_initRenderTarget(renderTarget, cubeTarget, side) {
		// Check if the render target is specified
		this._currentRenderTarget = renderTarget;
		let rttViewport = renderTarget._viewport;

		// Setup viewport
		this.updateViewport(rttViewport.z, rttViewport.w, rttViewport.x, rttViewport.y);

		if(cubeTarget){
			this._glManager.initRenderTargetCube(renderTarget, side);
		}else{
			this._glManager.initRenderTarget(renderTarget);
		}
	}

	_cleanupRenderTarget() {
		this._currentRenderTarget = null;

		this.updateViewport(this._canvas.width, this._canvas.height);

		this._glManager.cleanupRenderTarget();
	}
	// endregion

	/**
	 * Clears cached attributes such as position arrays, indices and uv coordinates as well as cached textures.
	 */
	dispose() {
		this._glManager.deleteAttributeBuffers();
		this._glManager.deleteFrameBuffers();
		this._glManager.deleteTextures();
	}

	/**
	 * Sets the url to shader server & directory from which the shaders source is loaded.
	 * @param url Full url to the shader server directory
	 */
	addShaderLoaderUrls (...urls) { this._shaderLoader.addUrls(urls); }

	// region SETTERS / GETTERS
	/**
	 * SETTERS / GETTERS
	 */
	set autoClear(clear) {
		this._autoClear = clear;
	}

	get autoClear() {
		return this._autoClear;
	}

	get clearColor() { return this._glManager.clearColor; }
	set clearColor(hexColor) {
		let components = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
		if (components) {
			// Is this correct for INT/UINT buffers? See also GLManager.clearSeparate()
			this._glManager.setClearColor(parseInt(components[1], 16) / 255, parseInt(components[2], 16) / 255, parseInt(components[3], 16) / 255, parseInt(components[4], 16) / 255);
		}
	}

	updateViewport(width, height, xOffset = 0, yOffset = 0) {
		this._viewport = {xOffset: xOffset, yOffset: yOffset, width: width, height: height};
		this._gl.viewport(xOffset, yOffset, width, height);
	}

	getViewport() {
		return this._viewport;
	}
	// endregion

	get glManager(){
		return this._glManager;
	}
	get gl(){
		return this._glManager.gl;
	}
	get glContextAttributes(){
		return this._glManager.contextAttributes;
	}
	generateMaterialID(programName = undefined){
		if(programName !== undefined){
			if(this._materialIDMap.has(programName)){
				return this._materialIDMap.get(programName);
			}else{
				let newMaterialID = this._materialID;
				this._materialIDMap.set(programName, newMaterialID);
				this._materialID++;

				return newMaterialID;
			}
		}else {
			return this._materialID++;
		}
	}

	takeScreenshot(texture = undefined, sizeMultiplier = 1, segmented = false, renderQueue = undefined){
		this._takeScreenshot = true;

		this._segmentedScreenshot = segmented;
		this._screenshotSizeMultiplier = sizeMultiplier;

		this._renderQueue = renderQueue;
		this._screenshotTextureReference = texture;
	}
	pickRGB(texture = undefined, pickX, pickY, renderQueue = undefined){
		const width = (texture)? texture.width : this.getViewport().width;
		const height = (texture)? texture.height : this.getViewport().height;

		const pickedRGBA = new Uint8Array(4);

		//PREP
		if(texture){
			const fb = this._gl.createFramebuffer();
			this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, fb);
			const glTexture = this._glManager._textureManager.getGLTexture(texture);
			this._gl.framebufferTexture2D(this._gl.FRAMEBUFFER, this._gl.COLOR_ATTACHMENT0, this._gl.TEXTURE_2D, glTexture, 0);
		}

		//READ
		this._gl.readPixels(pickX, height-pickY, 1, 1, this._gl.RGBA, this._gl.UNSIGNED_BYTE, pickedRGBA);

		//CLEAN
		if(texture){
			this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
		}

		return pickedRGBA;
	}
	pickUINT(texture = undefined, pickX, pickY, renderQueue = undefined){
		const width = (texture)? texture.width : this.getViewport().width;
		const height = (texture)? texture.height : this.getViewport().height;

		const pickedUINT = new Uint32Array(4);

		//PREP
		if(texture){
			const fb = this._gl.createFramebuffer();
			this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, fb);
			const glTexture = this._glManager._textureManager.getGLTexture(texture);
			this._gl.framebufferTexture2D(this._gl.FRAMEBUFFER, this._gl.COLOR_ATTACHMENT0, this._gl.TEXTURE_2D, glTexture, 0);
		}

		//READ
		this._gl.readPixels(pickX, height-pickY, 1, 1, this._gl.RGBA_INTEGER, this._gl.UNSIGNED_INT, pickedUINT);

		//CLEAN
		if(texture){
			this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
		}

		return pickedUINT;
	}
};
