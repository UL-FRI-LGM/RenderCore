import {Mesh} from "./Mesh.js";
import {Geometry} from "./Geometry.js";
import {BufferAttribute} from "../core/BufferAttribute.js";
import {Texture} from "../textures/Texture.js";
import {ZTextMaterial} from "../materials/ZTextMaterial.js";
import {TEXT2D_SPACE_WORLD, TEXT2D_SPACE_SCREEN, TEXT2D_SPACE_MIXED, TEXT2D_SPACE_ANCHOR} from "../constants.js";

//ZText API
export class ZText extends Mesh {
    /// Vertices reserved before the glyphs; see the map in setText2D().
    static HDR_VERTS = 42;
    //--------------------------------------------------------------------------
    // Resize-grip tunables. The grip is a small square in the bottom-right
    // corner, drawn on hover, which starts a resize instead of a move. Its size
    // is exported through getScreenRect() so the viewer hit-tests exactly the
    // square that is drawn -- change these and both follow.
    //--------------------------------------------------------------------------

    /// Grip side, as a fraction of min(box width, ONE line height). Deliberately
    /// one line: a multi-line note has no bigger text, so it needs no bigger grip.
    static RESIZE_GRIP_FRAC = 0.05;
    /// ...but never smaller than this many CSS pixels. On a one-line label the
    /// fraction alone is a few pixels, which under-advertises a target that is
    /// comfortably grabbable. At this size the grip overlaps the glyphs, which is
    /// fine -- it is drawn only while hovered.
    static GRIP_MIN_PX = 28;
    /// Smallest interactive font size, in CSS pixels.
    static MIN_FONT_SIZE_PX = 7;
    /// Floor for the frame's line width, in CSS pixels. The width is a fraction
    /// of the line height, so it shrinks with the text and eventually falls
    /// below a pixel, where the frame's quads rasterise to nothing -- edge by
    /// edge rather than all at once, so a box loses its top rule first and looks
    /// broken rather than merely small.
    static MIN_FRAME_LINE_PX = 0.5;
    /// Grip line thickness, as a fraction of the frame line width...
    static GRIP_LINE_FRAC = 0.25;
    /// ...floored at this many CSS pixels. A quarter of a thin frame is
    /// sub-pixel, and the short arm of the L vanishes while the long one
    /// survives as a hairline, so the grip stops reading as a square.
    static GRIP_LINE_MIN_PX = 1.5;
    /// Clearance between grip and frame: the larger of the grip line width and
    /// this fraction of the grip square.
    static GRIP_GAP_FRAC = 0.10;

    //--------------------------------------------------------------------------
    // Anchoring. `offset` places the text; these say WHICH point of the text
    // lands there. Same model as TGLFont::Render(..., ETextAlignH_e,
    // ETextAlignV_e), which shifts the whole block by a fraction of its bounding
    // box -- so it is applied here at layout time and the shader is untouched.
    //
    // ORIGIN is the legacy behaviour and stays the default: the position is the
    // text origin (the pen start), which sits slightly inside the box because of
    // the frame border. The other values are relative to the box, which is what
    // an axis label wants -- CENTER/TOP to hang under a tick on a bottom axis,
    // RIGHT/MIDDLE against a left axis, and so on.
    //--------------------------------------------------------------------------
    static ALIGN_H = { ORIGIN: 0, LEFT: 1, CENTER: 2, RIGHT: 3 };
    static ALIGN_V = { ORIGIN: 0, TOP: 1, MIDDLE: 2, BOTTOM: 3 };

    /// Default CSS-pixel scale, used until a viewer supplies its own. NOTE this
    /// is only a fallback: the real value is per viewer (see _pxToScreen), since
    /// two viewers of different heights would otherwise fight over one static --
    /// which is exactly the multi-view case REve is built for.
    ///
    /// CSS pixels -> the units the vertex buffer is built in, for SCREEN (and
    /// MIXED) mode. In those modes the vertex shader computes
    ///     screen = offset + vec2(VPos.x / aspect, VPos.y)
    /// so VPos.y is directly a fraction of viewport height and VPos.x is divided
    /// by the aspect ratio -- which makes the two axes isotropic in pixels, both
    /// scaled by the viewport height. Hence one CSS pixel is
    /// pixelRatio / canvas.height, which the viewer keeps up to date.
    ///
    /// Only meaningful in screen space: in TEXT2D_SPACE_WORLD the vertex units
    /// are object space and a pixel size cannot be expressed at all, which is
    /// why the resize grip is a screen-mode affordance only.
    static PX_TO_SCREEN_SPACE = 1.0 / 900.0;

