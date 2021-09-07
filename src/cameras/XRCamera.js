/**
 * Created by Sebastien.
 */
import {Camera} from '../cameras/Camera.js';


export class XRCamera extends Camera {

    constructor() {
        super();

        this.type = "XRCamera";
        this._leftCamera = new Camera();
        this._rightCamera = new Camera();
    }

    get leftCamera () { return this._leftCamera; }
    get rightCamera () { return this._rightCamera; }
}