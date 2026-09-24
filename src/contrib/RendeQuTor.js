import {RenderQueue} from '../renderers/RenderQueue.js';
import {RenderPass}  from '../renderers/RenderPass.js';
import {CustomShaderMaterial} from '../materials/CustomShaderMaterial.js';
import {FRONT_AND_BACK_SIDE, HIGHPASS_MODE_BRIGHTNESS, HIGHPASS_MODE_DIFFERENCE}
    from '../constants.js';

export class RendeQuTor
{
    constructor(renderer, scene, camera, overlay_scene, overlay_camera)
    {
        this.renderer = renderer;
        this.scene    = scene;
        this.camera   = camera;
        this.ovlscene = overlay_scene;
        // The overlay lives in a fixed (0,0)-(1,1) screen box, so it gets its own
        // orthographic camera. Falling back to the scene camera reproduces the old
        // behaviour for callers that do not pass one.
        this.ovlcamera = overlay_camera || camera;
        this.queue    = new RenderQueue(renderer);
        this.pqueue   = new RenderQueue(renderer);
        this.ovlpqueue= new RenderQueue(renderer);
        this.vp_w = 0;
        this.vp_h = 0;
        this.pick_radius = 32;
        this.pick_center = 16;

        this.make_PRP_plain();
        this.make_PRP_depth2r();

        this.make_PRP_overlay();
        this.make_PRP_depth2r_overlay();

        this.renderer.preDownloadPrograms(
          [ this.PRP_depth2r_mat.requiredProgram(this.renderer),
            this.PRP_depth2r_overlay_mat.requiredProgram(this.renderer)
          ]);

        this.SSAA_value = 1;

        // Image grabbing (see make_RP_ToneMapToTexture / grab_image). capture_scale
        // multiplies the screen viewport: 1 gives exactly what the operator sees,
        // SSAA_value gives the full supersampled image without the final downsample.
        this.capture_scale   = 1;
        this.capture_pixels  = null;

        this.clear_zero_f32arr = new Float32Array([0,0,0,0]);

        this.std_textures = [];
        this.std_tex_cnt  = 0;
        this.std_tex_used = new Set();
    }

    initDirectToScreen()
    {
        this.make_RP_DirectToScreen();
    }

    initSimple(ssaa_val)
    {
        this.SSAA_value = ssaa_val;

        this.make_RP_SSAA_Super();

        this.make_RP_GBuffer();
        this.make_RP_Outline();

        this.make_RP_GaussHVandBlend();

        this.make_RP_Overlay();

        // Only one of the next two gets called from the driver.
        this.make_RP_ToScreen();
        this.make_RP_ToneMapToScreen();

        this.make_RP_ToneMapToTexture();

        this.RP_GBuffer.obj_list = [];

        this.renderer.preDownloadPrograms(
          [ this.RP_GBuffer_mat.requiredProgram(this.renderer),
            this.RP_Outline_mat.requiredProgram(this.renderer),
            this.RP_GaussH_mat.requiredProgram(this.renderer),
            this.RP_Blend_mat.requiredProgram(this.renderer),
            this.RP_ToScreen_mat.requiredProgram(this.renderer),
            this.RP_ToneMapToScreen_mat.requiredProgram(this.renderer),
            this.RP_ToneMapToTexture_mat.requiredProgram(this.renderer)
          ]);
    }

    initFull(ssaa_val)
    {
        this.SSAA_value = ssaa_val;

        this.make_RP_SSAA_Super();
        this.make_RP_HighPassGaussBloom();
        // this.make_RP_SSAA_Down(); this.RP_SSAA_Down.input_texture = "color_bloom";
        this.make_RP_ToScreen();
        this.RP_ToScreen.input_texture = "color_bloom";

        this.make_RP_ToneMapToTexture();
        this.RP_ToneMapToTexture.input_texture = "color_bloom";
    }

    updateViewport(w, h)
    {
        this.vp_w = w;
        this.vp_h = h;
        let vp = { width: w, height: h };
        let rq = this.queue._renderQueue;
        for (let i = 0; i < rq.length; i++)
        {
            rq[i].view_setup(vp);
        }
        // Scene picking render-passes stay constant (they use a narrow window),
        // but the overlay pick pass is full-viewport, so it has to follow along.
        let orq = this.ovlpqueue._renderQueue;
        for (let i = 0; i < orq.length; i++)
        {
            if (orq[i].view_setup) orq[i].view_setup(vp);
        }
    }

    //=============================================================================

    pop_std_texture() {
        let tex;
        if (this.std_textures.length == 0) {
            tex = "std_tex_" + this.std_tex_cnt++;
        } else {
            tex = this.std_textures.pop();
        }
        this.std_tex_used.add(tex);
        return tex;
    }

    push_std_texture(tex) {
        this.std_tex_used.delete(tex);
        this.std_textures.push(tex);
    }