    constructor(args = {}) {
        super();
        this.type = "ZText";
        this.frustumCulled = false;

        this._fontTexture = args.fontTexture !== undefined ? args.fontTexture : null;
        this._xPos = args.xPos !== undefined ? (args.xPos) : 1.0;
        this._yPos = args.yPos !== undefined ? (args.yPos) : 0;
        this._mode = args.mode !== undefined ? args.mode : TEXT2D_SPACE_SCREEN;
        /// Corner-grip resizing; moving is governed by `pickable`.
        this.resizable = args.resizable !== undefined ? args.resizable : true;
        this._alignH = args.alignH !== undefined ? args.alignH : ZText.ALIGN_H.ORIGIN;
        this._alignV = args.alignV !== undefined ? args.alignV : ZText.ALIGN_V.ORIGIN;
        this._grip_size = 0; // set when the geometry is laid out
        /// Per-object CSS-pixel scale; the owning viewer keeps it current.
        this._pxToScreen = ZText.PX_TO_SCREEN_SPACE;
        this._fontHinting = args.fontHinting !== undefined ? args.fontHinting : 1.0;
        this._fontWeight = args.fontWeight !== undefined ? args.fontWeight : 0.0;
        this._color = args.color !== undefined ? args.color : [0.0,0.0,0.0];
        this._font = args.font !== undefined ? args.font : null;

        this._fontSize = args.fontSize !== undefined ? args.fontSize : 1;

        if (this._mode !== TEXT2D_SPACE_SCREEN && this._mode !== TEXT2D_SPACE_WORLD &&
            this._mode !== TEXT2D_SPACE_MIXED  && this._mode !== TEXT2D_SPACE_ANCHOR)
            console.error('[' + this.type + "]: Unknow mode [" + this._mode + ']');

        this.material = new ZTextMaterial();
        if (this._mode === TEXT2D_SPACE_ANCHOR) this.material.enableAnchor3D();
        // Uniforms aspect and viewport set by MeshRenderer based on actual viewport
        this.material.setUniform("MODE", this._mode);
        this.material.setUniform("offset", [this._xPos, this._yPos]);
        this.material.setUniform("hint_amount", this._fontHinting);
        this.material.setUniform("weight", this._fontWeight);
        this.material.setUniform("u_use_fixed_color", 0);
        this.material.setUniform("u_fixed_color", [0.0, 0.0, 0.0, 0.0]);


        this.material.color = args.color;

        // ZText places itself in the vertex shader from `offset`, the viewport
        // aspect and MODE. The generic TRIANGLES picker that Mesh installs on
        // first use of `pickable` knows none of that, so it puts the pick quad at
        // the object origin and picking silently misses in SCREEN and MIXED modes.
        // Compile this very program into its picking variant instead.
        this.pickingMaterial = this.material.clone_for_picking();

        this._text = args.text !== undefined ? args.text : "Default text";
        if (this._fontTexture != null && this._font != null) {
            this.material.addMap(this._fontTexture);
            this.recalcGeometry();
        } else {
            this.geometry = undefined; // Avoid bounding box calculation on uninitialized gometry.
        }
    }

    recalcGeometry() {
        let font_metrics = ZText._fontMetrics( this._font, this._fontSize, this._fontSize * 0 );
        this.geometry = this.setText2D(this._text, 0, 0, font_metrics, this._font);
        this.material.setUniform("scale", font_metrics.cap_scale);
        this.material.setUniform("sdf_oo_N_pix_in_char", this._font.iy / this._font.cap_height);
        this.material.setUniform("sdf_text_size", this._fontSize);
        this.syncPickingUniforms();
    }

    // Override visibility to avoid rendering of uninitialized objects.
    get visible() {
        return super.visible && this._fontTexture != null && this._font != null;
    }
    set visible(vis) {
        super.visible = vis;
    }

    //--------------------------------------------------------------------------
    // Overlay interaction interface. GlViewerRCore drives move and resize
    // through these rather than through ZText's own fields, so anything that
    // implements them -- a logo sprite, say -- is draggable on the same code.
    //--------------------------------------------------------------------------
    ovlGetPos()      { return [this._xPos, this._yPos]; }
    ovlSetPos(x, y)  { this.setOffset([x, y]); }
    ovlGetSize()     { return this._fontSize; }
    /// Floored like ZLogo's: a resize drag could otherwise take the text to zero,
    /// leaving nothing on screen and nothing to grab to bring it back. The floor
    /// is in CSS pixels, so it means the same thing on any viewport.
    ovlSetSize(s)    { this.fontSize = Math.max(s, ZText.MIN_FONT_SIZE_PX * this._pxToScreen); }

    /// Tell the object how big a CSS pixel is in its viewport, and rebuild if it
    /// changed. Returns true if the geometry was rebuilt.
    setPixelScale(pxToScreen, vpW, vpH) {
        if (Math.abs(pxToScreen - this._pxToScreen) < 1e-9) return false;
        this._pxToScreen = pxToScreen;
        if (this.geometry) { this.recalcGeometry(); return true; }
        return false;
    }

    /// Which point of the box the position refers to; see ALIGN_H / ALIGN_V.
    setAlign(alignH, alignV) {
        if (alignH === this._alignH && alignV === this._alignV) return;
        this._alignH = alignH;
        this._alignV = alignV;
        if (this.geometry) this.recalcGeometry();
    }

