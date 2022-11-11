import { STRIPE_SPACE_SCREEN } from "../constants.js";
import { Float32Attribute } from "../core/BufferAttribute.js";
import { Color } from "../math/Color.js";
import { StripeBasicMaterial } from "./StripeBasicMaterial.js";


export class StripesBasicMaterial extends StripeBasicMaterial {
    constructor(args = {}){
        //SUPER
        super();


        this.type = "StripesBasicMaterial";
        this.programName = "basic_stripes";


        //ASSEMBLE MATERIAL
        this.color = args.color ? args.color : new Color(Math.random() * 0xffffff);
        this.emissive = args.emissive ? args.emissive : new Color(Math.random() * 0xffffff);

        //this.setUniform("aspect", args.aspect ? args.aspect : window.innerWidth/window.innerHeight);
        //this.setUniform("viewport", args.viewport ? args.viewport : [window.innerWidth, window.innerHeight]);
        //this.setUniform("halfLineWidth", args.lineWidth? args.lineWidth/2.0 : 1.0/2.0);
        this.lineWidth = (args.lineWidth !== undefined) ? args.lineWidth : 1.0;
        this.mode = (args.mode !== undefined) ? args.mode : STRIPE_SPACE_SCREEN;
        this.prevVertex = (args.baseGeometry !== undefined) ? StripesBasicMaterial._setupPrevVertices(args.baseGeometry) : null;
        this.nextVertex = (args.baseGeometry !== undefined) ? StripesBasicMaterial._setupNextVertices(args.baseGeometry) : null;
        this.deltaOffset = (args.baseGeometry !== undefined) ? StripesBasicMaterial._setupDeltaDirections(args.baseGeometry) : null;
    }


    get lineWidth() { return this._lineWidth; }
    set lineWidth(lineWidth) {
        this._lineWidth = lineWidth;
        this.setUniform("halfLineWidth", lineWidth/2.0);
    }
    get mode() { return this._mode; }
    set mode(mode) {
        this._mode = mode;
        this.setUniform("MODE", mode);
    }
    get prevVertex() { return this._prevVertex; }
    set prevVertex(prevVertex) {
        this._prevVertex = prevVertex;
        this.setAttribute("prevVertex", prevVertex);
    }
    get nextVertex() { return this._nextVertex; }
    set nextVertex(nextVertex) {
        this._nextVertex = nextVertex;
        this.setAttribute("nextVertex", nextVertex);
    }
    get deltaOffset() { return this._deltaOffset; }
    set deltaOffset(deltaOffset) {
        this._deltaOffset = deltaOffset;
        this.setAttribute("deltaOffset", deltaOffset);
    }