    release_std_textures() {
        if (this.std_tex_used.size > 0) {
            // console.log("RendeQuTor releasing std textures", this.std_tex_used.size);
            for (const tex of this.std_tex_used)
                this.std_textures.push(tex);
            this.std_tex_used.clear();
        }
    }

    // ----------

    render_outline()
    {
        let tex_normal = this.pop_std_texture();
        let tex_view_dir = this.pop_std_texture();
        this.RP_GBuffer.outTextures[0].id = tex_normal;
        this.RP_GBuffer.outTextures[1].id = tex_view_dir;

        this.queue.render_pass(this.RP_GBuffer, "GBuffer");

        this.RP_Outline.intex_normal = tex_normal;
        this.RP_Outline.intex_view_dir = tex_view_dir;
        if ( ! this.tex_outline) {
            // First outline, get the texture to accumulate all outlines
            this.tex_outline = this.pop_std_texture();
        } else {
            // Additional outlines, do not clear the accumulatortexture.
            this.RP_Outline.outTextures[0].clearColorArray = null;
        }
        this.RP_Outline.outTextures[0].id = this.tex_outline;

        this.queue.render_pass(this.RP_Outline, "Outline");

        this.push_std_texture(tex_normal);
        this.push_std_texture(tex_view_dir);
    }

    render_main_and_blend_outline()
    {
        let main_is_std = (this.SSAA_value == 1);
        let tex_main = main_is_std ? this.pop_std_texture() : "color_main";

        this.RP_SSAA_Super.outTextures[0].id = tex_main;
        this.queue.render_pass(this.RP_SSAA_Super, "SSAA Super");

        if (this.tex_outline) {
            let tA = this.tex_outline;
            let tB = this.pop_std_texture();

            this.RP_GaussH.intex = tA;
            this.RP_GaussH.outTextures[0].id = tB;
            this.queue.render_pass(this.RP_GaussH, "GaussH");

            this.RP_GaussV.intex = tB;
            this.RP_GaussV.outTextures[0].id = tA;
            this.queue.render_pass(this.RP_GaussV, "GaussV");

            this.RP_Blend.intex_outline_blurred = tA;
            this.RP_Blend.intex_main = tex_main;
            this.RP_Blend.outTextures[0].id = tB;
            this.queue.render_pass(this.RP_Blend, "Blend");

            if (main_is_std) this.push_std_texture(tex_main);

            this.push_std_texture(this.tex_outline);
            this.RP_Outline.outTextures[0].clearColorArray = this.clear_zero_f32arr;
            this.tex_outline = null;

            this.tex_final = tB;
            this.tex_final_push = true;
        } else {
            this.tex_final = tex_main;
            this.tex_final_push = main_is_std;
        }
    }

    render_overlay_and_blend_it()
    {
        let tex_ovl = this.pop_std_texture();
        this.RP_Overlay.outTextures[0].id = tex_ovl;
        this.queue.render_pass(this.RP_Overlay, "Overlay");

        let ovl_final = this.pop_std_texture();
        // Reuse blending pass from outline merging.
        this.RP_Blend.intex_outline_blurred = tex_ovl;
        this.RP_Blend.intex_main = this.tex_final;
        this.RP_Blend.outTextures[0].id = ovl_final;
        this.queue.render_pass(this.RP_Blend, "Blend Overlay");

        if (this.tex_final_push) {
            this.push_std_texture(this.tex_final);
        }
        this.tex_final = ovl_final;
        this.tex_final_push = true;
    }

    render_tone_map_to_screen()
    {
        this.RP_ToneMapToScreen.input_texture = this.tex_final;

        this.queue.render_pass(this.RP_ToneMapToScreen, "Tone Map To Screen");

        if (this.tex_final_push) {
            this.push_std_texture(this.tex_final);
            this.tex_final = null;
            this.tex_final_push = null;
        }
    }

    render_final_to_screen()
    {
        this.RP_ToScreen.input_texture = this.tex_final;

        this.queue.render_pass(this.RP_ToScreen, "Copy Final To Screen");

        if (this.tex_final_push) {
            this.push_std_texture(this.tex_final);
            this.tex_final = null;
            this.tex_final_push = null;
        }
    }

    render_begin(used_check)
    {
        this.tex_outline = null;

        // Re-arm the outline accumulator's clear HERE, at the start of the
        // frame, not only where it is consumed.
        //
        // render_outline() turns the clear OFF for the second and later
        // outlines of a frame, so they accumulate into one texture on purpose;
        // render_main_and_blend_outline() turns it back on once it has consumed
        // them. The flag is therefore OFF for the stretch between those two
        // calls, and it is only ever turned back on by the second of them.
        //
        // So any frame that ends in that window leaves it off for good: a
        // program still compiling, a shader that failed to build, an exception
        // anywhere in the viewer's render path, a queue that reports itself
        // unused. It does not matter which -- what matters is that the
        // invariant was owned by a later step that is not guaranteed to run.
        //
        // Once off, no outline is ever cleared again: highlights pile up
        // instead of replacing each other, old ones never go away, and a stale
        // selection outline keeps showing through. Rare, because the frame has
        // to end inside that window; permanent once it does; and invisible in
        // the selection bookkeeping, which stays correct throughout. That
        // combination is what made it so hard to pin down.
        //
        // Re-arming here makes it a frame-local invariant: one assignment, and
        // no way for it to stick.
        if (this.RP_Outline)
            this.RP_Outline.outTextures[0].clearColorArray = this.clear_zero_f32arr;

        this.queue.render_begin(used_check);
    }

