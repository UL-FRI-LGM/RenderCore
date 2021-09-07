/**
 * Created by Ziga, Primoz & Sebastien on 1.4.2016.
 */

export class BufferAttribute {

	/**
	 * Create new BufferAttribute object.
	 *
	 * @param array Buffer data.
	 * @param itemSize Size of an item.
	 */
	constructor(array, itemSize) {
		this._array = array;
		this._itemSize = itemSize;

		// Tells if local copies are up to date
		this._dirty = true;

		//Divisor used by instancing
		this._divisor = 0;
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
		this._array = val;
		this._dirty = true;
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

	/**
	 * Check if buffer was modified.
	 *
	 * @returns True if modified.
	 */
	get dirty() { return this._dirty; }

	get divisor() { return this._divisor; }
	set divisor(divisor) { this._divisor = divisor; }
};

export function Int8Attribute (array, itemSize) {
	return new BufferAttribute(new Int8Array(array), itemSize);
};

export function Uint8Attribute (array, itemSize) {
	return new BufferAttribute(new Uint8Array(array), itemSize);
};

export function Uint8ClampedAttribute (array, itemSize) {
	return new BufferAttribute(new Uint8ClampedArray(array), itemSize);
};

export function Int16Attribute (array, itemSize) {
	return new BufferAttribute(new Int16Array(array), itemSize);
};

export function Uint16Attribute (array, itemSize) {
	return new BufferAttribute(new Uint16Array(array), itemSize);
};

export function Int32Attribute (array, itemSize) {
	return new BufferAttribute(new Int32Array(array), itemSize);
};

export function Uint32Attribute (array, itemSize) {
	return new BufferAttribute(new Uint32Array(array), itemSize);
};

export function Float32Attribute (array, itemSize) {
	return new BufferAttribute(new Float32Array(array), itemSize);
};

export function Float64Attribute (array, itemSize) {
	return new BufferAttribute(new Float64Array(array), itemSize);
};