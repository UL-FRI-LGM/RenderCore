// ZLines example: helical tracks from one point, drawn as cubic Hermite
// segments, one stroke per track, built through ZLinesBuilder.
// Click a track to pick it (secondary, per-segment pick) and outline its stroke.
// URL options: ?n=400 tracks, ?samples=12 quads per segment, ?step=30 degrees
// per control point, ?poly=1 draws the dense polyline version instead (2
// degrees per point, zero directions, samples 1), ?catmull=1 writes zero
// directions so the shader takes Catmull-Rom tangents from the neighbours,
// ?wvar=1 makes the width grow along each track, ?hide=k hides every k-th
// stroke, ?world=1 gives the width in world units, ?width=3 line width,
// ?direct=1 renders without RendeQuTor.

import * as RC from "../../src/contrib/REveRenderCore.js";

const q = new URLSearchParams(window.location.search);
const N_TRACKS = parseInt(q.get("n") || "400");
const SAMPLES  = parseInt(q.get("samples") || "12");
const STEP_DEG = parseFloat(q.get("step") || "30");
const POLY     = q.get("poly") === "1";
const WORLD    = q.get("world") === "1";
const WIDTH    = parseFloat(q.get("width") || "3");
const CATMULL  = q.get("catmull") === "1";
const WVAR     = q.get("wvar") === "1";
const HIDE     = parseInt(q.get("hide") || "0");
const DIRECT   = q.get("direct") === "1";   // plain renderer.render, no RendeQuTor

const canvas = new RC.Canvas(document.body);
const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
renderer.clearColor = "#000000FF";
renderer.pickObject3D = true;   // as GlViewerRCore: the pick pass resolves the Object3D
renderer.addShaderLoaderUrls("../../src/shaders");

const scene = new RC.Scene();
const camera = new RC.PerspectiveCamera(50, canvas.width / canvas.height, 1, 5000);
camera.position.set(0, 0, 420);
camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));

const overlay_scene = new RC.Scene();
const overlay_camera = new RC.OrthographicCamera(0, 1, 1, 0, -1000, 1000);

const rqt = new RC.RendeQuTor(renderer, scene, camera, overlay_scene, overlay_camera);
rqt.initSimple(1);
rqt.set_tone_mapping("linear");

// --- tracks -----------------------------------------------------------------

// Helix of a charged particle in B = 3.8 T along z, from the origin:
// R[cm] = pT[GeV] / (0.3 * B) * 100.
function helixRecords(pt, phi0, eta, charge, stepDeg, maxR, maxZ, dense) {
    const B = 3.8, R = pt * 100 / (0.3 * B);
    const lam = Math.atan(Math.sinh(eta));            // dip angle
    const cl = Math.cos(lam), sl = Math.sin(lam);
    const dphi = (dense ? 2 : stepDeg) * Math.PI / 180;  // dense: 2 degrees per point, no dirs
    const L = R * dphi / cl;                          // arc length per step
    const s = -charge;                                // turning sense
    // centre of the circle in the transverse plane
    const cx = -s * R * Math.sin(phi0), cy = s * R * Math.cos(phi0);
    const points = [], dirs = [], lens = [];
    // position and direction after u steps, u need not be an integer
    const at = (u) => {
        const a = s * u * dphi;
        return [[cx + s * R * Math.sin(phi0 + a), cy - s * R * Math.cos(phi0 + a), u * dphi * R * sl / cl],
                [cl * Math.cos(phi0 + a), cl * Math.sin(phi0 + a), sl]];
    };
    const inside = (p) => Math.hypot(p[0], p[1]) <= maxR && Math.abs(p[2]) <= maxZ;
    for (let i = 0; i < 4096; ++i) {
        let [p, d] = at(i);
        let last = false;
        if (!inside(p)) {
            // end the line on the boundary: bisect the last, partial step
            let lo = i - 1, hi = i;
            for (let k = 0; k < 30; ++k) { const m = 0.5 * (lo + hi); if (inside(at(m)[0])) lo = m; else hi = m; }
            [p, d] = at(lo);
            lens[lens.length - 1] = L * (lo - (i - 1));
            last = true;
        }
        points.push(p);
        dirs.push(d);
        lens.push(L);
        if (last) break;
    }
    return { points: points, dirs: dirs, lens: lens };
}

let seed = 12345;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