    render_end()
    {
        this.queue.render_end();
        this.release_std_textures();
    }

    // ----------

    render()
    {
        // This can work for setups without outline passes -- once they are
        // brought back to life.

        this.queue.render();
    }

    //=============================================================================

    pick_begin(x, y)
    {
        this.camera.prePickStoreTBLR();
        this.camera.narrowProjectionForPicking(this.vp_w, this.vp_h,
                                               this.pick_radius, this.pick_radius,
                                               x, this.vp_h - 1 - y);
    }

    pick_end()
    {
        this.camera.postPickRestoreTBLR();
    }

    pick_low_level(rnr_queue, x, y, detect_depth)
    {
        this.renderer.pick_setup(this.pick_center, this.pick_center);

        let state = rnr_queue.render();
        state.x = x;
        state.y = y;
        state.depth = -1.0;
        state.object = this.renderer.pickedObject3D;
        // console.log("RenderQuTor::pick", state);

        if (detect_depth && this.renderer.pickedObject3D !== null)
        {
            let rdr = this.renderer;
            let gl  = rdr.gl;
            let fbm = rdr.glManager._fboManager;

            fbm.bindFramebuffer(rnr_queue._renderTarget);

            // Type RED is not supported on Firefox, specs require RGBA so we
            // read that, 3 x 3 pixels x 4 channels.
            let d = new Float32Array(9*4);
            gl.readBuffer(gl.COLOR_ATTACHMENT0);
            gl.readPixels(this.pick_center - 1, this.pick_center - 1, 3, 3, gl.RGBA, gl.FLOAT, d);

            fbm.unbindFramebuffer();

            let near = this.camera.near;
            let far  = this.camera.far;
            for (let i = 0; i < 9; ++i) {
                // NOTE: we are reducing into first 3 x 3 elements, dropping GBA channels.
                d[i] = (near * far) / ((near - far) * d[4*i] + far);
            }
            state.depth = d[4];
            // console.log("    pick depth at", x, ",", y, ":", d);
        }

        return state;
    }

    pick(x, y, detect_depth = false)
    {
        return this.pick_low_level(this.pqueue, x, y, detect_depth);
    }

    /// Overlay picking cannot use the narrow-window trick that pick() relies on.
    /// Screen-mode ZText computes its clip position directly from the `offset`
    /// uniform and the viewport aspect, ignoring the projection matrix entirely,
    /// so narrowing a camera has no effect on where it lands. Render the overlay
    /// pick pass at full viewport instead and read the pixel under the cursor.
    /// This runs on mouse-down only, so the extra fill costs nothing that matters.
    /// Overlay picking cannot use the narrow-window trick that pick() relies on.
    /// Screen-mode ZText computes its clip position directly from the `offset`
    /// uniform and the viewport aspect, ignoring the projection matrix entirely,
    /// so narrowing a camera has no effect on where it lands. Render the overlay
    /// pick pass at full viewport instead and read the pixel under the cursor.
    /// This runs on mouse-down only, so the extra fill costs nothing that matters.
    pick_overlay(x, y, detect_depth = false)
    {
        this.renderer.pick_setup(x, this.vp_h - 1 - y);

        let state = this.ovlpqueue.render();
        state.x = x;
        state.y = y;
        state.depth = -1.0;
        state.object = this.renderer.pickedObject3D;

        return state;
    }

    pick_instance_low_level(rnr_queue, state)
    {
        if (state.object !== this.renderer.pickedObject3D) {
            console.error("RendeQuTor::pick_instance state mismatch", state, this.renderer.pickedObject3D);
        } else {
            // console.log("RenderQuTor::pick_instance going for secondary select");

            this.renderer._pickSecondaryEnabled = true;
            rnr_queue.render();

            state.instance = this.renderer._pickedID;
        }
        return state;
    }

    pick_instance(state)
    {
        return this.pick_instance_low_level(this.pqueue, state);
    }

    pick_instance_overlay(state)
    {
        return this.pick_instance_low_level(this.ovlpqueue, state);
    }



    //=============================================================================
    // Picking RenderPasses
    //=============================================================================

