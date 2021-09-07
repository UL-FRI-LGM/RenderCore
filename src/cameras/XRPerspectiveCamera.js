/**
 * Created by Sebastien.
 */
import {PerspectiveCamera} from './PerspectiveCamera.js';


export class XRPerspectiveCamera extends PerspectiveCamera {

    constructor(fov, aspect, near, far) {
        super(fov, aspect, near, far);

        this.type = "XRPerspectiveCamera";
        this._leftCamera = new PerspectiveCamera(fov, aspect, near, far);
        this._rightCamera = new PerspectiveCamera(fov, aspect, near, far);
    }

    get leftCamera () { return this._leftCamera; }
    get rightCamera () { return this._rightCamera; }
}