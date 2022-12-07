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

		// Tells if local copies are up to date
		this._dirty = true;

		this._drawType = BufferAttribute.DRAW_TYPE.STATIC;
		this._update = false;

		this.target = (args.target !== undefined) ? args.target : BufferAttribute.TARGET.ARRAY_BUFFER;
		this.idleTime = 0;


		this._locations = new Array();
	}

	/**
	 * Return the number of items in data array (numValues / itemSize).
	 *
	 * @returns Item count.
	 */
	count() {
		return this._array.length / this._itemSize;
	}

	/**
	 * Set buffer data and set dirty to true.
	 *
	 * @param val Value to be set.
	 */
	set array(val) {
		if (this._array.length == val.length)
			this._update = true;
		else
			this._dirty = true;
		this._array = val;
	}

	/**
	 * Set size of an item and set dirty to true.
	 *
	 * @param val Size to be set.
	 */
	set itemSize(val) {
		this._itemSize = val;
		this._dirty = true;
	}

	/**
	 * Set dirty flag.
	 *
	 * @param val Value to be set.
	 */
	set dirty(val) {
		this._dirty = val;
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
	get dirty() { return this._dirty; }
	get update() { return this._update; }
	set update(update) { this._update = update; }

	get divisor() { return this._divisor; }
	set divisor(divisor) { this._divisor = divisor; }

	get drawType() { return this._drawType; }

	get target() { return this._target; }
	set target(target) { this._target = target; }
	get locations() { return this._locations; }
	set locations(locations) { this._locations = locations; }


	update(){
		this._update = true;
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