    make_PRP_plain()
    {
        let pthis = this;

        this.PRP_plain = new RenderPass(
            RenderPass.BASIC,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { scene: pthis.scene, camera: pthis.camera };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            { width: this.pick_radius, height: this.pick_radius },
            "depth_picking",
            [ { id: "color_picking", textureConfig: RenderPass.DEFAULT_R32UI_TEXTURE_CONFIG,
                clearColorArray: new Uint32Array([0xffffffff, 0, 0, 0]) } ]
        );

        this.pqueue.pushRenderPass(this.PRP_plain);
    }

    make_PRP_depth2r()
    {
        this.PRP_depth2r_mat = new CustomShaderMaterial("copyDepthToRed");
        this.PRP_depth2r_mat.lights = false;
        let pthis = this;

        this.PRP_depth2r = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.PRP_depth2r_mat, textures: [ textureMap["depth_picking"] ] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            { width: this.pick_radius, height: this.pick_radius },
            null,
            [ { id: "depthr32f_picking", textureConfig: RenderPass.FULL_FLOAT_R32F_TEXTURE_CONFIG,
                clearColorArray: new Float32Array([1, 0, 0, 0]) } ]
        );

        this.pqueue.pushRenderPass(this.PRP_depth2r);
    }

    // XXXX-MT Probably do not need the next two, could use the above two -- investigate.

    make_PRP_overlay()
    {
        let pthis = this;

        this.PRP_overlay = new RenderPass(
            RenderPass.BASIC,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { scene: pthis.ovlscene, camera: pthis.ovlcamera };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            { width: this.vp_w || 100, height: this.vp_h || 100 },
            "depth_picking_overlay",
            [ { id: "color_picking_overlay", textureConfig: RenderPass.DEFAULT_R32UI_TEXTURE_CONFIG,
                clearColorArray:  new Uint32Array([0xffffffff, 0, 0, 0])} ]
        );
        // Full viewport, unlike the scene pick pass -- see pick_overlay().
        this.PRP_overlay.view_setup = function (vport) {
             this.viewport = { width: vport.width, height: vport.height };
            };

        this.ovlpqueue.pushRenderPass(this.PRP_overlay);
    }

    make_PRP_depth2r_overlay()
    {
        this.PRP_depth2r_overlay_mat = new CustomShaderMaterial("copyDepthToRed");
        this.PRP_depth2r_overlay_mat.lights = false;
        let pthis = this;

        this.PRP_depth2r_overlay = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.PRP_depth2r_overlay_mat, textures: [ textureMap["depth_picking_overlay"] ] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            { width: this.pick_radius, height: this.pick_radius },
            null,
            [ { id: "depthr32f_picking_overlay", textureConfig: RenderPass.FULL_FLOAT_R32F_TEXTURE_CONFIG,
                clearColorArray: new Float32Array([1, 0, 0, 0]) } ]
        );

        this.ovlpqueue.pushRenderPass(this.PRP_depth2r_overlay);
    }


    //=============================================================================
    // Regular RenderPasses
    //=============================================================================

    make_RP_DirectToScreen()
    {
        let pthis = this;

        this.RP_DirectToScreen = new RenderPass(
            RenderPass.BASIC,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) { return { scene: pthis.scene, camera: pthis.camera }; },
            function (textureMap, additionalData) {},
            RenderPass.SCREEN,
            null
        );
        this.RP_DirectToScreen.view_setup = function (vport) { this.viewport = vport; };

        this.queue.pushRenderPass(this.RP_DirectToScreen);
    }

    //=============================================================================

    make_RP_SSAA_Super()
    {
        let pthis = this;

        this.RP_SSAA_Super = new RenderPass(
            // Rendering pass type
            RenderPass.BASIC,
            // Initialize function
            function (textureMap, additionalData) {},
            // Preprocess function
            function (textureMap, additionalData) { return { scene: pthis.scene, camera: pthis.camera }; },
            // Postprocess
            function (textureMap, additionalData) {},
            // Target
            RenderPass.TEXTURE,
            // Viewport
            null,
            // Bind depth texture to this ID
            "depth_main",
            // Outputs
            [ { id: "color_main", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG } ]
        );
        this.RP_SSAA_Super.view_setup = function (vport) {
             this.viewport = { width: vport.width*pthis.SSAA_value, height: vport.height*pthis.SSAA_value };
            };

        this.queue.pushRenderPass(this.RP_SSAA_Super);
    }

    make_RP_SSAA_Down()
    {
        this.RP_SSAA_Down_mat = new CustomShaderMaterial("copyTexture");
        this.RP_SSAA_Down_mat.lights = false;
        let pthis = this;

        this.RP_SSAA_Down = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {},
            // Preprocess function
            function (textureMap, additionalData) {
                return { material: pthis.RP_SSAA_Down_mat, textures: [textureMap[this.input_texture]] };
            },
            // Postprocess function
            function (textureMap, additionalData) {},

            // Target
            RenderPass.TEXTURE,

            // Viewport
            null,

            // Bind depth texture to this ID
            null,

            [ { id: "color_main", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG } ]
        );
        this.RP_SSAA_Down.input_texture = "color_super";
        this.RP_SSAA_Down.view_setup = function(vport) { this.viewport = vport; };

        this.queue.pushRenderPass(this.RP_SSAA_Down);
    }

    make_RP_Overlay()
    {
        let pthis = this;

        this.RP_Overlay = new RenderPass(
            // Rendering pass type
            RenderPass.BASIC,
            // Initialize function
            function (textureMap, additionalData) {},
            // Preprocess function
            function (textureMap, additionalData) { return { scene: pthis.ovlscene, camera: pthis.ovlcamera }; },
            // Postprocess
            function (textureMap, additionalData) {},
            // Target
            RenderPass.TEXTURE,
            // Viewport
            null,
            // Bind depth texture to this ID -- its own, NOT depth_main: the overlay
            // is meant to sit in front of the scene, not depth-test against it.
            "depth_overlay",
            // Outputs
            [ { id: "color_overlay", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG,
                clearColorArray: this.clear_zero_f32arr } ]
        );
        // Supersampled like the scene, NOT at native resolution.
        //
        // RP_SSAA_Super renders the scene at vport * SSAA_value and the blend
        // samples it down, so the scene gets its antialiasing at composite
        // time. The overlay used to render at vport, which meant none of that
        // reached it: text, frames and annotation connectors were composited
        // one-to-one and came out visibly stepped, worst on a thin diagonal.
        // Rendering it at the same scale lets the very same downsample in
        // RP_Blend antialias both.
        this.RP_Overlay.view_setup = function (vport) {
             this.viewport = { width: vport.width * pthis.SSAA_value,
                               height: vport.height * pthis.SSAA_value };
            };

        this.queue.pushRenderPass(this.RP_Overlay);
    }

    //=============================================================================

    make_RP_ToScreen()
    {
        this.RP_ToScreen_mat = new CustomShaderMaterial("copyTexture");
        this.RP_ToScreen_mat.lights = false;
        let pthis = this;

        this.RP_ToScreen = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_ToScreen_mat, textures: [ textureMap[this.input_texture] ] };
            },
            function (textureMap, additionalData) {},
            RenderPass.SCREEN,
            null
        );
        this.RP_ToScreen.input_texture = "color_main";
        this.RP_ToScreen.view_setup = function(vport) { this.viewport = vport; };

        this.queue.pushRenderPass(this.RP_ToScreen);
    }

    //--------------------------------------------------------------------------
    // A note on the overlay, and on what it would take to put GUI in the scene.
    //
    // The overlay is drawn by its own orthographic camera over a fixed (0,0)-(1,1)
    // box, into its own depth buffer, so its contents are always in front of the
    // scene rather than depth-testing against it. It also has its own picking
    // queue (PRP_overlay) and the viewer handles its events separately and first
    // -- hover, drag and resize are resolved against overlay elements before the
    // scene ever sees the mouse. That separation is the point: overlay elements
    // behave like GUI, not like geometry.
    //
    // What the overlay cannot currently express is a GUI element anchored in the
    // *scene* -- a callout on a detector element, a measurement annotation, a
    // leader line -- because its camera knows nothing about world coordinates.
    //
    // Note this is NOT the same as "world-anchored text", which already works:
    // TEXT2D_SPACE_MIXED anchors at a world position and holds a constant pixel
    // size, which is what the viewer axis labels use. The difference is the
    // overlay semantics -- always in front, own depth, own event handling. A
    // MIXED element living in the main scene still disappears behind geometry.
    //
    // If that is wanted, the change is small: this pass takes {scene, camera}
    // from its preprocess function, so a second overlay pass differing only in
    // the camera (the scene camera instead of ovlcamera) is close to a copy, with
    // a companion to REveScene::SetIsOverlay saying which camera a scene belongs
    // to. It is most obviously useful in 3D; doing it there makes it free in 2D.
    // Deliberately not done yet -- 2D projected views need only the screen-space
    // overlay, because with an orthographic camera the projected -> screen map is
    // affine and the client already owns it.
    //--------------------------------------------------------------------------

    // Same tone mapping as RP_ToneMapToScreen, but rendered into an 8-bit texture
    // with the background NOT composited in and straight alpha preserved. This is
    // the image to grab: everything the operator sees except the background, so it
    // can be placed over any backdrop downstream.
    make_RP_ToneMapToTexture()
    {
        this.RP_ToneMapToTexture_mat = new CustomShaderMaterial("ToneMapping",
            { MODE: 3.0, gamma: 1.0, exposure: 2.0, knee: 0.85, u_keep_alpha: 1 });
        this.RP_ToneMapToTexture_mat.lights = false;

        let pthis = this;

        this.RP_ToneMapToTexture = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_ToneMapToTexture_mat,
                         textures: [ textureMap[this.input_texture] ] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [ { id: "color_capture", textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG } ]
        );
        this.RP_ToneMapToTexture.input_texture = "color_main";
        this.RP_ToneMapToTexture.view_setup = function (vport) {
            let s = pthis.capture_scale;
            this.viewport = (s === 1) ? { width: vport.width, height: vport.height }
                                      : { width:  Math.round(vport.width  * s),
                                          height: Math.round(vport.height * s) };
        };

        this.queue.pushRenderPass(this.RP_ToneMapToTexture);
    }

    /// Read the float buffer that feeds the final pass and report how far it
    /// actually goes above 1.0. This is the measurement that says whether a tone
    /// curve is earning its keep: ROOT colours are LDR, but lit surfaces and
    /// specular highlights can push the float16 buffer well past white.
    hdr_stats()
    {
        let tex = this.queue._textureMap[this.tex_final];
        if (!tex) return null;

        let rdr = this.renderer, gl = rdr.gl;
        let w = tex.width, h = tex.height;
        let buf = new Float32Array(w * h * 4);

        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D,
                                rdr.glManager._textureManager.getGLTexture(tex), 0);
        let ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        if (ok) {
            gl.readBuffer(gl.COLOR_ATTACHMENT0);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, buf);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(fb);
        if (!ok) return null;

        let max = 0, n_gt1 = 0, n_gt105 = 0, n_lit = 0, sum = 0;
        for (let i = 0; i < buf.length; i += 4) {
            if (buf[i + 3] <= 0.001) continue;         // untouched background
            ++n_lit;
            for (let c = 0; c < 3; ++c) {
                let v = buf[i + c] / Math.max(buf[i + 3], 1e-6); // un-premultiply
                if (v > max) max = v;
                sum += v;
                if (v > 1.0)  ++n_gt1;
                if (v > 1.05) ++n_gt105;
            }
        }
        let r = { w, h, covered_px: n_lit, max_channel: max,
                  frac_over_1: n_lit ? n_gt1 / (3 * n_lit) : 0,
                  frac_over_105: n_lit ? n_gt105 / (3 * n_lit) : 0,
                  mean_channel: n_lit ? sum / (3 * n_lit) : 0 };
        console.log("HDRSTATS " + JSON.stringify(r));
        return r;
    }

    /// Select the tone curve of the final passes: true keeps the exposure curve,
    /// false passes colours through unchanged while still compositing the
    /// background correctly. Applies to both the screen and the capture pass so a
    /// grabbed image always matches what is on screen.
    /// mode: "knee" (default), "exposure" (the old curve), "linear" (clamp only).
    set_tone_mapping(mode_name)
    {
        // Accepts a name or the shader's numeric MODE, so a value streamed from
        // the server can be passed straight through.
        let mode = (typeof mode_name === "number")
                 ? mode_name
                 : ({ reinhard: 0.0, exposure: 1.0, linear: 2.0, knee: 3.0 })[mode_name];
        if (mode === undefined || !(mode >= 0.0 && mode <= 3.0)) {
            console.warn("RendeQuTor.set_tone_mapping: unknown mode", mode_name, "-- using knee");
            mode = 3.0;
        }
        if (this.RP_ToneMapToScreen_mat)  this.RP_ToneMapToScreen_mat.setUniform("MODE", mode);
        if (this.RP_ToneMapToTexture_mat) this.RP_ToneMapToTexture_mat.setUniform("MODE", mode);
    }

    /// Knee position for the knee curve: colours below it pass through exactly.
    set_tone_knee(k)
    {
        k = Math.min(Math.max(k, 0.0), 0.99);
        if (this.RP_ToneMapToScreen_mat)  this.RP_ToneMapToScreen_mat.setUniform("knee", k);
        if (this.RP_ToneMapToTexture_mat) this.RP_ToneMapToTexture_mat.setUniform("knee", k);
    }

    /// Set the grab resolution as a multiple of the screen viewport and re-run
    /// the viewport setup so the capture target is resized.
    set_capture_scale(s)
    {
        this.capture_scale = s;
        if (this.vp_w && this.vp_h) this.updateViewport(this.vp_w, this.vp_h);
    }

    /// Render the current tex_final into the capture texture. Must be called
    /// while tex_final is still alive, i.e. before render_tone_map_to_screen().
    /// Does not consume tex_final, so the on-screen pass still runs normally.
    render_tone_map_to_capture()
    {
        this.RP_ToneMapToTexture.input_texture = this.tex_final;

        this.queue.render_pass(this.RP_ToneMapToTexture, "Tone Map To Capture");
    }

    /// Read the capture texture back. Returns { width, height, pixels } with
    /// RGBA8 in WebGL orientation (bottom-left origin, i.e. rows need flipping
    /// before they become a top-down image), or null on failure.
    grab_image()
    {
        let r = this.queue.readTexturePixels("color_capture", this.capture_pixels);
        if (r) this.capture_pixels = r.pixels;
        return r;
    }

    make_RP_ToneMapToScreen()
    {
        this.RP_ToneMapToScreen_mat = new CustomShaderMaterial("ToneMapping",
            { MODE: 3.0, gamma: 1.0, exposure: 2.0, knee: 0.85 });
            // u_clearColor set from MeshRenderer
        this.RP_ToneMapToScreen_mat.lights = false;

        let pthis = this;

        this.RP_ToneMapToScreen = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_ToneMapToScreen_mat,
                         textures: [ textureMap[this.input_texture] ] };
            },
            function (textureMap, additionalData) {},
            RenderPass.SCREEN,
            null
        );
        this.RP_ToneMapToScreen.input_texture = "color_main";
        this.RP_ToneMapToScreen.view_setup = function(vport) { this.viewport = vport; };

        this.queue.pushRenderPass(this.RP_ToneMapToScreen);
    }

    //=============================================================================

    make_RP_GBuffer()
    {
        this.RP_GBuffer_mat = new CustomShaderMaterial("GBufferMini");
        this.RP_GBuffer_mat.lights = false;
        this.RP_GBuffer_mat.side = FRONT_AND_BACK_SIDE;

        this.RP_GBuffer_mat_flat = new CustomShaderMaterial("GBufferMini");
        this.RP_GBuffer_mat_flat.lights = false;
        this.RP_GBuffer_mat_flat.side = FRONT_AND_BACK_SIDE;
        this.RP_GBuffer_mat_flat.normalFlat = true;

        let pthis = this;

        this.RP_GBuffer = new RenderPass(
            RenderPass.BASIC,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                pthis.renderer._outlineEnabled = true;
                pthis.renderer._outlineArray = this.obj_list;
                pthis.renderer._defaultOutlineMat = pthis.RP_GBuffer_mat;
                pthis.renderer._defaultOutlineMatFlat = pthis.RP_GBuffer_mat_flat;
                pthis.renderer._fillRequiredPrograms(pthis.RP_GBuffer_mat.requiredProgram(pthis.renderer));
                pthis.renderer._fillRequiredPrograms(pthis.RP_GBuffer_mat_flat.requiredProgram(pthis.renderer));
                for (const o3d of this.obj_list) {
                    if (o3d.outlineMaterial)
                        pthis.renderer._fillRequiredPrograms(o3d.outlineMaterial.requiredProgram(pthis.renderer));
                }
                return { scene: pthis.scene, camera: pthis.camera };
            },
            function (textureMap, additionalData) {
                pthis.renderer._outlineEnabled = false; // can remain true if not all progs are loaded
                pthis.renderer._outlineArray = null;
            },
            RenderPass.TEXTURE,
            null,
            "depth_gbuff",
            [
                {id: "normal",  textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG,
                 clearColorArray: this.clear_zero_f32arr},
                {id: "view_dir", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG,
                 clearColorArray: this.clear_zero_f32arr}
            ]
        );
        this.RP_GBuffer.view_setup = function (vport) { this.viewport = vport; };

        // TODO: No push, GBuffer/Outline passes should be handled separately as there can be more of them.
        this.queue.pushRenderPass(this.RP_GBuffer);
    }

    make_RP_Outline()
    {
        this.RP_Outline_mat = new CustomShaderMaterial("outline",
          { scale: 1.0,
            edgeColor: [ 1.4, 0.0, 0.8, 1.0 ],
            _DepthThreshold: 6.0,
            _NormalThreshold: 0.6, // 0.4,
            _DepthNormalThreshold: 0.5,
            _DepthNormalThresholdScale: 7.0 });
        this.RP_Outline_mat.addSBFlag("DISCARD_NON_EDGE");
        this.RP_Outline_mat.lights = false;

        let pthis = this;

        this.RP_Outline = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_Outline_mat,
                         textures: [ textureMap["depth_gbuff"],
                                     textureMap[this.intex_normal],
                                     textureMap[this.intex_view_dir] ] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [
                {id: "color_outline", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG,
                 clearColorArray: this.clear_zero_f32arr}
            ]
        );
        this.RP_Outline.intex_normal = "normal";
        this.RP_Outline.intex_view_dir = "view_dir";
        this.RP_Outline.view_setup = function (vport) { this.viewport = vport; };

        // TODO: No push, GBuffer/Outline passes should be handled separately as there can be more of them.
        this.queue.pushRenderPass(this.RP_Outline);
    }

    make_RP_GaussHVandBlend()
    {
        let pthis = this;

        this.RP_GaussH_mat = new CustomShaderMaterial("gaussBlur", {horizontal: true, power: 4.0});
        this.RP_GaussH_mat.lights = false;

        this.RP_GaussH = new RenderPass(
            RenderPass.POSTPROCESS,
            function(textureMap, additionalData) {},
            function(textureMap, additionalData) {
                return {material: pthis.RP_GaussH_mat, textures: [textureMap[this.intex]]};
            },
            function(textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [
                {id: "gauss_h", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );
        this.RP_GaussH.intex = "color_outline";
        this.RP_GaussH.view_setup = function (vport) { this.viewport = vport; };

        this.RP_GaussV_mat = new CustomShaderMaterial("gaussBlur", {horizontal: false, power: 4.0});
        this.RP_GaussV_mat.lights = false;

        this.RP_GaussV = new RenderPass(
            RenderPass.POSTPROCESS,
            function(textureMap, additionalData) {},
            function(textureMap, additionalData) {
                return {material: pthis.RP_GaussV_mat, textures: [textureMap[this.intex]]};
            },
            function(textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [
                {id: "gauss_hv", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );
        this.RP_GaussV.intex = "gauss_h";
        this.RP_GaussV.view_setup = function (vport) { this.viewport = vport; };

        this.RP_Blend_mat = new CustomShaderMaterial("blendingAdditive");
        this.RP_Blend_mat.lights = false;

        this.RP_Blend = new RenderPass(
            RenderPass.POSTPROCESS,
            function(textureMap, additionalData) {},
            function(textureMap, additionalData) {
                return {material: pthis.RP_Blend_mat,
                        textures: [textureMap[this.intex_outline_blurred],
                                   textureMap[this.intex_main]]};
            },
            function(textureMap, additionalData) {},
            // Target
            RenderPass.TEXTURE,
            null,
            null,
            [
                {id: "color_final", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );
        this.RP_Blend.intex_outline_blurred = "gauss_hv"; // also used for blending of overlay
        this.RP_Blend.intex_main = "color_main";
        this.RP_Blend.view_setup = function (vport) { this.viewport = vport; };

        this.queue.pushRenderPass(this.RP_GaussH);
        this.queue.pushRenderPass(this.RP_GaussV);
        this.queue.pushRenderPass(this.RP_Blend);
    }

    //=============================================================================
    // HighPass and Bloom
    //=============================================================================

    make_RP_HighPassGaussBloom()
    {
        let pthis = this;
        // let hp = new CustomShaderMaterial("highPass", {MODE: HIGHPASS_MODE_BRIGHTNESS, targetColor: [0.2126, 0.7152, 0.0722], threshold: 0.75});
        let hp = new CustomShaderMaterial("highPass", { MODE: HIGHPASS_MODE_DIFFERENCE,
                                             targetColor: [0x0/255, 0x0/255, 0xff/255], threshold: 0.1});
        this.RP_HighPass_mat = hp;
        this.RP_HighPass_mat.lights = false;

        this.RP_HighPass = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_HighPass_mat, textures: [textureMap["color_ssaa_super"]] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            // XXXXXX MT: this was "dt", why not null ????
            null, // "dt",
            [ {id: "color_high_pass", textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG} ]
        );
        this.RP_HighPass.view_setup = function (vport) { this.viewport = { width: vport.width*pthis.SSAA_value, height: vport.height*pthis.SSAA_value }; };
        this.queue.pushRenderPass(this.RP_HighPass);

        this.RP_Gauss1_mat = new CustomShaderMaterial("gaussBlur", {horizontal: true, power: 1.0});
        this.RP_Gauss1_mat.lights = false;

        this.RP_Gauss1 = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_Gauss1_mat, textures: [textureMap["color_high_pass"]] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [ {id: "color_gauss_half", textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG} ]
        );
        this.RP_Gauss1.view_setup = function (vport) { this.viewport = { width: vport.width*pthis.SSAA_value, height: vport.height*pthis.SSAA_value }; };
        this.queue.pushRenderPass(this.RP_Gauss1);

        this.RP_Gauss2_mat = new CustomShaderMaterial("gaussBlur", {horizontal: false, power: 1.0});
        this.RP_Gauss2_mat.lights = false;

        this.RP_Gauss2 = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_Gauss2_mat, textures: [textureMap["color_gauss_half"]] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [ {id: "color_gauss_full", textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG} ]
        );
        this.RP_Gauss2.view_setup = function (vport) { this.viewport = { width: vport.width*pthis.SSAA_value, height: vport.height*pthis.SSAA_value }; };
        this.queue.pushRenderPass(this.RP_Gauss2);

        this.RP_Bloom_mat = new CustomShaderMaterial("bloom");
        this.RP_Bloom_mat.lights = false;

        this.RP_Bloom = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_Bloom_mat, textures: [textureMap["color_gauss_full"], textureMap["color_ssaa_super"]] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [ {id: "color_bloom", textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG} ]
        );
        this.RP_Bloom.view_setup = function (vport) { this.viewport = { width: vport.width*pthis.SSAA_value, height: vport.height*pthis.SSAA_value }; };
        this.queue.pushRenderPass(this.RP_Bloom);
    }
}
