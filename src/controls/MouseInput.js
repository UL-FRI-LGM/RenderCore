/**
 * Created by Primoz Lavric on 22-Mar-17.
 */

import {singleton, singletonEnforcer} from '../constants.js';
import {Vector2} from '../math/Vector2.js';

export class MouseInput {

    /**
     * Create new MouseInput object.
     *
     * @param enforcer Singleton enforcer.
     */
    constructor(enforcer) {
        // Do not allow singleton duplicates
        if (enforcer != singletonEnforcer) { throw "Cannot construct singleton"; }

        this._wheelDeltaY = 0;

        this.cursor = {
            prevPosition: new Vector2(-Infinity, -Infinity),
            position: new Vector2(-Infinity, -Infinity),
            buttons: {left: false, middle: false, right: false},
            wheel: {
                deltaY: 0
            }
        };

        this._currentPosition = new Vector2(-Infinity, -Infinity);

        this.sourceDOMObject = null;

        // Listen for events on whole window
        this.setSourceObject(document.body);

        let self = this;

        this._mouseDownHandle = function(event) {
            if (event.button === 0) {
                self.cursor.buttons.left = true;
            }
            else if (event.button === 1) {
                self.cursor.buttons.middle = true;
            }
            else {
                self.cursor.buttons.right = true;
            }
        };

        this._mouseUpHandle = function(event) {
            if (event.button === 0) {
                self.cursor.buttons.left = false;
            }
            else if (event.button === 1) {
                self.cursor.buttons.middle = false;
            }
            else {
                self.cursor.buttons.right = false;
            }
        };

        this._mouseMoveHandle = function(event) {
            self._currentPosition.x = (event.clientX / window.innerWidth) * 2 - 1;
            self._currentPosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
        };

        this._mouseLeave = function (event) {
            self.cursor.buttons.left = false;
            self.cursor.buttons.middle = false;
            self.cursor.buttons.right = false;
        };

        this._wheelHandle = function (event) {
            self._wheelDeltaY = event.deltaY;
        };

        this._contexMenuHandle = function (event) {
            event.preventDefault()
        }
    }

    /**
     * Set the source of mouse input.
     *
     * @param object Source object.
     */
    setSourceObject(object) {

        if (this.sourceDOMObject != null) {
            this.sourceDOMObject.removeEventListener('mousedown', this._mouseDownHandle);
            this.sourceDOMObject.removeEventListener('mouseup', this._mouseUpHandle);
            this.sourceDOMObject.removeEventListener('mousemove', this._mouseMoveHandle);
            this.sourceDOMObject.removeEventListener('mouseleave', this._mouseLeave);
            this.sourceDOMObject.removeEventListener('wheel', this._wheelHandle);
            // Do not open menu after left clicking
            this.sourceDOMObject.removeEventListener('contextmenu', this._contexMenuHandle);
        }

        this.sourceDOMObject = object;

        // Setup mouse event listeners
        this.sourceDOMObject.addEventListener("mousedown", this._mouseDownHandle);
        this.sourceDOMObject.addEventListener("mouseup", this._mouseUpHandle);
        this.sourceDOMObject.addEventListener('mousemove', this._mouseMoveHandle);
        this.sourceDOMObject.addEventListener('mouseleave', this._mouseLeave);
        this.sourceDOMObject.addEventListener('wheel', this._wheelHandle);
        // Do not open menu after left clicking
        this.sourceDOMObject.addEventListener('contextmenu', this._contexMenuHandle);
    };

    /**
     * Update mouse input internal state.
     *
     * @returns Cursor.
     */
    update() {
        // Reset local scroll data after updating
        this.cursor.wheel.deltaY = this._wheelDeltaY;
        this._wheelDeltaY = 0;

        this.cursor.prevPosition.copy(this.cursor.position);
        this.cursor.position.copy(this._currentPosition);

        return this.cursor;
    }

    /**
     * Retrieve singleton instance.
     *
     * @returns Singleton instance.
     */
    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new MouseInput(singletonEnforcer);
        }

        return this[singleton];
    }
};