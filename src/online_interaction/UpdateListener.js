/**
 * Created by Primoz on 19. 06. 2016.
 */

export class UpdateListener {
	constructor(onObjectUpdate, onHierarchyUpdate, onMaterialUpdate, onGeometryUpdate) {
		this._onObjectUpdate = (onObjectUpdate) ? onObjectUpdate : function () {};
		this._onHierarchyUpdate = (onHierarchyUpdate) ? onHierarchyUpdate : function () {};
		this._onMaterialUpdate = (onMaterialUpdate) ? onMaterialUpdate : function () {};
		this._onGeometryUpdate = (onGeometryUpdate) ? onGeometryUpdate : function () {};
	}

	get objectUpdate() { return this._onObjectUpdate; }
	get hierarchyUpdate() { return this._onHierarchyUpdate; }
	get materialUpdate() { return this._onMaterialUpdate; }
	get geometryUpdate() { return this._onGeometryUpdate; }


	set objectUpdate(callback) { this._onObjectUpdate = callback; }
	set hierarchyUpdate(callback) { this._onHierarchyUpdate = callback; }
	set materialUpdate(callback) { this._onMaterialUpdate = callback; }
	set geometryUpdate(callback) { this._onGeometryUpdate = callback; }
};