import {Mesh} from './Mesh.js';
import {Geometry} from './Geometry.js';
import {Texture} from '../textures/Texture.js';
import {ZLinesBasicMaterial} from '../materials/ZLinesBasicMaterial.js';

/**
 * A set of lines drawn with one instanced draw call. Each line is a sequence
 * of control points; each point carries a position, a unit direction and the
 * arc length to the next point, and the segment between two points is a cubic
 * Hermite evaluated in the vertex shader. Zero directions make a segment
 * straight, so a plain polyline is the same object with samples = 1.
 *
 * One instance is one point and draws the segment to the next point; the last
 * point of a line carries arc length 0 and draws nothing. The strip has
 * 2 * (samples + 1) vertices and no vertex buffer: the shader derives t and the
 * side from gl_VertexID. See basic_zlines_template.vert for the texel layout.
 *
 * Picking writes the line index of the picked instance; the outline pass takes
 * a list of point instances through outlineMaterial.outline_instances_setup().
 */
export class ZLines extends Mesh {
    constructor(material = null, args = {}) {
        if (material === null) {
            material = new ZLinesBasicMaterial(args);
        }
        super(new Geometry(), material, material.clone_for_picking(), material.clone_for_outline());
        this.type = "ZLines";

        this.instanced = true;
        this.instanceCount = args.pointCount !== undefined ? args.pointCount : 0;
        // There is no geometry to take bounds from.
        this.frustumCulled = false;
    }

    get materials() { return [this.material, this.pickingMaterial, this.outlineMaterial]; }

    /** The two data textures, shared by the drawing, picking and outline materials. */
    setTextures(pointTexture, lineTexture) {
        for (const m of this.materials) m._instanceData = [pointTexture, lineTexture];
    }

    get samples() { return this.material.samples; }
    set samples(n) { for (const m of this.materials) m.samples = n; }

    get lineWidth() { return this.material.lineWidth; }
    set lineWidth(w) { for (const m of this.materials) m.lineWidth = w; }

    get screenWidth() { return this.material.screenWidth; }
    set screenWidth(b) { for (const m of this.materials) m.screenWidth = b; }

    draw(gl, glManager, instance_count = 0) {
        if (!instance_count) instance_count = this._instanceCount;
        if (instance_count <= 0) return;
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * (this.material.samples + 1), instance_count);
    }

    /** Texture dimensions for n RGBA texels: the width is even, so a point's two
     *  texels never straddle a row, and near the square root of n. */
    static textureSize(nTexels) {
        let w = Math.ceil(Math.sqrt(nTexels));
        if (w % 2) ++w;
        return [w, Math.max(1, Math.ceil(nTexels / w))];
    }

    static makeDataTexture(array, nTexels) {
        const [w, h] = ZLines.textureSize(nTexels);
        let data = array;
        if (array.length < 4 * w * h) {
            data = new Float32Array(4 * w * h);
            data.set(array);
        }
        const tex = new Texture(data,
            Texture.WRAPPING.ClampToEdgeWrapping, Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.NearestFilter, Texture.FILTER.NearestFilter,
            Texture.FORMAT.RGBA32F, Texture.FORMAT.RGBA, Texture.TYPE.FLOAT, w, h);
        tex.flipy = false;
        return tex;
    }

    /**
     * Pack lines into the two arrays the textures take.
     * lines: [{ points: [[x,y,z], ...], dirs: [[dx,dy,dz], ...] or undefined,
     *           lens: [L, ...] or undefined, color: [r,g,b], visible: bool }]
     * Without dirs the segments are straight; without lens the arc length is
     * the chord. Returns { points, lines, nPoints, nLines }.
     */
    static pack(lines) {
        let nPoints = 0;
        for (const l of lines) nPoints += l.points.length;
        const pts = new Float32Array(8 * nPoints);
        const lts = new Float32Array(4 * lines.length);
        let ip = 0;
        for (let il = 0; il < lines.length; ++il) {
            const l = lines[il];
            const n = l.points.length;
            for (let i = 0; i < n; ++i) {
                const p = l.points[i];
                let L = 0;
                if (i < n - 1) {
                    if (l.lens) L = l.lens[i];
                    else {
                        const q = l.points[i + 1];
                        L = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
                    }
                    if (L <= 0) L = 1e-6;
                }
                const d = l.dirs ? l.dirs[i] : [0, 0, 0];
                pts.set([p[0], p[1], p[2], L, d[0], d[1], d[2], il], 8 * ip);
                ++ip;
            }
            const c = l.color ? l.color : [1, 1, 1];
            lts.set([c[0], c[1], c[2], l.visible === false ? 0 : 1], 4 * il);
        }
        return { points: pts, lines: lts, nPoints: nPoints, nLines: lines.length };
    }

    /** Build the textures from pack()'s result and install them. */
    setLines(packed) {
        this.setTextures(ZLines.makeDataTexture(packed.points, 2 * packed.nPoints),
                         ZLines.makeDataTexture(packed.lines, packed.nLines));
        this.instanceCount = packed.nPoints;
    }
}
