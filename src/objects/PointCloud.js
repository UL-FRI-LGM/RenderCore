/**
 * Created by Sebastien
 * @type {PointCloud}
 */

import {Group} from './Group.js';
import {Point} from './Point.js';


export class PointCloud extends Group {

	//CONSTRUCTOR
	constructor(numberOfPoints, data, geometry, material, pickingMaterial) {
		super(); //Object 3D of a whole cloud

		this._numberOfPoints = numberOfPoints;
		this._data = data;

		this._geometry = geometry; //geo.new_attrib = newbuffer;
		this._material = material;

		this.type = "PointCloud";

        this.add(new Point(geometry, material, pickingMaterial));
	}


	//SET GET
	set numberOfPoints(numberOfPoints){this._numberOfPoints = numberOfPoints;}
	set data(data){this._data = data;}
	set geometry(geometry){this._geometry = geometry;}
	set material(material){this._material = material;}
	set usePoints(value){this._usePoints = value;}

	get numberOfPoints(){return this._numberOfPoints;}
	get data(){return this._data;}
	get geometry(){return this._geometry;}
	get material(){return this._material;}
	get usePoints(){return this._usePoints;}


	//FUNC
	addPoints(points){
		let newSize = this._numberOfPoints + points.numberOfPoints;

		let dataAttributes = Object.keys(this._data);
		let newAttributes = Object.keys(points.data);
		let allAttributes = new Set(dataAttributes.concat(newAttributes));

		for (let attribute of allAttributes) {
			if (dataAttributes.includes(attribute) && newAttributes.includes(attribute))
			{
				// attribute in both, merge
				let attributeType = this.data[attribute].constructor;
				let merged = new attributeType(this.data[attribute].length + points.data[attribute].length);

				merged.set(this.data[attribute], 0);
				merged.set(points.data[attribute], this.data[attribute].length);

				this.data[attribute] = merged;
			}
			else if (dataAttributes.includes(attribute) && !newAttributes.includes(attribute))
			{
				// attribute only in current data; take over data and expand to new size
				let elementsPerPoint = this.data[attribute].length / this._numberOfPoints;
				let attributeType = this.data[attribute].constructor;
				let expanded = new attributeType(elementsPerPoint * newSize);

				expanded.set(this.data[attribute], 0);

				this.data[attribute] = expanded;
			}
			else if (!dataAttributes.includes(attribute) && newAttributes.includes(attribute))
			{
				// attribute only in points to be added; take over new points and expand to new size
				let elementsPerPoint = points.data[attribute].length / points.numberOfPoints;
				let attributeType = points.data[attribute].constructor;
				let expanded = new attributeType(elementsPerPoint * newSize);

				expanded.set(points.data[attribute], elementsPerPoint * this._numberOfPoints);

				this.data[attribute] = expanded;
			}
		}

		this._numberOfPoints = newSize;
	}
};