    set text(text) {
        this._text = text;
        this.recalcGeometry();
    }
    get text() {
        return this._text;
    }
    get fontTexture() {
        return this._fontTexture;
    }
    set xPos(xPos) {
        this._xPos = xPos;
    }
    get xPos() {
        return this._xPos;
    }
    set yPos(yPos) {
        this._yPos = yPos;
    }
    get yPos() {
        return this._yPos;
    }
    set fontSize(fontSize) {
        this._fontSize = fontSize;
        this.recalcGeometry();
    }

    /// Recolour in place: glyphs take `text`, ticks and frame take `line`.
    /// Needed because the viewer's foreground colour can change after the object
    /// is built -- flipping to a black background is the obvious case.
    setColors(text_color, line_color) {
        if (text_color) { this._color = text_color; this.material.color = text_color; }
        if (line_color) { this.line_color = line_color; }
    }

    /// Synthetic bold: 0 is the font as authored, positive is heavier.
    set fontWeight(w) {
        this._fontWeight = w;
        this.material.setUniform("weight", w);
    }
    get fontWeight() { return this._fontWeight; }
    get fontSize() {
        return this._fontSize;
    }

    setupFrameStuff(text_alpha, draw_frame, fill_color, fill_alpha, line_color, line_alpha, extra_border, line_width) {
        if (text_alpha !== 1.0 || (draw_frame && ((fill_alpha < 1.0 && fill_alpha !== 0.0)
                                               || (line_alpha < 1.0 && line_alpha !== 0.0))))
        {
            this.material.transparent = true;
            this.material.opacity = text_alpha;
            this.material.depthWrite = false; // Depth-write/mask enabled for opaque parts in draw().
        }
        this.draw_frame = draw_frame;
        this.fill_color = fill_color;
        this.fill_alpha = fill_alpha;
        this.line_color = line_color;
        this.line_alpha = line_alpha;
        // TGLOverlayButton keeps a normal and a highlight alpha; same idea here.
        this._norm_fill_alpha = fill_alpha;
        this._norm_line_alpha = line_alpha;
        this._highlight = false;
        this.extra_border = extra_border;
        this.line_width = line_width;
    }

    /// Mouse-over feedback: pull the plate towards opaque and light up the
    /// resize-grip mark, so an interactive annotation announces itself. Kept just
    /// short of 1.0 so draw() does not flip depth-writing on a hover.
    setHighlight(on) {
        if (this._highlight === on) return;
        this._highlight = on;
        if (on) {
            this.fill_alpha = Math.min(0.98, this._norm_fill_alpha + 0.30);
            this.line_alpha = Math.min(0.98, this._norm_line_alpha + 0.30);
        } else {
            this.fill_alpha = this._norm_fill_alpha;
            this.line_alpha = this._norm_line_alpha;
        }
    }

    get highlight() { return this._highlight; }

    /// The offset uniform IS the screen position of the text box, in (0,1)
    /// screen coordinates. Keep xPos/yPos in step so callers can read it back.
    setOffset(offset) {
        this._xPos = offset[0];
        this._yPos = offset[1];
        this.material.setUniform("offset", offset);
        this.syncPickingUniforms();
    }

    /// Keep the placement uniforms of the picking material in step with the
    /// drawing material. Only the ones that move the quad matter; `aspect` is set
    /// by the renderer on both.
    syncPickingUniforms() {
        if (!this._pickingMaterial) return;
        // Only the uniforms that place the quad; the rest do not affect picking.
        this._pickingMaterial.setUniform("MODE", this._mode);
        this._pickingMaterial.setUniform("offset", [this._xPos, this._yPos]);
        this._pickingMaterial.setUniform("scale", this.material.getUniform("scale"));
        this._pickingMaterial.setUniform("sdf_text_size", this.material.getUniform("sdf_text_size"));
    }

