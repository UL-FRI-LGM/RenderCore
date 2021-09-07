/**
 * Created by Primoz on 26. 06. 2016.
 */

import {singleton, singletonEnforcer, SUPPRESS_DEFAULT_KEYBOARD_KEYS} from '../constants.js';

export class KeyboardInput {

    /**
     * Create new KeyboardInput object.
     *
     * @param enforcer Singleton enforcer.
     */
    constructor(enforcer) {
        // Do not allow singleton duplicates
        if(enforcer != singletonEnforcer) { throw "Cannot construct singleton" };

        let self = this;
        this._pressedKeys = new Set();
        this._listeners = [];

        document.addEventListener("keydown", function (event) {
            //if ( $('input:focus, textarea:focus').length > 0 ) {  return; }
            if( document.querySelectorAll("input:focus, textarea:focus").length > 0 ) {return;}

            self._pressedKeys.add(event.keyCode);

            // Disable arrow key default behavior
            if(SUPPRESS_DEFAULT_KEYBOARD_KEYS.indexOf(event.keyCode) > -1) {
                event.preventDefault();
            }
        });

        document.addEventListener("keyup", function (event) {
            self._pressedKeys.delete(event.keyCode)
        });
    }

    /**
     * Add keyboard input listener to the array of listeners.
     *
     * @param listener Listener to be added.
     */
    // region LISTENER MANAGER
    addListener(listener) {
        this._listeners.push(listener);
    }

    /**
     * Remove a listener from the array of listeners.
     *
     * @param listener Listener to be removed.
     */
    rmListener(listener) {
        let i = this._listeners.indexOf(listener);

        if (i > -1) {
            this._listeners.splice(i, 1);
        }
    }

    /**
     * Clear all listeners.
     */
    clearListeners() {
        this._listeners = [];
    }
    // endregion

    /**
     * Notify listeners of pressed keys.
     */
    notifyListeners() {
        for (let i = 0; i < this._listeners.length; i++) {
            this._listeners[i](this._pressedKeys)
        }
    }

    /**
     * Notify listeners of pressed keys.
     *
     * @returns Pressed keys.
     */
    update() {
        this.notifyListeners();

        return this._pressedKeys;
    }

    /**
     * Retrieve singleton instance.
     *
     * @returns Singleton instance.
     */
    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new KeyboardInput(singletonEnforcer);
        }

        return this[singleton];
    }
};