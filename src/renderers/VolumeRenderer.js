/**
 * Created by Ziga on 25.3.2016.
 */


/**
 * @class VolumeRenderer
 */

import {Renderer} from './Renderer.js';
import {Float32Attribute, Uint32Attribute} from '../core/BufferAttribute.js';

export class VolumeRenderer extends Renderer {

    constructor(canvas, gl_version) {
        // Call abstract Renderer constructor
        super(canvas, gl_version);

        // region CONSTRUCT QUAD
        this.quadVtx = new Float32Attribute([
            -1, -1, 0,
             1, -1, 0,
             1,  1, 0,
            -1,  1, 0
        ], 3);
        this.quadIdx = new Uint32Attribute([0, 1, 2, 0, 2, 3], 1);
        this.quadUv = new Float32Attribute([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ], 2);

        this._glManager.updateBufferAttribute(this.quadVtx, false);
        this._glManager.updateBufferAttribute(this.quadIdx, true);
        this._glManager.updateBufferAttribute(this.quadUv, false);
        // endregion

        // Set the selected renderer
        this._selectedRenderer = this._volumeRender;
    }

    _volumeRender(scene, camera) {

        // Define required programs
        for (let vol of scene.children) {
            this._requiredPrograms.push(vol.material.requiredProgram());
        }

        // Load the required programs
        // Required programs for each render iteration should be listed in the _requiredPrograms array
        if (!this._loadRequiredPrograms()) {
            return;
        }

        for (let vol of scene.children) {
            let material = vol.material;

            // TODO: Implement this
            let program = this._compiledPrograms.get(material.requiredProgram().programID);
            program.use();

            this._setup_attributes(program);

            this._setup_uniforms(program, vol, camera);

            // Draw the quad
            let buffer = this._glManager.getAttributeBuffer(this.quadIdx);
            this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, buffer);

            this._gl.drawElements(this._gl.TRIANGLES, this.quadIdx.count(), this._gl.UNSIGNED_INT, 0)
        }
    }

    // TODO: Implement this. Add additional parameters if needed.
    _setup_uniforms(program, volume, camera) {
        let uniformSetter = program.uniformSetter;

        uniformSetter["material.color"].set(volume.material.color.toArray());
        uniformSetter["volColor"].set(volume.color.toArray());
    }

    // TODO: Implement this. Add additional parameters if needed.
    _setup_attributes(program) {
        let attributeSetter = program.attributeSetter;

        // Setup quad attributes
        attributeSetter["VPos"].set(this._glManager.getAttributeBuffer(this.quadVtx), 3);
        if (attributeSetter["uv"]) {
            attributeSetter["uv"].set(this._glManager.getAttributeBuffer(this.quadUv), 3);
        }
    }
};