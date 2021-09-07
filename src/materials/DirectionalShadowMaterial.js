import { FRONT_AND_BACK_SIDE } from "../constants.js";
import {CustomShaderMaterial} from "./CustomShaderMaterial.js";


export class DirectionalShadowMaterial extends CustomShaderMaterial {

    constructor() {
        super("directionalShadow");

        this.type = "DirectionalShadowMaterial";
        this.side = FRONT_AND_BACK_SIDE;
    }
}