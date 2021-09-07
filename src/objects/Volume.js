/**
 * Created by Ziga on 20.4.2016.
 */

import {Object3D} from '../core/Object3D.js';

import {Color} from '../math/Color.js';
import {VolumeBasicMaterial} from '../materials/VolumeBasicMaterial.js';

export class Volume extends Object3D {

	constructor(data, dimensions) {
		super();

		this.dimensions = dimensions;
		this.data = data;
		this.color = new Color(0x00ff00);

		this._material = new VolumeBasicMaterial();
	}

	get material() { return this._material; }
};