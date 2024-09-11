import {RenderQueue} from '../renderers/RenderQueue.js';
import {RenderPass}  from '../renderers/RenderPass.js';
import {CustomShaderMaterial} from '../materials/CustomShaderMaterial.js';
import {FRONT_AND_BACK_SIDE, HIGHPASS_MODE_BRIGHTNESS, HIGHPASS_MODE_DIFFERENCE}
    from '../constants.js';

export class RendeQuTor
{
    constructor(renderer, scene, camera, overlay_scene)
    {
        this.renderer = renderer;
        this.scene    = scene;
        this.camera   = camera;
        this.ovlscene = overlay_scene;
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

        this.RP_GBuffer.obj_list = [];

        this.renderer.preDownloadPrograms(
          [ this.RP_GBuffer_mat.requiredProgram(this.renderer),
            this.RP_Outline_mat.requiredProgram(this.renderer),
            this.RP_GaussH_mat.requiredProgram(this.renderer),
            this.RP_Blend_mat.requiredProgram(this.renderer),
            this.RP_ToScreen_mat.requiredProgram(this.renderer),
            this.RP_ToneMapToScreen_mat.requiredProgram(this.renderer)
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
        // Picking render-passes stay constant.
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

    pick_overlay(x, y, detect_depth = false)
    {
        return this.pick_low_level(this.ovlpqueue, x, y, detect_depth);
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
                return { scene: pthis.ovlscene, camera: pthis.camera };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            { width: this.pick_radius, height: this.pick_radius },
            "depth_picking_overlay",
            [ { id: "color_picking_overlay", textureConfig: RenderPass.DEFAULT_R32UI_TEXTURE_CONFIG,
                clearColorArray:  new Uint32Array([0xffffffff, 0, 0, 0])} ]
        );

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
            function (textureMap, additionalData) { return { scene: pthis.ovlscene, camera: pthis.camera }; },
            // Postprocess
            function (textureMap, additionalData) {},
            // Target
            RenderPass.TEXTURE,
            // Viewport
            null,
            // Bind depth texture to this ID
            "depth_main",
            // Outputs
            [ { id: "color_overlay", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG,
                clearColorArray: this.clear_zero_f32arr } ]
        );
        this.RP_Overlay.view_setup = function (vport) {
             this.viewport = { width: vport.width, height: vport.height };
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

    make_RP_ToneMapToScreen()
    {
        this.RP_ToneMapToScreen_mat = new CustomShaderMaterial("ToneMapping",
            { MODE: 1.0, gamma: 1.0, exposure: 2.0 });
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
