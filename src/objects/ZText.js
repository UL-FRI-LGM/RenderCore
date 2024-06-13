import {Mesh} from "./Mesh.js";
import {Geometry} from "./Geometry.js";
import {BufferAttribute} from "../core/BufferAttribute.js";
import {Texture} from "../textures/Texture.js";
import {ZTextMaterial} from "../materials/ZTextMaterial.js";
import {TEXT2D_SPACE_WORLD, TEXT2D_SPACE_SCREEN, TEXT2D_SPACE_MIXED} from "../constants.js";

//ZText API
export class ZText extends Mesh {
    constructor(args = {}) {
        super();
        this.type = "ZText";
        this.frustumCulled = false;

        this._fontTexture = args.fontTexture !== undefined ? args.fontTexture : null;
        this._xPos = args.xPos !== undefined ? (args.xPos) : 1.0;
        this._yPos = args.yPos !== undefined ? (args.yPos) : 0;
        this._mode = args.mode !== undefined ? args.mode : TEXT2D_SPACE_SCREEN;
        this._fontHinting = 1.0;
        this._color = args.color !== undefined ? args.color : [0.0,0.0,0.0];
        this._font = args.font !== undefined ? args.font : null;

        this._finalOffsetX = 0;
        this._finalOffsetY = 0;

        this._fontSize = args.fontSize !== undefined ? args.fontSize : 1;

        if (this._mode !== TEXT2D_SPACE_SCREEN && this._mode !== TEXT2D_SPACE_WORLD && this._mode !== TEXT2D_SPACE_MIXED)
            console.error('[' + this.type + "]: Unknow mode [" + this._mode + ']');

        this.material = new ZTextMaterial();
        // Uniforms aspect and viewport set by MeshRenderer based on actual viewport
        this.material.setUniform("MODE", this._mode);
        this.material.setUniform("offset", [this._xPos, this._yPos]);
        this.material.setUniform("hint_amount", this._fontHinting);
        this.material.setUniform("u_use_fixed_color", 0);
        this.material.setUniform("u_fixed_color", [0.0, 0.0, 0.0, 0.0]);

        // this.material.setUniform("FinalOffset", [0,0]);

        this.material.color = args.color;

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
    }

    // Override visibility to avoid rendering of uninitialized objects.
    get visible() {
        return super.visible && this._fontTexture != null && this._font != null;
    }
    set visible(vis) {
        super.visible = vis;
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
        this.extra_border = extra_border;
        this.line_width = line_width;
    }

    setOffset(offset) {
        this.material.setUniform("offset", offset);
    }

    setNewPositionOffset(x, y) {
        this._finalOffsetX = this._finalOffsetX + x;
        this._finalOffsetY = this._finalOffsetY + y;
        this.material.setUniform("FinalOffset", [this._finalOffsetX, this._finalOffsetY]);
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
        const verts = new Float32Array(60 + 12*char_count);
        const uvs   = new Float32Array(60 + 12*char_count);
        let vi = 60;
        let ui = 60;

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
            }
            let l = x - extra, r = x_max + extra;
            let t = y + extra, b =  cpos[1] - font_metrics.line_height + font_metrics.gap_height - extra;
            let vp = fill_rect(verts, 0, l + frame, r - frame, t - frame, b + frame);
            if (this.line_alpha !== 0.0) {
                vp = fill_rect(verts, vp, l, r, t, t - frame);
                vp = fill_rect(verts, vp, r - frame, r, t - frame, b + frame);
                vp = fill_rect(verts, vp, l, r, b + frame, b);
                vp = fill_rect(verts, vp, l, l + frame, t - frame, b + frame);
            }
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
            us_on.set(0);
        }
        if (this.opacity !== 0.0) {
            gl.depthMask(this.material.opacity === 1.0);
            gl.drawArrays(this.renderingPrimitive, 30, this.geometry.vertices.count() - 30);
        }
    }
}
