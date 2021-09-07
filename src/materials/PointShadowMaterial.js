import { FRONT_AND_BACK_SIDE } from "../constants.js";
import {CustomShaderMaterial} from "./CustomShaderMaterial.js";


export class PointShadowMaterial extends CustomShaderMaterial {

    constructor(uniforms = {}, attributes = {}) {
        super("pointShadow", uniforms, attributes);

        this.type = "PointShadowMaterial";
        this.side = FRONT_AND_BACK_SIDE;
    }
}