    static _setupPrevVertices(baseGeometry){
        if(baseGeometry.indices){
            const baseVertices = baseGeometry.vertices;
            const baseIndices = baseGeometry.indices;
            const stripePrevVertices = new Array(baseIndices.count() * 2 * 3);
        
            for(let i = 0; i < baseIndices.count(); i++) {
                if(i % 2 === 0){
                    stripePrevVertices[i*3*2 + 0] = baseVertices.array[(baseIndices.array[i-0])*3 + 0];
                    stripePrevVertices[i*3*2 + 1] = baseVertices.array[(baseIndices.array[i-0])*3 + 1];
                    stripePrevVertices[i*3*2 + 2] = baseVertices.array[(baseIndices.array[i-0])*3 + 2];
        
                    stripePrevVertices[i*3*2 + 3] = baseVertices.array[(baseIndices.array[i-0])*3 + 0];
                    stripePrevVertices[i*3*2 + 4] = baseVertices.array[(baseIndices.array[i-0])*3 + 1];
                    stripePrevVertices[i*3*2 + 5] = baseVertices.array[(baseIndices.array[i-0])*3 + 2];
                }else{
                    stripePrevVertices[i*3*2 + 0] = baseVertices.array[(baseIndices.array[i-1])*3 + 0];
                    stripePrevVertices[i*3*2 + 1] = baseVertices.array[(baseIndices.array[i-1])*3 + 1];
                    stripePrevVertices[i*3*2 + 2] = baseVertices.array[(baseIndices.array[i-1])*3 + 2];
        
                    stripePrevVertices[i*3*2 + 3] = baseVertices.array[(baseIndices.array[i-1])*3 + 0];
                    stripePrevVertices[i*3*2 + 4] = baseVertices.array[(baseIndices.array[i-1])*3 + 1];
                    stripePrevVertices[i*3*2 + 5] = baseVertices.array[(baseIndices.array[i-1])*3 + 2];
                }
            }
        
            return new Float32Attribute(stripePrevVertices, 3);
        }else{
            const baseIndices = baseGeometry.vertices;
            const stripePrevVertices = new Array(baseIndices.count() * 2 * 3);
        
            for(let v = 0; v < baseIndices.count(); v++) {
                if(v % 2 === 0){
                    stripePrevVertices[v*3*2 + 0] = baseIndices.array[(v-0)*3 + 0];
                    stripePrevVertices[v*3*2 + 1] = baseIndices.array[(v-0)*3 + 1];
                    stripePrevVertices[v*3*2 + 2] = baseIndices.array[(v-0)*3 + 2];
        
                    stripePrevVertices[v*3*2 + 3] = baseIndices.array[(v-0)*3 + 0];
                    stripePrevVertices[v*3*2 + 4] = baseIndices.array[(v-0)*3 + 1];
                    stripePrevVertices[v*3*2 + 5] = baseIndices.array[(v-0)*3 + 2];
                }else{
                    stripePrevVertices[v*3*2 + 0] = baseIndices.array[(v-1)*3 + 0];
                    stripePrevVertices[v*3*2 + 1] = baseIndices.array[(v-1)*3 + 1];
                    stripePrevVertices[v*3*2 + 2] = baseIndices.array[(v-1)*3 + 2];
        
                    stripePrevVertices[v*3*2 + 3] = baseIndices.array[(v-1)*3 + 0];
                    stripePrevVertices[v*3*2 + 4] = baseIndices.array[(v-1)*3 + 1];
                    stripePrevVertices[v*3*2 + 5] = baseIndices.array[(v-1)*3 + 2];
                }
            }
        
            return new Float32Attribute(stripePrevVertices, 3);
        }
    }
    static _setupNextVertices(baseGeometry){
        if(baseGeometry.indices){
            const baseVertices = baseGeometry.vertices;
            const baseIndices = baseGeometry.indices;
            const stripeNextVertices = new Array(baseIndices.count() * 2 * 3);
    
            for(let i = 0; i < baseIndices.count(); i++) {
                if(i % 2 === 0){
                    stripeNextVertices[i*3*2 + 0] = baseVertices.array[(baseIndices.array[i+1])*3 + 0];
                    stripeNextVertices[i*3*2 + 1] = baseVertices.array[(baseIndices.array[i+1])*3 + 1];
                    stripeNextVertices[i*3*2 + 2] = baseVertices.array[(baseIndices.array[i+1])*3 + 2];
        
                    stripeNextVertices[i*3*2 + 3] = baseVertices.array[(baseIndices.array[i+1])*3 + 0];
                    stripeNextVertices[i*3*2 + 4] = baseVertices.array[(baseIndices.array[i+1])*3 + 1];
                    stripeNextVertices[i*3*2 + 5] = baseVertices.array[(baseIndices.array[i+1])*3 + 2];
                }else{
                    stripeNextVertices[i*3*2 + 0] = baseVertices.array[(baseIndices.array[i+0])*3 + 0];
                    stripeNextVertices[i*3*2 + 1] = baseVertices.array[(baseIndices.array[i+0])*3 + 1];
                    stripeNextVertices[i*3*2 + 2] = baseVertices.array[(baseIndices.array[i+0])*3 + 2];
        
                    stripeNextVertices[i*3*2 + 3] = baseVertices.array[(baseIndices.array[i+0])*3 + 0];
                    stripeNextVertices[i*3*2 + 4] = baseVertices.array[(baseIndices.array[i+0])*3 + 1];
                    stripeNextVertices[i*3*2 + 5] = baseVertices.array[(baseIndices.array[i+0])*3 + 2];
                }
            }
    
            return new Float32Attribute(stripeNextVertices, 3);
        }else{
            const baseIndices = baseGeometry.vertices;
            const stripeNextVertices = new Array(baseIndices.count() * 2 * 3);
        
            for(let v = 0; v < baseIndices.count(); v = v+1) {
                if(v % 2 === 0){
                    stripeNextVertices[v*3*2 + 0] = baseIndices.array[(v+1)*3 + 0];
                    stripeNextVertices[v*3*2 + 1] = baseIndices.array[(v+1)*3 + 1];
                    stripeNextVertices[v*3*2 + 2] = baseIndices.array[(v+1)*3 + 2];
        
                    stripeNextVertices[v*3*2 + 3] = baseIndices.array[(v+1)*3 + 0];
                    stripeNextVertices[v*3*2 + 4] = baseIndices.array[(v+1)*3 + 1];
                    stripeNextVertices[v*3*2 + 5] = baseIndices.array[(v+1)*3 + 2];
                }else{
                    stripeNextVertices[v*3*2 + 0] = baseIndices.array[(v+0)*3 + 0];
                    stripeNextVertices[v*3*2 + 1] = baseIndices.array[(v+0)*3 + 1];
                    stripeNextVertices[v*3*2 + 2] = baseIndices.array[(v+0)*3 + 2];
        
                    stripeNextVertices[v*3*2 + 3] = baseIndices.array[(v+0)*3 + 0];
                    stripeNextVertices[v*3*2 + 4] = baseIndices.array[(v+0)*3 + 1];
                    stripeNextVertices[v*3*2 + 5] = baseIndices.array[(v+0)*3 + 2];
                }
            }
        
            return new Float32Attribute(stripeNextVertices, 3);
        }
    }
    static _setupDeltaDirections(baseGeometry){
        if(baseGeometry.indices){
            const indices = baseGeometry.indices;
            const stripeDeltaDirections = new Array(indices.count() * 2 * 2);
    
            for(let i = 0; i < indices.count(); i++) {
                // stripeDeltaDirections[i*4*2 + 0] = -1;
                // stripeDeltaDirections[i*4*2 + 1] = +1;
    
                // stripeDeltaDirections[i*4*2 + 2] = -1;
                // stripeDeltaDirections[i*4*2 + 3] = -1;
    
                // stripeDeltaDirections[i*4*2 + 4] = +1;
                // stripeDeltaDirections[i*4*2 + 5] = +1;
    
                // stripeDeltaDirections[i*4*2 + 6] = +1;
                // stripeDeltaDirections[i*4*2 + 7] = -1;
                stripeDeltaDirections[i*4 + 0] = (i % 2 == 0) ? -1 : +1;
                stripeDeltaDirections[i*4 + 1] = +1;
    
                stripeDeltaDirections[i*4 + 2] = (i % 2 == 0) ? -1 : +1;
                stripeDeltaDirections[i*4 + 3] = -1;
            }
    
            return new Float32Attribute(stripeDeltaDirections, 2);
        }else{
            const baseIndices = baseGeometry.vertices;
            const stripeDeltaDirections = new Array(baseIndices.count() * 2 * 2);
    
            for(let v = 0; v < baseIndices.count(); v++) {
                // stripeDeltaDirections[v*4*2 + 0] = -1;
                // stripeDeltaDirections[v*4*2 + 1] = +1;
    
                // stripeDeltaDirections[v*4*2 + 2] = -1;
                // stripeDeltaDirections[v*4*2 + 3] = -1;
    
                // stripeDeltaDirections[v*4*2 + 4] = +1;
                // stripeDeltaDirections[v*4*2 + 5] = +1;
    
                // stripeDeltaDirections[v*4*2 + 6] = +1;
                // stripeDeltaDirections[v*4*2 + 7] = -1;
                stripeDeltaDirections[v*4 + 0] = (v % 2 == 0) ? -1 : +1;
                stripeDeltaDirections[v*4 + 1] = +1;
    
                stripeDeltaDirections[v*4 + 2] = (v % 2 == 0) ? -1 : +1;
                stripeDeltaDirections[v*4 + 3] = -1;
            }
    
            return new Float32Attribute(stripeDeltaDirections, 2);
        }
    }
}