const builder = new RC.ZLinesBuilder();
for (let i = 0; i < N_TRACKS; ++i) {
    const pt = 0.3 + 4.7 * rnd() * rnd();
    const charge = rnd() < 0.5 ? -1 : 1;
    const l = helixRecords(pt, 2 * Math.PI * rnd(), -2 + 4 * rnd(), charge, STEP_DEG, 120, 300, POLY);
    const col = charge < 0 ? [0.3, 0.5, 1.0] : [1.0, 0.4, 0.3];
    const n = l.points.length;
    const zeroDirs = POLY || CATMULL;
    // ?wvar=1: W from 0.5 at the first point to 2 at the last, linear in the
    // point index, so dW/dt per segment is the constant step.
    const dW = n > 1 ? 1.5 / (n - 1) : 0;
    const idx = [];
    for (let j = 0; j < n; ++j) {
        const p = l.points[j], d = zeroDirs ? [0, 0, 0] : l.dirs[j];
        const W = WVAR ? 0.5 + dW * j : 1, S = WVAR ? dW : 0;
        idx.push(builder.addPoint(p[0], p[1], p[2], d[0], d[1], d[2], W, S));
    }
    const visible = !(HIDE > 0 && i % HIDE === HIDE - 1);
    builder.beginStroke(RC.ZLinesBuilder.rgba(col[0], col[1], col[2]), visible ? 1 : 0);
    // Polylines take the chord as arc length; Hermite segments the helix arc.
    builder.addPolyline(idx, POLY ? undefined : l.lens.slice(0, n - 1));
    builder.endStroke();
}
const data = builder.build();

const zl = new RC.ZLines(null, { samples: POLY ? 1 : SAMPLES, lineWidth: WIDTH, screenWidth: !WORLD });
zl.setData(data);
zl.pickable = true;
scene.add(zl);
console.log("ZLines:", N_TRACKS, "tracks,", data.nPoints, "points,", data.nSegs, "segments, samples", zl.samples,
            "poly", POLY, "catmull", CATMULL, "wvar", WVAR, "hide", HIDE);

// a reference cube so the outline pass has a solid object too
const cube = new RC.Cube(20, new RC.Color(0.2, 0.2, 0.2));
cube.material = new RC.MeshBasicMaterial();
cube.material.emissive.set(0.15, 0.15, 0.15);
cube.position.set(0, 0, -150);
scene.add(cube);

// --- picking and outline ----------------------------------------------------

let outlined = [];     // segment indices
window.picked = null;

// The segments of the visible strokes in the list.
function segmentsOfStrokes(strokes) {
    const out = [];
    for (const k of strokes) {
        if (!data.strokeVisible(k)) continue;
        for (let s = data.strokeFirstSeg(k), e = s + data.strokeCount(k); s < e; ++s) out.push(s);
    }
    return out;
}

// Returns { seg, stroke } of the picked segment, or null.
window.pickAt = function (x, y) {
    rqt.pick_begin(x, y);
    const state = rqt.pick(x, y, false);
    window.picked = null;
    if (state.object === zl) {
        rqt.pick_instance_low_level(rqt.pqueue, state);
        if (state.instance !== null && state.instance !== undefined)
            window.picked = { seg: state.instance, stroke: data.segStroke(state.instance) };
    }
    outlined = window.picked ? segmentsOfStrokes([window.picked.stroke]) : [];
    rqt.pick_end();
    console.log("pick at", x, y, "object", state.object ? state.object.type : null,
                "picked", JSON.stringify(window.picked));
    return window.picked;
};

window.outlineStrokes = function (strokes) { outlined = segmentsOfStrokes(strokes); };

// Hide (or show) strokes through the tables.
window.setStrokesVisible = function (strokes, on) {
    for (const k of strokes) data.setStrokeVisible(k, on);
    zl.tablesChanged();
};

function mousedown(event) {
    if (event.which !== 1) return;
    const pr = window.devicePixelRatio || 1;
    window.pickAt(event.clientX * pr, event.clientY * pr);
}

// --- render -----------------------------------------------------------------

function resize() {
    canvas.updateSize();
    camera.aspect = canvas.width / canvas.height;
    camera.updateProjectionMatrix();
    renderer.updateViewport(canvas.width, canvas.height);
    rqt.updateViewport(canvas.width, canvas.height);
}

window.frames = 0;
window.RC = RC; window.rqt = rqt; window.renderer = renderer; window.scene = scene; window.camera = camera; window.zl = zl;
window.data = data;
function render() {
    if (DIRECT) {
        renderer.render(scene, camera);
        ++window.frames;
        window.requestAnimationFrame(render);
        return;
    }
    rqt.render_begin(true);
    if (outlined.length > 0) {
        rqt.RP_GBuffer.obj_list.push(zl);
        zl.outlineMaterial.outline_instances_setup(outlined);
        rqt.RP_Outline_mat.setUniform("edgeColor", [2, 2, 0, 1]);
        rqt.render_outline();
        rqt.RP_GBuffer.obj_list = [];
    }
    rqt.render_main_and_blend_outline();
    if (rqt.queue.used_fail_count == 0) {
        rqt.render_tone_map_to_screen();
    }
    rqt.render_end();
    ++window.frames;
    window.requestAnimationFrame(render);
}

window.onload = function () {
    window.addEventListener("resize", resize, false);
    window.addEventListener("mousedown", mousedown, false);
    resize();
    window.requestAnimationFrame(render);
};
