import { BufferAttribute } from "./BufferAttribute.js";


/**
 * Created by Primoz on 24.4.2016.
 */
export class GLAttributeManager {

	/**
	 * @param {WebGLRenderingContext} gl WebGL rendering context used for buffer allocation.
	 */
	constructor (gl) {
		this._gl = gl;
		this._cached_buffers = new Map();

		this.DRAW_TYPE = new Map(
			[
				[BufferAttribute.DRAW_TYPE.STATIC, gl.STATIC_DRAW], 
				[BufferAttribute.DRAW_TYPE.STREAMING, gl.STREAM_DRAW], 
				[BufferAttribute.DRAW_TYPE.DYNAMIC, gl.DYNAMIC_DRAW]
			]
		);
	}


	/**
	 * Checks if the given attribute is already tracked in the global properties and has its WebGL buffer set (if not it creates a new buffer).
	 * If the properties attribute and object attribute versions mismatch, it updates the properties attribute with object attribute.
	 * @param {BufferAttribute} attribute Object attribute
	 * @param bufferType WebGL buffer type
	 */
	updateAttribute (attribute, bufferType) {
		let newBuffer = false;
		let glBuffer = this._cached_buffers.get(attribute);

		if(glBuffer === undefined){
			glBuffer = this._gl.createBuffer();
			this._cached_buffers.set(attribute, glBuffer);
			newBuffer = true;

			attribute.dirty = true;
		}

		// If the WebGL buffer property is undefined, create a new buffer (attribute not found in properties)
		if (attribute.dirty) {
			this._gl.bindBuffer(bufferType, glBuffer);
			this._gl.bufferData(bufferType, attribute.array, this.DRAW_TYPE.get(attribute.drawType)); // Write the data to buffer
	
			attribute.dirty = false; // Mark attribute not dirty
		}else if (attribute._update){
			this._gl.bindBuffer(bufferType, glBuffer);
			this._gl.bufferSubData(bufferType, 0, attribute.array);

			attribute._update = false;
		}
	}

	/**
	 * Fetches cached WebGL buffer for the given attribute object
	 * @param {BufferAttribute} attribute An attribute whose WebGL buffer should be retrieved
	 * @returns {map} Attributes WebGL buffer container
	 */
	 getGLBuffer (attribute) {
		if(this._cached_buffers.has(attribute)){
			return this._cached_buffers.get(attribute);
		}else{
			console.error("Warning: GLBuffer not found: [" + attribute + "]!");
			
			return null;
		}
	}

	/**
	 * Deletes cached WebGL buffer for the given attribute object
	 * @param {BufferAttribute} attribute An attribute whose local version will be deleted
	 */
	deleteBuffer(buffer, glBuffer) {
		this._cached_buffers.delete(buffer);
		this._gl.deleteBuffer(glBuffer);
	}

	/**
	 * Clears buffer cache
	 */
	deleteBuffers() {
		for (const [key_buffer, val_glBuffer] of this._cached_buffers) {
			this.deleteBuffer(key_buffer, val_glBuffer);
		}
	}
};