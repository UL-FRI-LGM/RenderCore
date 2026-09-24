import {ZText} from "./ZText.js";
import {Geometry} from "./Geometry.js";
import {BufferAttribute} from "../core/BufferAttribute.js";
import {TEXT2D_SPACE_ANCHOR} from "../constants.js";

/**
 * Labels for a 3D axis system: many strings, each anchored at its own world
 * point, in one mesh and one draw call.
 *
 * This is ZTextAxis's trick lifted from 2D to 3D, but only half of it lifts.
 * ZTextAxis puts tick quads and glyph quads in a single buffer because in a 2D
 * projected view both are plain screen-space rectangles. In 3D a tick or an
 * axis line has to keep a constant width in *pixels* while running in a *world*
 * direction, and the screen-space perpendicular that needs is camera-dependent,
 * so it cannot be baked into a static vertex buffer. RC.Stripes already solves
 * exactly that, in its vertex shader -- so the lines and ticks of a 3D axis are
 * Stripes, and what lives here is the text.
 *
 * (If constant-*pixel* ticks are ever wanted rather than constant-world-length
 * ones, the way in is a second per-vertex attribute holding the world direction
 * to lay the offset along; the shader can then project and normalise it. That
 * would bring the lines back into this buffer too. Not done: nothing yet needs
 * it, and it doubles the per-vertex cost.)
 *
 * What the anchor mode buys, and why the labels are worth pulling out:
 *
 *   - every label is camera-facing for free, with no per-object matrix and no
 *     billboard bookkeeping;
 *   - size is a uniform, not geometry, so the fixed / semi-perspective /
 *     perspective choice is one number and needs no rebuild;
 *   - N labels cost one draw call, where N ZText objects cost N.
 */
export class Z3DAxis extends ZText {
    /// Size attenuation presets. See the `atten` uniform in ZText.vert: the
    /// screen offset of every vertex is scaled by pow(w_ref / w, atten).
    static ATTEN_FIXED       = 0.0;  ///< same pixel size at any distance
    static ATTEN_SEMI        = 0.4;  ///< depth reads, far labels stay legible
    static ATTEN_PERSPECTIVE = 1.0;  ///< shrinks exactly like geometry

    constructor(args = {}) {
        super(Object.assign({}, args, { mode: TEXT2D_SPACE_ANCHOR }));
        this.type = "Z3DAxis";

        // Decoration, like ZTextAxis: no dragging, no resize grip, no hover.
        this.pickable  = false;
        this.resizable = false;
        this.draw_frame = false;

        this._labels = args.labels || [];
        this._atten  = args.atten !== undefined ? args.atten : Z3DAxis.ATTEN_FIXED;
        this.material.setUniform("atten", this._atten);
        this.material.setUniform("w_ref", 1.0);
        if (this.pickingMaterial) this.pickingMaterial.setUniform("atten", this._atten);
    }

    /**
     * Replace the label set and rebuild.
     *
     * Each label is { text, pos: [x,y,z], px, py, ah, av }:
     *   pos     the world point it hangs off
     *   px, py  offset from that point, in the same screen units as ZText's
     *           vertex buffer (px is divided by the aspect in the shader, so the
     *           two are isotropic; ZText.PX_TO_SCREEN_SPACE converts from CSS
     *           pixels). This is what puts a number *beside* a tick rather than
     *           on top of it.
     *   ah, av  which point of the text box lands there -- ZText.ALIGN_H/_V.
     */
    setLabels(labels) {
        this._labels = labels || [];
        if (this._font && this._fontTexture) this.recalcGeometry();
    }

    /// 0 = constant pixel size, 1 = shrinks exactly like geometry, in between is
    /// the readable compromise. A uniform, so this needs no rebuild.
    setAttenuation(k) {
        this._atten = k;
        this.material.setUniform("atten", k);
        if (this.pickingMaterial) this.pickingMaterial.setUniform("atten", k);
    }