    /// Bounding rectangle of the laid-out text box in (0,1) screen coordinates.
    ///
    /// Returns null in TEXT2D_SPACE_WORLD: there the element is placed by the
    /// model matrix rather than by `offset`, so this rectangle would be
    /// meaningless. Callers use it for overlay hit-testing, which is screen-mode
    /// only anyway.
    ///
    /// setText2D() always fills the first six vertices with the enclosing quad,
    /// frame or no frame, so those are the box. x is divided by the viewport
    /// aspect in the vertex shader, so undo that here to get screen units.
    getScreenRect(aspect) {
        if (this._mode === TEXT2D_SPACE_WORLD) return null;
        if (!this.geometry || !this.geometry.vertices) return null;
        const v = this.geometry.vertices.array;
        let x0 =  Infinity, y0 =  Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let i = 0; i < 12; i += 2) {
            if (v[i]   < x0) x0 = v[i];
            if (v[i]   > x1) x1 = v[i];
            if (v[i+1] < y0) y0 = v[i+1];
            if (v[i+1] > y1) y1 = v[i+1];
        }
        return { x0: this._xPos + x0 / aspect, x1: this._xPos + x1 / aspect,
                 y0: this._yPos + y0,          y1: this._yPos + y1,
                 // Resize-grip square, in the same screen fractions. Geometry
                 // units are isotropic in pixels, so x needs the aspect divide.
                 grip_x: (this._grip_size || 0) / aspect,
                 grip_y: (this._grip_size || 0) };
    }

    setTextureAndFont(texture, font) {
        this._fontTexture = texture;
        this._font = font;
        if (font != null && texture != null) {
            this.material.clearMaps();
            this.material.addMap(this._fontTexture);
            this.recalcGeometry();
        } else {
            this.geometry = undefined;
        }
    }

    setText2D(text, x, y, font_metrics, font) {
        let char_count = 0;
        for(let c = 0; c < text.length; c++) {
            const schar = text.charAt(c);
            if (schar != " " && schar != "\n")
                ++char_count;
        }
        // Header vertex block, before the glyphs:
        //    0 ..  5   frame fill quad (also the pick target and the bbox)
        //    6 .. 29   four frame border quads
        //   30 .. 41   resize-grip mark at the bottom-right corner (two quads)
        // ZTEXT_HDR_VERTS must match the offsets used in draw().
        const verts = new Float32Array(2*ZText.HDR_VERTS + 12*char_count);
        const uvs   = new Float32Array(2*ZText.HDR_VERTS + 12*char_count);
        let vi = 2*ZText.HDR_VERTS;
        let ui = 2*ZText.HDR_VERTS;

        let prev_char = " ";  // Used to calculate kerning
        let cpos  = [ x, y ]; // Current pen position
        let x_max = 0.0;      // Max width - used for bounding box

        function fill_rect(arr, vi, left, right, top, bottom) {
            arr[vi++] = left;  arr[vi++] = top;
            arr[vi++] = left;  arr[vi++] = bottom;
            arr[vi++] = right; arr[vi++] = top;
            arr[vi++] = right; arr[vi++] = top;
            arr[vi++] = left;  arr[vi++] = bottom;
            arr[vi++] = right; arr[vi++] = bottom;
            return vi;
        }

        for(let c = 0; c < text.length; c++) {
            let schar = text.charAt(c);

            if ( schar == "\n" ) {
                // A newline as the very last character adds no line. Pressing
                // Enter at the end of the last line is a typing habit, and
                // honouring it leaves an empty line inside the frame. A newline
                // followed by anything, a space included, is kept, so a
                // deliberate blank last line is written as "\n ".
                if ( c == text.length - 1 ) continue;
                if ( cpos[0] > x_max ) x_max = cpos[0]; // Expanding the bounding rect
                cpos[0]  = x;
                cpos[1] -= font_metrics.line_height;
                prev_char = " ";
                continue;
            }

            if ( schar == " " ) {
                cpos[0] += font.space_advance * font_metrics.cap_scale;
                prev_char = " ";
                continue;
            }
            if ( schar == "\u{2002}" ) { // en-space / two-per-em
                cpos[0] += 0.5 * font_metrics.ascent;
                prev_char = " ";
                continue;
            }
            if ( schar == "\u{2004}" ) { // three-per-em-space
                cpos[0] += 0.333 * font_metrics.ascent;
                prev_char = " ";
                continue;
            }
            if ( schar == "\u{2005}" ) { // four-per-em-space
                cpos[0] += 0.25 * font_metrics.ascent;
                prev_char = " ";
                continue;
            }
            if ( schar == "\u{2006}" ) { // six-per-em-space
                cpos[0] += 0.166 * font_metrics.ascent;
                prev_char = " ";
                continue;
            }

            // Laying out the glyph rectangle
            let font_char = font.chars[schar];
            if ( !font_char ) { // Substituting unavailable characters with '?'
                schar = "?";
                font_char = font.chars[ "?" ];
            }

            let kern = font.kern[ prev_char + schar ];
            if ( !kern ) kern = 0.0;

            let lowcase = ( font.chars[schar].flags & 1 ) == 1;
            // Low case chars use their own scale
            let scale = lowcase ? font_metrics.low_scale : font_metrics.cap_scale;
            let baseline = cpos[1] - font_metrics.ascent;

            let g      = font_char.rect;
            let bottom = baseline - scale * ( font.descent + font.iy );
            let top    = bottom   + scale * ( font.row_height);
            let left   = cpos[0]  + font.aspect * scale * ( font_char.bearing_x + kern - font.ix );
            let right  = left     + font.aspect * scale * ( g[2] - g[0] );

            // console.log(schar, scale, top, bottom, left, right);

            // POSITIONs
            vi = fill_rect(verts, vi, left, right, top, bottom);

            // UVs
            ui = fill_rect(uvs, ui, g[0], g[2], 1 - g[1], 1 - g[3])

            // Advancing pen position
            let new_pos_x = cpos[0] + font.aspect * scale * ( font_char.advance_x );
            cpos = [ new_pos_x, cpos[1] ];
            prev_char = schar;
        }

        // Expand max_x for the last text line to get to the final bounding-box.
        if ( cpos[0] > x_max ) x_max = cpos[0];
        // lrtb  -->  x, x_max, y, cpos[1] - font_metrics.line_height + font_metrics.gap_heigh
        {
            let extra = 0, frame = 0;
            if (this.draw_frame) {
                if (this.fill_alpha !== 0.0 || this.line_alpha !== 0.0)
                    extra += this.extra_border;
                if (this.line_alpha !== 0.0) {
                    extra += this.line_width;
                    frame += this.line_width;
                }
                extra *= font_metrics.line_height;
                frame *= font_metrics.line_height;
                if (this.line_alpha !== 0.0)
                    frame = Math.max(frame, ZText.MIN_FRAME_LINE_PX * this._pxToScreen);
            }
            let l = x - extra, r = x_max + extra;
            let t = y + extra, b =  cpos[1] - font_metrics.line_height + font_metrics.gap_height - extra;
            this._box_l = l; this._box_r = r; this._box_t = t; this._box_b = b;
            let vp = fill_rect(verts, 0, l + frame, r - frame, t - frame, b + frame);
            if (this.line_alpha !== 0.0) {
                vp = fill_rect(verts, vp, l, r, t, t - frame);
                vp = fill_rect(verts, vp, r - frame, r, t - frame, b + frame);
                vp = fill_rect(verts, vp, l, r, b + frame, b);
                vp = fill_rect(verts, vp, l, l + frame, t - frame, b + frame);
            }

            // Resize grip: a small square tucked into the frame's inner corner.
            // The frame supplies the bottom and right sides, these two arms the
            // top and left, at half the frame's line width.
            //
            // Side is a fraction of the SHORTER side of the box, so it stays
            // square rather than stretching with a wide, one-line annotation.
            // Geometry units are isotropic in pixels here -- the vertex shader
            // divides x by the aspect ratio -- so min() is a genuine min.
            {
                // Scale on ONE line, not on the whole box: a three-line note is
                // three times as tall but its text is no bigger, so it does not
                // need -- and should not get -- a bigger grab handle.
                let one_line_h = 2*extra + font_metrics.line_height - font_metrics.gap_height;
                let sq  = Math.max(ZText.RESIZE_GRIP_FRAC * Math.min(r - l, one_line_h),
                                   ZText.GRIP_MIN_PX * this._pxToScreen);
                let lw  = Math.max(ZText.GRIP_LINE_FRAC * (frame > 0 ? frame : 0.02 * (t - b)),
                                   ZText.GRIP_LINE_MIN_PX * this._pxToScreen);
                let gap = Math.max(lw, ZText.GRIP_GAP_FRAC * sq);
                let gr = r - frame - gap, gb = b + frame + gap;
                fill_rect(verts, 60, gr - sq,      gr,          gb + sq, gb + sq - lw); // top
                fill_rect(verts, 72, gr - sq, gr - sq + lw,     gb + sq, gb);           // left
                // Single source of truth: GlViewerRCore hit-tests with this, so
                // the sensitive area is exactly the square that is drawn.
                this._grip_size = sq + gap;
            }
        }

        // Anchor: translate the whole block -- frame, grip and glyphs alike -- so
        // that the requested point of the box lands on the origin, which is where
        // the `offset` uniform puts it. Doing it here rather than in the shader
        // means per-label anchoring is free if several labels are ever laid out
        // into one buffer, and getScreenRect() stays correct because the frame
        // quad moves with everything else.
        {
            let dx = 0, dy = 0;
            switch (this._alignH) {
                case ZText.ALIGN_H.LEFT:   dx = -this._box_l;                      break;
                case ZText.ALIGN_H.CENTER: dx = -0.5 * (this._box_l + this._box_r); break;
                case ZText.ALIGN_H.RIGHT:  dx = -this._box_r;                      break;
            }
            switch (this._alignV) {
                case ZText.ALIGN_V.TOP:    dy = -this._box_t;                      break;
                case ZText.ALIGN_V.MIDDLE: dy = -0.5 * (this._box_t + this._box_b); break;
                case ZText.ALIGN_V.BOTTOM: dy = -this._box_b;                      break;
            }
            if (dx !== 0 || dy !== 0)
                for (let i = 0; i < verts.length; i += 2) { verts[i] += dx; verts[i+1] += dy; }
        }

        const geometry = new Geometry();
        geometry.vertices = new BufferAttribute(verts, 2);
        geometry.uv = new BufferAttribute(uvs, 2);

        return geometry;
    }

    static _fontMetrics(font, pixel_size, more_line_gap = 0.0) {
        let cap_scale = pixel_size / font.cap_height;
        let low_scale = cap_scale;

        let ascent      = font.ascent * cap_scale;
        let line_height = cap_scale * ( font.ascent + font.descent + font.line_gap ) + more_line_gap;
        let gap_height  = cap_scale * ( font.line_gap ) + more_line_gap;

        return { cap_scale   : cap_scale,
                 low_scale   : low_scale,
                 pixel_size  : pixel_size,
                 ascent      : ascent,
                 line_height : line_height,
                 gap_height  : gap_height
               };
    }

    // Original version for pixel aligned rendering, requires additional vertex array for per vertex scale.
    // The code has also been changed in the vertex shader.

    static _fontMetricsPixels(font, pixel_size, more_line_gap = 0.0) {
        // We use separate scale for the low case characters
        // so that x-height fits the pixel grid.
        // Other characters use cap-height to fit to the pixels
        let cap_scale = pixel_size / font.cap_height;
        let low_scale = Math.round( font.x_height * cap_scale ) / font.x_height;

        // Ascent and line_height should be whole numbers since they are used to calculate the baseline
        // position which should lie at the pixel boundary.
        let ascent      = Math.round( font.ascent * cap_scale );
        let line_height = Math.round( cap_scale * ( font.ascent + font.descent + font.line_gap ) + more_line_gap );
        let gap_height  = Math.round( cap_scale * ( font.line_gap ) + more_line_gap );

        return { cap_scale   : cap_scale,
                 low_scale   : low_scale,
                 pixel_size  : pixel_size,
                 ascent      : ascent,
                 line_height : line_height,
                 gap_height  : gap_height
               };
    }

    static createDefaultTexture(image) {
        return new Texture(
            image,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.WRAPPING.ClampToEdgeWrapping,
            Texture.FILTER.LinearFilter,
            Texture.FILTER.LinearFilter,
            Texture.FORMAT.LUMINANCE,
            Texture.FORMAT.LUMINANCE,
            Texture.TYPE.UNSIGNED_BYTE,
            image.width,
            image.height
        );
    }

	draw(gl, glManager, instance_count=0) {
        let us = glManager._currentProgram.uniformSetter;
        let us_on  = us["u_use_fixed_color"];
        let us_col = us["u_fixed_color"];
        // If this fails (a wrong material is bound) -> only draw backround rectangle.
        // This makes picking and outline work a bit for WORLD mode (but not for screen).
        if ( ! us_on || ! us_col) {
            gl.disable(gl.CULL_FACE);
            gl.drawArrays(this.renderingPrimitive, 0, 6);
            return;
        }
        if (this.draw_frame) {
            us_on.set(1);
            if (this.fill_alpha !== 0.0) {
                us_col.set([this.fill_color.r, this.fill_color.g, this.fill_color.b, this.fill_alpha]);
                gl.depthMask(this.fill_alpha === 1.0);
                gl.polygonOffset(1, 1);
                gl.enable(gl.POLYGON_OFFSET_FILL);
                gl.drawArrays(this.renderingPrimitive, 0, 6);
                gl.disable(gl.POLYGON_OFFSET_FILL);
                if (this.fill_alpha === 1.0) gl.depthMask(true);
            }
            if (this.line_alpha !== 0.0) {
                us_col.set([this.line_color.r, this.line_color.g, this.line_color.b, this.line_alpha]);
                gl.depthMask(this.line_alpha === 1.0);
                gl.drawArrays(this.renderingPrimitive, 6, 24);
            }
            // Resize grip: shown only while the element is highlighted, and only
            // if it can actually be resized -- an affordance, not decoration.
            if (this._highlight && this.pickable && this.resizable &&
                this._mode !== TEXT2D_SPACE_WORLD && this.line_alpha !== 0.0) {
                us_col.set([this.line_color.r, this.line_color.g, this.line_color.b, 1.0]);
                gl.depthMask(false);
                gl.drawArrays(this.renderingPrimitive, 30, 12);
            }
            us_on.set(0);
        }
        if (this.opacity !== 0.0) {
            gl.depthMask(this.material.opacity === 1.0);
            gl.drawArrays(this.renderingPrimitive, ZText.HDR_VERTS,
                          this.geometry.vertices.count() - ZText.HDR_VERTS);
        }
    }
}


