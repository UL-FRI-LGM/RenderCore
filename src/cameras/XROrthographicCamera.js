/**
 * Created by Sebastien.
 */
import {OrthographicCamera} from './OrthographicCamera.js';


export class XROrthographicCamera extends OrthographicCamera {

    constructor(left, right, top, bottom, near, far) {
        super(left, right, top, bottom, near, far);

        this.type = "XROrthographicCamera";
        this._leftCamera = new OrthographicCamera(left, right, top, bottom, near, far);
        this._rightCamera = new OrthographicCamera(left, right, top, bottom, near, far);
    }

    get leftCamera () { return this._leftCamera; }
    get rightCamera () { return this._rightCamera; }
}