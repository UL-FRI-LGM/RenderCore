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
		this.TARGET = new Map(
			[
				[BufferAttribute.TARGET.ARRAY_BUFFER, gl.ARRAY_BUFFER], 
				[BufferAttribute.TARGET.ELEMENT_ARRAY_BUFFER, gl.ELEMENT_ARRAY_BUFFER], 
				[BufferAttribute.TARGET.COPY_READ_BUFFER, gl.COPY_READ_BUFFER], 
				[BufferAttribute.TARGET.COPY_WRITE_BUFFER, gl.COPY_WRITE_BUFFER], 
				[BufferAttribute.TARGET.TRANSFORM_FEEDBACK_BUFFER, gl.TRANSFORM_FEEDBACK_BUFFER], 
				[BufferAttribute.TARGET.UNIFORM_BUFFER, gl.UNIFORM_BUFFER], 
				[BufferAttribute.TARGET.PIXEL_PACK_BUFFER, gl.PIXEL_PACK_BUFFER], 
				[BufferAttribute.TARGET.PIXEL_UNPACK_BUFFER, gl.PIXEL_UNPACK_BUFFER]
			]
		);
	}


	_createGLBuffer(attribute){
		const bufferType = (attribute.target) ? this.TARGET.get(attribute.target) : this._gl.ARRAY_BUFFER;
		const size = attribute.size;
		const usage = this.DRAW_TYPE.get(attribute.drawType);

		const glBuffer = this._gl.createBuffer();
		this._gl.bindBuffer(bufferType, glBuffer);
		this._gl.bufferData(bufferType, size, usage); //allocation
		this._gl.bindBuffer(bufferType, null);
	
		this._cached_buffers.set(attribute, glBuffer);


		return glBuffer;
	}

	/**
	 * Checks if the given attribute is already tracked in the global properties and has its WebGL buffer set (if not it creates a new buffer).
	 * If the properties attribute and object attribute versions mismatch, it updates the properties attribute with object attribute.
	 * @param {BufferAttribute} attribute Object attribute
	 * @param bufferType WebGL buffer type
	 */
	_updateAttribute (attribute) {
		const glBuffer = this._cached_buffers.get(attribute);
		const bufferType = (attribute.target) ? this.TARGET.get(attribute.target) : this._gl.ARRAY_BUFFER;

		// If the WebGL buffer property is undefined, create a new buffer (attribute not found in properties)
		if (attribute.dirty || attribute._update) {
			this._gl.bindBuffer(bufferType, glBuffer);
			if (attribute.dirty) {
				const usage = this.DRAW_TYPE.get(attribute.drawType);
				this._gl.bufferData(bufferType, attribute.size, usage); // recreate buffer
				attribute.dirty = false; // Mark attribute not dirty
			}
			//this._gl.bufferSubData(bufferType, 0, attribute.array); // Write the data to buffer
			this._gl.bufferSubData(bufferType, 0, attribute.array, 0, 0);
			this._gl.bindBuffer(bufferType, null);

			
			attribute._update = false;
		}
	}

	/**
	 * Fetches cached WebGL buffer for the given attribute object
	 * @param {BufferAttribute} attribute An attribute whose WebGL buffer should be retrieved
	 * @returns {map} Attributes WebGL buffer container
	 */
	 getGLBuffer (attribute) {
		attribute.idleTime = 0;

		if(this._cached_buffers.has(attribute)){
			const glBuffer = this._cached_buffers.get(attribute);
			if(attribute.dirty || attribute._update) this._updateAttribute(attribute);


			return glBuffer; 
		}else{
			//console.error("Warning: GLBuffer not found: [" + attribute + "]!");
			const glBuffer = this._createGLBuffer(attribute);
			if(attribute.dirty || attribute._update) this._updateAttribute(attribute);
			

			return glBuffer;
		}
	}

	/**
	 * Deletes cached WebGL buffer for the given attribute object
	 * @param {BufferAttribute} attribute An attribute whose local version will be deleted
	 */
	deleteBuffer(buffer, glBuffer) {
		buffer.dirty = true; //so it will be updated when created again
		this._cached_buffers.delete(buffer);
		this._gl.deleteBuffer(glBuffer);

		for (let i = 0; i < buffer.locations.length; i++) {
			const location = buffer.locations[i];
			this._gl.disableVertexAttribArray(location);
		}
		buffer.locations = new Array(); // clear
	}

	/**
	 * Clears buffer cache
	 */
	deleteBuffers(checkIdleTime = false, idleTimeDelta = 1000) {
		if(checkIdleTime){
			for (const [key_buffer, val_glBuffer] of this._cached_buffers) {
				if(key_buffer.idleTime >= idleTimeDelta) this.deleteBuffer(key_buffer, val_glBuffer);
			}
		}else{
			for (const [key_buffer, val_glBuffer] of this._cached_buffers) {
				this.deleteBuffer(key_buffer, val_glBuffer);
			}
		}
	}

	incrementTime(){
		for (const [key_buffer, val_glBuffer] of this._cached_buffers) {
			key_buffer.idleTime = key_buffer.idleTime + 1;
		}
	}
};