//------------------------------------------------------------------------------
// ZTextAxis
//------------------------------------------------------------------------------

/**
 * Scales and tick labels for a 2D projected view, the client half of REve's
 * REveProjectionAxis.
 *
 * The server sends ticks in PROJECTED coordinates, deliberately over-provided:
 * a wider range and finer subdivision than any one view needs. The non-trivial
 * part -- original space to projected space -- has already happened there. What
 * is left here is projected to screen, which for an orthographic camera is
 * affine, so this can be recomputed locally on every zoom and pan without ever
 * asking the server for anything.
 *
 * Everything lands in a single vertex buffer: tick marks as quads (exactly as
 * ZText already draws its frame) followed by the glyphs of every label, for all
 * four edges. That is possible only because anchoring is baked in at layout time
 * rather than being a uniform -- each label carries its own alignment.
 */
export class ZTextAxis extends ZText {
    /// Tick length and label gap, as fractions of the viewport height.
    static TICK_MAJOR = 0.018;
    static TICK_MINOR = 0.009;
    static LABEL_GAP  = 0.006;

    constructor(args = {}) {
        super(args);
        this.type = "ZTextAxis";

        // Decoration, not GUI: no dragging, no resize grip, no hover.
        this.pickable  = false;
        this.resizable = false;
        this.draw_frame = false;

        this._ticks   = { H: args.ticksH || null, V: args.ticksV || null };
        this._axesMode = args.axesMode !== undefined ? args.axesMode : 2; // kAll
        this._camBounds = null;   // projected-space bounds this layout was built for
        this._nTickVerts = 0;
    }