    getAttenuation() { return this._atten; }

    /// Label size, as a fraction of viewport height. Unlike the attenuation
    /// this is baked into the glyph quads, so it costs a geometry rebuild --
    /// hence a setter that does one rather than a uniform.
    setFontSize(sz) {
        if (sz === this._fontSize) return;
        this._fontSize = sz;
        if (this._font && this._fontTexture) this.recalcGeometry();
    }

    /**
     * The distance at which a label is drawn at its nominal size, as a
     * clip-space w. Everything nearer than this grows and everything further
     * shrinks, by `atten`. Pass the w of the point the size was chosen for --
     * in practice the centre of the axis box.
     *
     * Under an orthographic camera every w is 1, and so is this, so the whole
     * attenuation term collapses to 1 -- which is correct: there is no
     * perspective to attenuate.
     */
    setReferenceW(w) {
        const v = (w > 1e-6) ? w : 1.0;
        this.material.setUniform("w_ref", v);
        if (this.pickingMaterial) this.pickingMaterial.setUniform("w_ref", v);
    }

    /// Width of a single-line string in text units, without laying it out.
    /// Same as ZTextAxis._measure; kept local so neither class owns the other.
    _measure(txt, font, scale) {
        let w = 0, prev = " ";
        for (let i = 0; i < txt.length; ++i) {
            const c = txt.charAt(i);
            if (c === " ") { w += font.space_advance * scale; prev = " "; continue; }
            const fc = font.chars[c] || font.chars["?"];
            if (!fc) continue;
            const kern = font.kern[prev + c] || 0.0;
            w += font.aspect * scale * (fc.advance_x + kern);
            prev = c;
        }
        return w;
    }

