/**
 * Created by Primoz on 29.6.2016.
 */

import {Object3D} from '../core/Object3D.js';

const _identity = [1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1];

/**
 * A node that draws nothing itself.
 *
 * A group can name one of its children as its own drawing, `self`. The group
 * carries the matrix and `self` sits at identity under it. `visibleChildren`
 * hides the other children while `self` stays subject to its own `visible`:
 * the renderer walks `drawnChildren`, which leaves the other children out when
 * `visibleChildren` is false. Every other traversal sees all children.
 */
export class Group extends Object3D {
	constructor () {
		super(true);

		this.type = "Group";

		this._self = null;
		this._visibleChildren = true;
	}

	get isGroup() { return true; }

	/** The child that draws the group's own content, or null. */
	get self() { return this._self; }

	/**
	 * Make `obj` the group's own drawing, replacing the previous one, which is
	 * removed. `obj` is added as a child and reset to identity: the group
	 * carries the matrix. A matrix given to `obj` afterwards applies under the
	 * group's, like any child's. Null only removes the previous one.
	 */
	set self(obj) {
		if (obj === this._self) return;
		if (obj === this) { console.error("Group.self: a group cannot be its own self"); return; }
		if (this._self !== null) super.remove(this._self);
		this._self = null;
		if (obj === null) return;

		// add() takes obj from its parent first, which may be this group.
		this.add(obj);
		this._self = obj;
		if (obj._position) {
			obj._position.set(0, 0, 0);
			obj._quaternion.set(0, 0, 0, 1);
			obj._scale.set(1, 1, 1);
		}
		obj.setMatrixFromArray(_identity);
	}

	/** Whether the children other than `self` are drawn. */
	get visibleChildren() { return this._visibleChildren; }
	set visibleChildren(val) { this._visibleChildren = val; }

	/** The children the renderer descends into, see the class comment. */
	get drawnChildren() {
		if (this._visibleChildren) return this._children;
		return this._self !== null ? [this._self] : [];
	}

	remove(object) {
		if (object === this._self) this._self = null;
		super.remove(object);
	}

	clear() {
		this._self = null;
		super.clear();
	}

	static fromJson(data) {

		var group = new Group();

		// Object3D fromJson
		group = super.fromJson(data, group);

		return group;
	}

	fillRenderArray(){
        //NOOP
	}
	project(){
		//NOOP
	}
	getRequiredPrograms(renderer){
		//NOOP
		return [];
	}
	update(glManager, camera){
		//NOOP
	}
};