    setTicks(ticksH, ticksV, axesMode) {
        this._ticks = { H: ticksH, V: ticksV };
        if (axesMode !== undefined) this._axesMode = axesMode;
        this._camBounds = null;           // force a rebuild
    }

    /**
     * Lay out for the given orthographic camera bounds, in projected
     * coordinates. Returns true if anything was rebuilt, so the caller can skip
     * a redraw when the camera has not actually moved.
     */
    updateForCamera(left, right, bottom, top, aspect) {
        const b = this._camBounds;
        const same = b && Math.abs(b.l - left) < 1e-6 && Math.abs(b.r - right) < 1e-6 &&
                          Math.abs(b.b - bottom) < 1e-6 && Math.abs(b.t - top) < 1e-6 &&
                          Math.abs(b.a - aspect) < 1e-6;
        if (same) return false;

        this._camBounds = { l: left, r: right, b: bottom, t: top, a: aspect };
        if (this._font && this._fontTexture) this.recalcGeometry();
        return true;
    }

    /// Width of a single-line string in text units, without laying it out.
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
        if (!this._font || !this._camBounds) { this.geometry = undefined; return; }

        const font = this._font;
        const fm   = ZText._fontMetrics(font, this._fontSize, 0.0);
        const cb   = this._camBounds;
        const asp  = cb.a;