    recalcGeometry() {
        // _labels is deliberately tested for existence, not just emptiness:
        // ZText's constructor calls recalcGeometry() as soon as it has a font
        // and a texture, which is BEFORE this subclass has run its own field
        // initialisers. ZTextAxis survives the same call only by accident, on
        // an undefined _camBounds.
        if (!this._font || !this._labels || !this._labels.length) {
            this.geometry = undefined;
            return;
        }

        const font = this._font;
        const fm   = ZText._fontMetrics(font, this._fontSize, 0.0);

        let nGlyph = 0;
        for (const L of this._labels)
            for (let i = 0; i < L.text.length; ++i)
                if (L.text.charAt(i) !== " ") ++nGlyph;
        if (nGlyph === 0) { this.geometry = undefined; return; }

        const verts   = new Float32Array(12 * nGlyph);  // 6 verts * vec2
        const uvs     = new Float32Array(12 * nGlyph);
        const anchors = new Float32Array(18 * nGlyph);  // 6 verts * vec3

        const rect = (arr, vi, l, r, t, b) => {
            arr[vi++] = l; arr[vi++] = t;  arr[vi++] = l; arr[vi++] = b;
            arr[vi++] = r; arr[vi++] = t;  arr[vi++] = r; arr[vi++] = t;
            arr[vi++] = l; arr[vi++] = b;  arr[vi++] = r; arr[vi++] = b;
            return vi;
        };

        let vi = 0, ui = 0, ai = 0;
        for (const L of this._labels) {
            const w  = this._measure(L.text, font, fm.cap_scale);
            const ah = L.ah !== undefined ? L.ah : ZText.ALIGN_H.CENTER;
            const av = L.av !== undefined ? L.av : ZText.ALIGN_V.MIDDLE;

            let ox = 0, oy = 0;
            if (ah === ZText.ALIGN_H.CENTER) ox = -0.5 * w;
            else if (ah === ZText.ALIGN_H.RIGHT) ox = -w;
            if (av === ZText.ALIGN_V.MIDDLE) oy = 0.5 * fm.ascent;
            else if (av === ZText.ALIGN_V.BOTTOM) oy = fm.ascent;
            else if (av === ZText.ALIGN_V.TOP) oy = 0.0;

            // px is in the pre-aspect-divide units the shader expects, matching
            // VPos.x -- so a label offset and a glyph advance are in one system.
            const px = (L.px || 0.0), py = (L.py || 0.0);
            let pen = px + ox;
            const baseY = py + oy - fm.ascent;
            const P = L.pos;

            let prev = " ";
            for (let i = 0; i < L.text.length; ++i) {
                const c = L.text.charAt(i);
                if (c === " ") { pen += font.space_advance * fm.cap_scale; prev = " "; continue; }
                const fc = font.chars[c] || font.chars["?"];
                if (!fc) continue;
                const kern = font.kern[prev + c] || 0.0;
                const g = fc.rect;
                const bot = baseY - fm.cap_scale * (font.descent + font.iy);
                const top = bot + fm.cap_scale * font.row_height;
                const lft = pen + font.aspect * fm.cap_scale * (fc.bearing_x + kern - font.ix);
                const rgt = lft + font.aspect * fm.cap_scale * (g[2] - g[0]);
                vi = rect(verts, vi, lft, rgt, top, bot);
                ui = rect(uvs,   ui, g[0], g[2], 1 - g[1], 1 - g[3]);
                for (let k = 0; k < 6; ++k) {
                    anchors[ai++] = P[0]; anchors[ai++] = P[1]; anchors[ai++] = P[2];
                }
                pen += font.aspect * fm.cap_scale * fc.advance_x;
                prev = c;
            }
        }

        const geometry = new Geometry();
        geometry.vertices = new BufferAttribute(verts, 2);
        geometry.uv = new BufferAttribute(uvs, 2);
        this.geometry = geometry;

        // The anchor rides on the material, not the geometry: MeshRenderer only
        // knows the fixed set of geometry attributes (VPos, uv, VNorm, ...) and
        // reaches anything else through material._attributes.
        const anchor_attr = new BufferAttribute(anchors, 3);
        this.material.setAttribute("anchor", anchor_attr);
        if (this.pickingMaterial) this.pickingMaterial.setAttribute("anchor", anchor_attr);

        this.material.setUniform("scale", fm.cap_scale);
        this.material.setUniform("sdf_oo_N_pix_in_char", font.iy / font.cap_height);
        this.material.setUniform("sdf_text_size", this._fontSize);
        this.material.setUniform("offset", [0.0, 0.0]);   // anchors are absolute
        this.syncPickingUniforms();
    }

    /**
     * Draw the whole buffer.
     *
     * ZText::draw() must not be inherited here. It reserves the first
     * ZText.HDR_VERTS (42) vertices for the plate, the frame and the resize
     * grip, draws those in three separate calls, and then draws the glyphs from
     * index HDR_VERTS onward. This class has no plate, frame or grip: its
     * buffer is glyphs from index 0.
     *
     * Inheriting it therefore ate the first seven glyphs -- 42 vertices at six
     * per quad -- which on an axis system is the whole of the first two labels
     * and the leading character of the third. It presented as "-30 and -20 are
     * missing from the x axis and -10 has lost its minus", with the label array
     * and the vertex buffer both perfectly correct, so it looked for a long
     * while like a layout or clipping problem rather than a draw-range one.
     *
     * ZTextAxis overrides draw() for its own reasons (ticks and glyphs in one
     * buffer, drawn with different uniforms) and so never hit this.
     */
    draw(gl, glManager) {
        if (!this.geometry) return;
        const us = glManager._currentProgram.uniformSetter;
        // Picking and outline variants do not declare the colour uniforms and
        // have nothing to take from a decoration; same test ZTextAxis uses.
        if (!us["u_use_fixed_color"] || !us["u_fixed_color"]) return;
        gl.drawArrays(this.renderingPrimitive, 0, this.geometry.vertices.count());
    }
}
