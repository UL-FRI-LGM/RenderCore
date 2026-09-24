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


	/**
	 * The per-context cache entry for an attribute. The attribute itself is
	 * DATA and may be shared by any number of contexts; everything below is
	 * true only of this one:
	 *
	 *   glBuffer      this context's buffer object
	 *   version       the attribute version last uploaded into it
	 *   allocVersion  the attribute version it was last sized for
	 *   idleTime      cycles since anything in this context asked for it
	 *   locations     the attrib locations it is currently bound to, which are
	 *                 per program and therefore per context
	 *
	 * Keeping these on the attribute is what used to make sharing impossible:
	 * whichever context uploaded first cleared the flag and the rest drew from
	 * a buffer that had been allocated and never filled.
	 */
	_entry(attribute) {
		let entry = this._cached_buffers.get(attribute);
		if (entry === undefined) {
			entry = { glBuffer: this._gl.createBuffer(),
			          version: -1, allocVersion: -1,
			          idleTime: 0, locations: [] };
			this._cached_buffers.set(attribute, entry);
		}
		return entry;
	}

	/// Bring this context's buffer up to the attribute's current version.
	/// A fresh entry is at -1, so it always allocates and uploads once.
	_sync(attribute, entry) {
		if (entry.allocVersion === attribute.allocVersion &&
		    entry.version      === attribute.version) return;

		const bufferType = (attribute.target) ? this.TARGET.get(attribute.target)
		                                      : this._gl.ARRAY_BUFFER;
		this._gl.bindBuffer(bufferType, entry.glBuffer);

		if (entry.allocVersion !== attribute.allocVersion) {
			const usage = this.DRAW_TYPE.get(attribute.drawType);
			this._gl.bufferData(bufferType, attribute.size, usage);
			entry.allocVersion = attribute.allocVersion;
			entry.version = -1;                 // the new storage holds nothing
		}
		if (entry.version !== attribute.version) {
			this._gl.bufferSubData(bufferType, 0, attribute.array, 0, 0);
			entry.version = attribute.version;
		}

		this._gl.bindBuffer(bufferType, null);
	}

	/**
	 * Fetches this context's WebGL buffer for the given attribute, creating and
	 * filling it if needed. Touching it also clears its idle counter, which is
	 * the whole of the liveness bookkeeping: an attribute nothing asked for
	 * during a rebuild is one nothing needs any more.
	 *
	 * @param {BufferAttribute} attribute
	 * @returns the WebGL buffer
	 */
	getGLBuffer (attribute) {
		const entry = this._entry(attribute);
		entry.idleTime = 0;
		this._sync(attribute, entry);
		return entry.glBuffer;
	}

	/// Record that this context has bound the attribute to a vertex attrib
	/// location, so eviction can disable exactly the ones it enabled.
	addLocation (attribute, location) {
		const entry = this._cached_buffers.get(attribute);
		if (entry !== undefined) entry.locations.push(location);
	}

	/**
	 * Drops this context's buffer for an attribute. Nothing is written back to
	 * the attribute: the next use simply finds no entry, makes one at version
	 * -1, and uploads. That is what lets a caller forget about GL resources
	 * entirely -- the data is still there, and the buffer is only a cache of it.
	 */
	deleteBuffer(attribute, entry) {
		for (let i = 0; i < entry.locations.length; i++) {
			this._gl.disableVertexAttribArray(entry.locations[i]);
		}
		this._gl.deleteBuffer(entry.glBuffer);
		this._cached_buffers.delete(attribute);
	}

	/**
	 * Clears buffer cache -- everything, or only what has gone idle.
	 */
	deleteBuffers(checkIdleTime = false, idleTimeDelta = 1000) {
		for (const [attribute, entry] of this._cached_buffers) {
			if ( ! checkIdleTime || entry.idleTime >= idleTimeDelta)
				this.deleteBuffer(attribute, entry);
		}
	}

	/// Age everything this context holds by one cycle. Counted per context, so
	/// a shared attribute no longer ages once per viewer that holds it.
	incrementTime(){
		for (const entry of this._cached_buffers.values()) {
			entry.idleTime = entry.idleTime + 1;
		}
	}
};