        // Projected coordinate -> (0,1) screen fraction. Affine, because the
        // camera is orthographic; this is the whole reason the client can do it.
        const sx = p => (p - cb.l) / (cb.r - cb.l);
        const sy = p => (p - cb.b) / (cb.t - cb.b);

        const TKMAJ = ZTextAxis.TICK_MAJOR, TKMIN = ZTextAxis.TICK_MINOR;
        const GAP   = ZTextAxis.LABEL_GAP;
        const doH = (this._axesMode === 0 || this._axesMode === 2);
        const doV = (this._axesMode === 1 || this._axesMode === 2);

        // ---- pass 1: decide what is visible and what fits ------------------
        const ticks = [];   // {x0,y0,x1,y1} quads, in screen fractions
        const labels = [];  // {text, x, y, alignH, alignV}

        // Strip along the left and right edges that the vertical labels occupy.
        // A horizontal label whose box reaches into it would be drawn straight
        // on top of a vertical one, which is what the corners of a projected
        // view used to look like: two numbers superimposed and neither legible.
        // Reserved from the widest vertical label, since they are laid out at a
        // fixed distance from the edge and only their width varies.
        let vReserve = 0;
        if (doV && this._ticks.V && this._ticks.V.lab) {
            let mw = 0;
            for (const t of this._ticks.V.lab)
                if (t) mw = Math.max(mw, this._measure(t, font, fm.cap_scale));
            vReserve = TKMAJ + GAP + mw / asp;
        }

        // ...and the reciprocal strip along the top and bottom, occupied by the
        // horizontal labels. Without this a vertical label near an end lands on
        // the horizontal row instead, which is the same corner collision seen
        // from the other side -- and the one that shows up first once distortion
        // pushes a round number right to the edge.
        let hReserve = 0;
        if (doH && this._ticks.H && this._ticks.H.lab)
            hReserve = TKMAJ + GAP + fm.line_height;


