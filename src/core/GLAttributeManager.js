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
	}


	/**
	 * Checks if the given attribute is already tracked in the global properties and has its WebGL buffer set (if not it creates a new buffer).
	 * If the properties attribute and object attribute versions mismatch, it updates the properties attribute with object attribute.
	 * @param {BufferAttribute} attribute Object attribute
	 * @param bufferType WebGL buffer type
	 */
	updateAttribute (attribute, bufferType) {
		// Check if this attribute is already defined in the global properties
		let cachedBuffer = this.getCachedBuffer(attribute);

		// If the WebGL buffer property is undefined, create a new buffer (attribute not found in properties)
		if (attribute.dirty) {
			this.createBuffer(attribute, cachedBuffer, bufferType);
		}
	}

	/**
	 * Creates new WebGL buffer which is then added as property to attribute from properties
	 * @param attribute Properties attribute
	 * @param buffer Object WebGLBuffer
	 * @param bufferType Type of WebGL buffer that is to be created
	 */
	createBuffer (attribute, buffer, bufferType) {
		this._gl.bindBuffer(bufferType, buffer);

		// Write the data to buffer
		this._gl.bufferData(bufferType, attribute.array, this._gl.STATIC_DRAW);

		// Mark attribute not dirty
		attribute.dirty = false;
	}

	/**
	 * Fetches cached WebGL buffer for the given attribute object
	 * @param {BufferAttribute} attribute An attribute whose WebGL buffer should be retrieved
	 * @returns {map} Attributes WebGL buffer container
	 */
	getCachedBuffer (attribute) {
		// Check if the buffer is already cached for this object
		let buffer = this._cached_buffers.get(attribute);

		// If the buffer for this object was not found. Create a new buffer and cache it.
		if (buffer === undefined) {
			buffer = this._gl.createBuffer();
			this._cached_buffers.set(attribute, buffer);
			attribute.dirty = true;
		}

		return buffer;
	}

	/**
	 * Deletes cached WebGL buffer for the given attribute object
	 * @param {BufferAttribute} attribute An attribute whose local version will be deleted
	 */
	deleteCachedBuffer (attribute) {
		this._cached_buffers.delete(attribute);
	}

	/**
	 * Clears buffer cache
	 */
	clearBuffers () {
		this._cached_buffers.clear();
	}
};