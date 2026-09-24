/**
 * Created by Ziga, Primoz & Sebastien on 1.4.2016.
 */
//Descriptor of GLBuffer 
export class BufferAttribute {
	static TARGET = {
		ARRAY_BUFFER: 0,
		ELEMENT_ARRAY_BUFFER: 1,
		COPY_READ_BUFFER: 2,
		COPY_WRITE_BUFFER: 3,
		TRANSFORM_FEEDBACK_BUFFER: 4,
		UNIFORM_BUFFER: 5,
		PIXEL_PACK_BUFFER: 6,
		PIXEL_UNPACK_BUFFER: 7
	};
	static DRAW_TYPE = {
		STATIC: 0,
		STREAMING: 1,
		DYNAMIC: 2
	};


	/**
	 * Create new BufferAttribute object.
	 *
	 * @param array Buffer data.
	 * @param itemSize Size of an item.
	 */
	constructor(array, itemSize, divisor = 0, args = {}) {
		this._array = array;
		this._itemSize = itemSize;
		this._divisor = divisor; // Divisor used by instancing

		// Version counters. This object is DATA; whether any particular GL
		// context has that data is the business of that context's
		// GLAttributeManager, which remembers the versions it last uploaded.
		// So the same attribute can be used by several contexts at once, and
		// each uploads on its own schedule -- see the note in
		// GLAttributeManager.
		//
		// _version bumps whenever the contents change, _allocVersion only when
		// the buffer has to be reallocated because the size changed.
		this._version = 0;
		this._allocVersion = 0;

		this._drawType = BufferAttribute.DRAW_TYPE.STATIC;

		this.target = (args.target !== undefined) ? args.target : BufferAttribute.TARGET.ARRAY_BUFFER;

		// Interleaving, in BYTES, straight through to vertexAttribPointer.
		// Both zero -- the default -- is the tightly packed case and behaves
		// exactly as before.
		//
		// With them, an attribute can be a VIEW of a buffer rather than a copy
		// of part of it: two attributes over one array, reading different
		// fields of the same records. Stripes use it to take the two endpoints
		// of a segment out of a plain list of positions without building
		// anything, and count() has to be told the item count separately
		// because it can no longer be derived from the array length.
		this._stride = (args.stride !== undefined) ? args.stride : 0;
		this._offset = (args.offset !== undefined) ? args.offset : 0;
		this._count  = (args.count  !== undefined) ? args.count  : -1;
	}

	/**
	 * Return the number of items in data array (numValues / itemSize).
	 *
	 * @returns Item count.
	 */
	count() {
		if (this._count >= 0) return this._count;
		return this._array.length / this._itemSize;
	}

	/**
	 * Set buffer data and set dirty to true.
	 *
	 * @param val Value to be set.
	 */
	set array(val) {
		if (this._array.length == val.length)
			this._version++;               // same size, re-upload in place
		else
			this.needsRealloc();           // size changed, reallocate too
		this._array = val;
	}

	/**
	 * Set size of an item and set dirty to true.
	 *
	 * @param val Size to be set.
	 */
	set itemSize(val) {
		this._itemSize = val;
		this.needsRealloc();
	}

	/// The contents changed: every context re-uploads on its next use.
	needsUpload() { this._version++; }

	/// The contents AND the size changed: every context reallocates as well.
	needsRealloc() { this._version++; this._allocVersion++; }

	/**
	 * Legacy spelling of needsRealloc(). Kept because application code sets it;
	 * assigning false is now meaningless and does nothing, since whether a
	 * buffer is up to date is a per-context question and the answer lives in
	 * that context's GLAttributeManager.
	 *
	 * @param val Value to be set.
	 */
	set dirty(val) {
		if (val) this.needsRealloc();
	}

	set drawType(drawType){
		this._drawType = drawType;
	}

	/**
	 * Get the array of items.
	 *
	 * @returns Array of items.
	 */
	get array() { return this._array; }

	/**
	 * Get the size of an item.
	 *
	 * @returns Item size.
	 */
	get itemSize() { return this._itemSize; }

	//size in bytes
	get size() {
		return this.array.byteLength;
	}

	/**
	 * Check if buffer was modified.
	 *
	 * @returns True if modified.
	 */
	get version()      { return this._version; }
	get allocVersion() { return this._allocVersion; }

	get divisor() { return this._divisor; }
	get stride()  { return this._stride;  }
	get offset()  { return this._offset;  }
	set divisor(divisor) { this._divisor = divisor; }

	get drawType() { return this._drawType; }

	get target() { return this._target; }
	set target(target) { this._target = target; }


	/// Legacy spelling of needsUpload().
	update(){
		this._version++;
	}
};

export function Int8Attribute (array, itemSize, divisor = 0) {
	return new BufferAttribute(new Int8Array(array), itemSize, divisor);
};

export function Uint8Attribute (array, itemSize, divisor = 0) {
	return new BufferAttribute(new Uint8Array(array), itemSize, divisor);
};

export function Uint8ClampedAttribute (array, itemSize, divisor = 0) {
	return new BufferAttribute(new Uint8ClampedArray(array), itemSize, divisor);
};

export function Int16Attribute (array, itemSize, divisor = 0) {
	return new BufferAttribute(new Int16Array(array), itemSize, divisor);
};

export function Uint16Attribute (array, itemSize, divisor = 0) {
	return new BufferAttribute(new Uint16Array(array), itemSize, divisor);
};

export function Int32Attribute (array, itemSize, divisor = 0) {
	return new BufferAttribute(new Int32Array(array), itemSize, divisor);
};

export function Uint32Attribute (array, itemSize, divisor = 0) {
	return new BufferAttribute(new Uint32Array(array), itemSize, divisor);
};

export function Float32Attribute (array, itemSize, divisor = 0) {
	return new BufferAttribute(new Float32Array(array), itemSize, divisor);
};

export function Float64Attribute (array, itemSize, divisor = 0) {
	return new BufferAttribute(new Float64Array(array), itemSize, divisor);
};