        const addAxis = (set, horizontal) => {
            if (!set || !set.pos) return;
            let lastEnd = -1e9;
            for (let i = 0; i < set.pos.length; ++i) {
                const major = set.maj ? !!set.maj[i] : true;
                const f = horizontal ? sx(set.pos[i]) : sy(set.pos[i]);
                if (f < 0.0 || f > 1.0) continue;          // outside the frustum

                const len = major ? TKMAJ : TKMIN;
                const lw  = (major ? 1.6 : 1.0) * this._pxToScreen;
                if (horizontal) {
                    const hw = 0.5 * lw / asp;
                    ticks.push({ x0: f - hw, x1: f + hw, y0: 0.0,       y1: len });
                    ticks.push({ x0: f - hw, x1: f + hw, y0: 1.0 - len, y1: 1.0 });
                } else {
                    const hh = 0.5 * lw;
                    ticks.push({ x0: 0.0,       x1: len, y0: f - hh, y1: f + hh });
                    ticks.push({ x0: 1.0 - len, x1: 1.0, y0: f - hh, y1: f + hh });
                }

                const txt = major && set.lab ? set.lab[i] : "";
                if (!txt) continue;

                if (horizontal) {
                    // Drop a label that would touch the previous one. TEve does
                    // the same in TEveProjectionAxesGL::FilterOverlappingLabels.
                    const w = this._measure(txt, font, fm.cap_scale) / asp;
                    // Corner: the tick still gets drawn, only the number is
                    // dropped -- the vertical scale already labels that corner.
                    if (f - 0.5 * w < vReserve || f + 0.5 * w > 1.0 - vReserve) continue;
                    if (f - 0.5 * w < lastEnd) continue;
                    lastEnd = f + 0.5 * w + 0.4 * this._fontSize / asp;
                    labels.push({ text: txt, x: f, y: TKMAJ + GAP,
                                  ah: ZText.ALIGN_H.CENTER, av: ZText.ALIGN_V.BOTTOM });
                    labels.push({ text: txt, x: f, y: 1.0 - TKMAJ - GAP,
                                  ah: ZText.ALIGN_H.CENTER, av: ZText.ALIGN_V.TOP });
                } else {
                    const h = fm.line_height;
                    // Corner: the tick stays, the number goes -- the horizontal
                    // scale already labels that end.
                    if (f - 0.5 * h < hReserve || f + 0.5 * h > 1.0 - hReserve) continue;
                    if (f - 0.5 * h < lastEnd) continue;
                    lastEnd = f + 0.5 * h + 0.3 * h;
                    labels.push({ text: txt, x: TKMAJ + GAP, y: f,
                                  ah: ZText.ALIGN_H.LEFT,  av: ZText.ALIGN_V.MIDDLE });
                    labels.push({ text: txt, x: 1.0 - TKMAJ - GAP, y: f,
                                  ah: ZText.ALIGN_H.RIGHT, av: ZText.ALIGN_V.MIDDLE });
                }
            }
        };
        if (doH) addAxis(this._ticks.H, true);
        if (doV) addAxis(this._ticks.V, false);

        // ---- pass 2: one buffer, ticks then glyphs -------------------------
        let nGlyph = 0;
        for (const L of labels)
            for (let i = 0; i < L.text.length; ++i)
                if (L.text.charAt(i) !== " ") ++nGlyph;

        const nTickV = ticks.length * 6;
        const verts = new Float32Array(2 * nTickV + 12 * nGlyph);
        const uvs   = new Float32Array(2 * nTickV + 12 * nGlyph);
        this._nTickVerts = nTickV;

        const rect = (arr, vi, l, r, t, b) => {
            arr[vi++] = l; arr[vi++] = t;  arr[vi++] = l; arr[vi++] = b;
            arr[vi++] = r; arr[vi++] = t;  arr[vi++] = r; arr[vi++] = t;
            arr[vi++] = l; arr[vi++] = b;  arr[vi++] = r; arr[vi++] = b;
            return vi;
        };

        // Geometry is in screen-space units, where x is divided by the aspect in
        // the vertex shader -- so undo that here to get true screen fractions.
        let vi = 0;
        for (const t of ticks) vi = rect(verts, vi, t.x0 * asp, t.x1 * asp, t.y1, t.y0);

        let ui = 2 * nTickV;
        for (const L of labels) {
            const w = this._measure(L.text, font, fm.cap_scale);
            let ox = 0, oy = 0;
            if (L.ah === ZText.ALIGN_H.CENTER) ox = -0.5 * w;
            else if (L.ah === ZText.ALIGN_H.RIGHT) ox = -w;
            if (L.av === ZText.ALIGN_V.MIDDLE) oy = 0.5 * fm.ascent;
            else if (L.av === ZText.ALIGN_V.BOTTOM) oy = fm.ascent;

            let pen = L.x * asp + ox;
            const baseY = L.y + oy - fm.ascent;
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
                pen += font.aspect * fm.cap_scale * fc.advance_x;
                prev = c;
            }
        }

        const geometry = new Geometry();
        geometry.vertices = new BufferAttribute(verts, 2);
        geometry.uv = new BufferAttribute(uvs, 2);
        this.geometry = geometry;

        this.material.setUniform("scale", fm.cap_scale);
        this.material.setUniform("sdf_oo_N_pix_in_char", font.iy / font.cap_height);
        this.material.setUniform("sdf_text_size", this._fontSize);
        this.material.setUniform("offset", [0.0, 0.0]);   // positions are absolute
        this.syncPickingUniforms();
    }

    draw(gl, glManager) {
        if (!this.geometry) return;
        const us = glManager._currentProgram.uniformSetter;
        const on = us["u_use_fixed_color"], col = us["u_fixed_color"];
        const nT = this._nTickVerts;

        if (!on || !col) {   // picking or outline pass: nothing to contribute
            return;
        }
        if (nT > 0) {
            on.set(1);
            col.set([this.line_color.r, this.line_color.g, this.line_color.b, 1.0]);
            gl.depthMask(false);
            gl.drawArrays(this.renderingPrimitive, 0, nT);
            on.set(0);
        }
        const nG = this.geometry.vertices.count() - nT;
        if (nG > 0) gl.drawArrays(this.renderingPrimitive, nT, nG);
    }
}
