import { Float32Attribute, Uint32Attribute } from '../core/BufferAttribute.js';
import {_Math} from '../math/Math.js';
import { Geometry } from './Geometry.js';


export class StripesGeometry extends Geometry {
	constructor(args = {}) {
        //SUPER
		super();


		this.type = "StripesGeometry";


		//ASSEMBLE GEOMETRY
		this.vertices = StripesGeometry._setupVertices(args.baseGeometry);
		this.indices = StripesGeometry._setupIndices(args.baseGeometry);
	}


	static _setupVertices(baseGeometry) {
        if(baseGeometry.indices){
            const baseVertices = baseGeometry.vertices;
            const baseIndices = baseGeometry.indices;
            const stripeVertices = new Array(baseIndices.count() * 2 * 3);
    
            for(let i = 0; i < baseIndices.count(); i++) {
                stripeVertices[i*3*2 + 0] = baseVertices.array[baseIndices.array[i]*3 + 0];
                stripeVertices[i*3*2 + 1] = baseVertices.array[baseIndices.array[i]*3 + 1];
                stripeVertices[i*3*2 + 2] = baseVertices.array[baseIndices.array[i]*3 + 2];
        
                stripeVertices[i*3*2 + 3] = baseVertices.array[baseIndices.array[i]*3 + 0];
                stripeVertices[i*3*2 + 4] = baseVertices.array[baseIndices.array[i]*3 + 1];
                stripeVertices[i*3*2 + 5] = baseVertices.array[baseIndices.array[i]*3 + 2];
            }
    
            return new Float32Attribute(stripeVertices, 3);
        }else{
            const baseVertices = baseGeometry.vertices;
            const stripeVertices = new Array(baseVertices.count() * 2 * 3);
        
            for(let v = 0; v < baseVertices.count(); v++) {
                //general form (tested), similar for next nad prev vertex
                /*for(let itemSize_iter = 0; itemSize_iter < 2*3; itemSize_iter++){
                    stripeVertices[v*2*3 + itemSize_iter] = baseVertices.array[v*3 + (itemSize_iter % 3)];
                }*/
        
                //vector3 unrolled form
                stripeVertices[v*3*2 + 0] = baseVertices.array[v*3 + 0];
                stripeVertices[v*3*2 + 1] = baseVertices.array[v*3 + 1];
                stripeVertices[v*3*2 + 2] = baseVertices.array[v*3 + 2];
        
                stripeVertices[v*3*2 + 3] = baseVertices.array[v*3 + 0];
                stripeVertices[v*3*2 + 4] = baseVertices.array[v*3 + 1];
                stripeVertices[v*3*2 + 5] = baseVertices.array[v*3 + 2];
            }
        
            return new Float32Attribute(stripeVertices, 3);
        }
	}
	static _setupIndices(baseGeometry) {
        if(baseGeometry.indices){
            /*const indices = baseGeometry.indices;
            const stripeIndices = new Array(indices.count() * 3);
    
            for(let i = 0; i < indices.count(); i = i+2) {
                stripeIndices[i*3 + 0] = 2*indices.array[i + 0] + 0;
                stripeIndices[i*3 + 1] = 2*indices.array[i + 0] + 1;
                stripeIndices[i*3 + 2] = 2*indices.array[i + 1] + 0;
    
                stripeIndices[i*3 + 3] = 2*indices.array[i + 1] + 1;
                stripeIndices[i*3 + 4] = 2*indices.array[i + 1] + 0;
                stripeIndices[i*3 + 5] = 2*indices.array[i + 0] + 1;
            }
    
            return new Uint32Attribute(stripeIndices, 1);*/
            const indices = baseGeometry.indices;
            const stripeIndices = new Array(indices.count() * 3);
    
            for(let i = 0; i < indices.count(); i+=2) {
                stripeIndices[i*3 + 0] = 2*(i + 0) + 0;
                stripeIndices[i*3 + 1] = 2*(i + 0) + 1;
                stripeIndices[i*3 + 2] = 2*(i + 1) + 0;
    
                stripeIndices[i*3 + 3] = 2*(i + 1) + 1;
                stripeIndices[i*3 + 4] = 2*(i + 1) + 0;
                stripeIndices[i*3 + 5] = 2*(i + 0) + 1;
            }
    
            return new Uint32Attribute(stripeIndices, 1);
        }else{
            const baseVertices = baseGeometry.vertices;
            const stripeIndices = new Array(baseVertices.count() * 3);
    
            for(let v = 0; v < baseVertices.count(); v+=2) {
                stripeIndices[v*3 + 0] = 2*(v + 0) + 0;
                stripeIndices[v*3 + 1] = 2*(v + 0) + 1;
                stripeIndices[v*3 + 2] = 2*(v + 1) + 0;
    
                stripeIndices[v*3 + 3] = 2*(v + 1) + 1;
                stripeIndices[v*3 + 4] = 2*(v + 1) + 0;
                stripeIndices[v*3 + 5] = 2*(v + 0) + 1;
            }
    
            return new Uint32Attribute(stripeIndices, 1);
        }
    }
}