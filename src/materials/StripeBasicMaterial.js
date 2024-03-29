import {CustomShaderMaterial} from "./CustomShaderMaterial.js";
import {Color} from "../math/Color.js";


export class StripeBasicMaterial extends CustomShaderMaterial {
    constructor(){
        super();

        this.type = "StripeBasicMaterial";
        this.programName = "basic_stripe";
        this._color = new Color(Math.random() * 0xffffff);
        this._emissive = new Color(Math.random() * 0x000000);
        this._lineWidth = 1.0;
    }

    get lineWidth() { return this._lineWidth; }
    set lineWidth(val) {
        if (val !== this._lineWidth) {
            this._lineWidth = val;

            // Notify onChange subscriber
            if (this._onChangeListener) {
                var update = {uuid: this._uuid, changes: {lineWidth: this._lineWidth}};
                this._onChangeListener.materialUpdate(update)
            }
        }
    }
    get color() { return this._color; }
    set color(val) {
        this._color = val;

        // Notify onChange subscriber
        if (this._onChangeListener) {
            var update = {uuid: this._uuid, changes: {color: this._color.getHex()}};
            this._onChangeListener.materialUpdate(update)
        }
    }
    get emissive() { return this._emissive; }
    set emissive(val) {
        if (!val.equals(this._emissive)) {
            this._emissive = val;

            // Notify onChange subscriber
            if (this._onChangeListener) {
                var update = {uuid: this._uuid, changes: {emissive: this._emissive.getHex()}};
                this._onChangeListener.materialUpdate(update)
            }
        }
    }

    update(data) {
        super.update(data);

        for (let prop in data) {
            switch (prop) {
                case "color":
                    this._color = data.color;
                    delete data.color;
                    break;
                case "emissive":
                    this._emissive = data.emissive;
                    delete data.emissive;
                    break;
                case "lineWidth":
                    this._lineWidth = data.lineWidth;
                    delete data.lineWidth;
                    break;
            }
        }
    }
}