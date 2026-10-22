import {Mesh} from './Mesh.js';
import {Geometry} from './Geometry.js';
import {Texture} from '../textures/Texture.js';
import {Int32Attribute} from '../core/BufferAttribute.js';
import {ZLinesBasicMaterial} from '../materials/ZLinesBasicMaterial.js';

/**
 * A set of lines drawn with instanced draw calls, one instance per segment.
 * A segment is a cubic Hermite between two points, evaluated in the vertex
 * shader from the points' positions and directions and the segment's arc
 * length; a zero direction is replaced by the Catmull-Rom estimate from the
 * neighbour points. The data layout is described in ZLinesData.js, which
 * also holds the builder for strokes authored on the client; REve hands over
 * the server-packed arrays through ZLinesData.fromArrays().
 *
 * The strip has 2 * (samples + 1) vertices and no vertex buffer: the shader
 * derives t and the side from gl_VertexID. The strip is drawn u_Margin pixels
 * wider than the line and the fragment shader cuts and antialiases the edge on
 * the distance from the centre line.
 *
 * draw() is the visibility planner: it walks the stroke table, merges
 * consecutive visible strokes into runs of segments and issues one draw per
 * run with u_InstanceOffset set to the run's first segment. Above runThreshold
 * runs it draws a list of the visible segments through the a_Instances
 * attribute instead. The plan is cached; tablesChanged() invalidates it.
 *
 * Picking writes the segment index; the outline pass takes a list of segments
 * through outlineMaterial.outline_instances_setup().
 */
export class ZLines extends Mesh {
    constructor(material = null, args = {}) {
        if (material === null) {
            material = new ZLinesBasicMaterial(args);
        }
        super(new Geometry(), material, material.clone_for_picking(), material.clone_for_outline());
        this.type = "ZLines";

        this.instanced = true;
        this.instanceCount = 0;
        // There is no geometry to take bounds from.
        this.frustumCulled = false;

        this.runThreshold = 64;
        this._data = null;
        this._pointsTex = null;
        this._tablesTex = null;
        this._plan = null;
        this._listAttr = null;
    }

    get materials() { return [this.material, this.pickingMaterial, this.outlineMaterial]; }

    get samples() { return this.material.samples; }
    set samples(n) { for (const m of this.materials) m.samples = n; }

    get lineWidth() { return this.material.lineWidth; }
    set lineWidth(w) { for (const m of this.materials) m.lineWidth = w; }

    get screenWidth() { return this.material.screenWidth; }
    set screenWidth(b) { for (const m of this.materials) m.screenWidth = b; }

    get margin() { return this.material.margin; }
    set margin(px) { for (const m of this.materials) m.margin = px; }

    get data() { return this._data; }

    static _makeTexture(image, size, internalFormat, format, type) {
        const tex = new Texture(image,
            Texture.WRAPPING.ClampToEdgeWrapping, Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter, Texture.FILTER.NearestFilter,
            internalFormat, format, type, size[0], size[1]);
        tex.flipy = false;
        return tex;
    }

    /** Build the two textures over data.points and data.tables and keep data for draw(). */
    setData(data) {
        this._data = data;
        this._pointsTex = ZLines._makeTexture(data.points, data.pointsSize,
            Texture.FORMAT.RGBA32F, Texture.FORMAT.RGBA, Texture.TYPE.FLOAT);
        this._tablesTex = ZLines._makeTexture(data.tables, data.tablesSize,
            Texture.FORMAT.RGBA32I, Texture.FORMAT.RGBA_INTEGER, Texture.TYPE.INT);
        for (const m of this.materials) {
            m._instanceData = [this._pointsTex, this._tablesTex];
            m.segBase = data.segBase;
        }
        this.instanceCount = data.nSegs;
        this._plan = null;
    }

    /** The point positions changed in data.points: re-upload. */
    pointsChanged() {
        if (this._pointsTex) this._pointsTex.needsUpload();
    }

    /** The tables changed in data.tables (visibility, colours): re-upload and re-plan. */
    tablesChanged() {
        if (this._tablesTex) this._tablesTex.needsUpload();
        this._plan = null;
    }

    /** The draw plan: { runs: [first, count, first, count, ...], nRuns, nVisible, list }. */
    get plan() {
        if (this._plan === null) this._plan = this._makePlan();
        return this._plan;
    }

    _makePlan() {
        const d = this._data;
        const runs = [];
        let nVisible = 0;
        if (d) {
            for (let k = 0; k < d.nStrokes; ++k) {
                const n = d.strokeCount(k);
                if (n <= 0 || !d.strokeVisible(k)) continue;
                const first = d.strokeFirstSeg(k);
                const last = runs.length - 2;
                if (last >= 0 && runs[last] + runs[last + 1] === first)
                    runs[last + 1] += n;
                else
                    runs.push(first, n);
                nVisible += n;
            }
        }
        const plan = { runs: runs, nRuns: runs.length / 2, nVisible: nVisible, list: null };
        if (plan.nRuns > this.runThreshold) {
            const list = new Int32Array(nVisible);
            for (let r = 0, j = 0; r < runs.length; r += 2)
                for (let s = runs[r], e = runs[r] + runs[r + 1]; s < e; ++s) list[j++] = s;
            if (this._listAttr === null) this._listAttr = Int32Attribute(list, 1, 1);
            else this._listAttr.array = list;
            plan.list = this._listAttr;
        }
        return plan;
    }

    draw(gl, glManager, instance_count = 0) {
        const nVert = 2 * (this.material.samples + 1);
        const mat = glManager._currentMaterial;
        const prog = glManager._currentProgram;
        const us = prog.uniformSetter;
        const setOffset = (v) => { if (us.u_InstanceOffset) us.u_InstanceOffset.set(v); };

        // A given list of segments: the outline of a selection.
        if (!instance_count && mat && mat.getUniform("u_GivenInstances"))
            instance_count = mat.getAttribute("a_Instances").count();
        if (instance_count > 0) {
            setOffset(0);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, nVert, instance_count);
            return;
        }

        const plan = this.plan;
        if (plan.nVisible === 0) return;
        if (plan.list) {
            const as = prog.attributeSetter.a_Instances;
            as.set(plan.list, 1, true, 1);
            us.u_GivenInstances.set(true);
            setOffset(0);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, nVert, plan.list.count());
            us.u_GivenInstances.set(false);
            const own = mat.getAttribute("a_Instances");
            as.set(own, 1, true, own.divisor);
        } else {
            const r = plan.runs;
            for (let i = 0; i < r.length; i += 2) {
                setOffset(r[i]);
                gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, nVert, r[i + 1]);
            }
        }
    }
}
