import {Mesh} from './Mesh.js';
import {Quad} from './Quad.js';
import {ZMultiMeshBasicMaterial} from '../materials/ZMultiMeshBasicMaterial.js';
import {Vector2} from '../RenderCore.js';
import {Color} from "../math/Color.js";


export class ZMultiMesh extends Mesh {

    constructor(geometry = null, material = null) {
        if (material === null) {
            material = new ZMultiMeshBasicMaterial();
        }
        material.normalFlat = true;
        let pmat = material.clone_for_picking();
        let omat = material.clone_for_outline();

        //SUPER
        super(geometry, material, pmat, omat);

        this.type = "ZMultiMesh";
    }

	draw(gl, glManager, instance_count=0) {
        let us = glManager._currentProgram.uniformSetter;

        let us_imat  = us["u_IMat"];
        console.log("ZMultiMesh IMat uniform setter ", us["u_IMat"]);
        if (typeof us_imat === 'undefined') {
            console.log("zmultmesh IMat undefined");
            return;
        }

		const glBuffer = glManager.getGLBuffer(this.geometry.indices);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glBuffer);


        if (glManager._currentMaterial === this._material)
        {
            let us_col = us["material.diffuse"];

            let nnodes = this.nodeShapeIds.length;
            for (let i = 0; i < nnodes; ++i) {
                
                if (this.nodeVisibility[i] === false) {
                    continue;
                }

                // node shape
                let shapeId = this.nodeShapeIds[i];
                
                // node matrix
                let transOff = i*16;
                let nodeTrans = this.nodeTrans.slice(transOff, transOff + 16);

                // us_col.set([this.nodeColors[i], this.nodeColors[i+1], this.nodeColors[i+2], this.nodeColors[i+3]]);
                us_col.set([this.nodeColors[4*i+2]/255.0, this.nodeColors[4*i+1]/255.0, this.nodeColors[4*i]/255.0, 1.0]);
                // console.log(this.nodeColors[i], this.nodeColors[i+1], this.nodeColors[i+2], 0);
                us_imat.set(nodeTrans);

                gl.drawElements(this.renderingPrimitive, this.shapeIndicesSize[shapeId], gl.UNSIGNED_INT, 4*this.shapeIndicesOff[shapeId]);

                // gl.drawArrays(this.renderingPrimitive, offset, n_tring * 3);

                // if (i > 100) return;
            }
        }
        else if (glManager._currentMaterial === this._outlineMaterial)
        {
            let draw_list = this._outlineMaterial._instanceList;
            for (let dli = 0; dli < draw_list.length; ++dli) {
                let i = draw_list[dli];
                // draw as above, without color setting

                // node shape
                let shapeId = this.nodeShapeIds[i];
                
                // node matrix
                let transOff = i*16;
                let nodeTrans = this.nodeTrans.slice(transOff, transOff + 16);

                us_imat.set(nodeTrans);

                gl.drawElements(this.renderingPrimitive, this.shapeIndicesSize[shapeId], gl.UNSIGNED_INT, 4*this.shapeIndicesOff[shapeId]);
            }
        }
        else if (glManager._currentMaterial === this._pickingMaterial)
        {
            // if first pass / object selecion
            //    draw all with same uniform color (as set up by meshRenderer)
            // else
            //    draw all with internal instance-id uniform

            let us_iid = us["u_InstanceID"];

            let nnodes = this.nodeShapeIds.length;
            for (let i = 0; i < nnodes; ++i) {


                if (this.nodeVisibility[i] === false) {
                    continue;
                }
                // node shape
                let shapeId = this.nodeShapeIds[i];
                
                // node matrix
                let transOff = i*16;
                let nodeTrans = this.nodeTrans.slice(transOff, transOff + 16);

                us_imat.set(nodeTrans);
                us_iid.set(i);

                gl.drawElements(this.renderingPrimitive, this.shapeIndicesSize[shapeId], gl.UNSIGNED_INT, 4*this.shapeIndicesOff[shapeId]);
            }
        }
        else
        {
            console.warn("Object " + this.type + " unknown material reference");
	    }
    }
}
