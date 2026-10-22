// ZLines example: helical tracks from one point, drawn as cubic Hermite
// segments from (position, direction, arc length) records, one draw call.
// Click a track to pick it (secondary, per-line pick) and outline it.
// URL options: ?n=400 tracks, ?samples=12 quads per segment, ?step=30 degrees
// per control point, ?poly=1 draws the dense polyline version instead,
// ?world=1 gives the width in world units, ?width=3 line width.

import * as RC from "../../src/contrib/REveRenderCore.js";

const q = new URLSearchParams(window.location.search);
const N_TRACKS = parseInt(q.get("n") || "400");
const SAMPLES  = parseInt(q.get("samples") || "12");
const STEP_DEG = parseFloat(q.get("step") || "30");
const POLY     = q.get("poly") === "1";
const WORLD    = q.get("world") === "1";
const WIDTH    = parseFloat(q.get("width") || "3");
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
    return dense ? { points: points } : { points: points, dirs: dirs, lens: lens };
}

let seed = 12345;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

const lines = [];
for (let i = 0; i < N_TRACKS; ++i) {
    const pt = 0.3 + 4.7 * rnd() * rnd();
    const charge = rnd() < 0.5 ? -1 : 1;
    const l = helixRecords(pt, 2 * Math.PI * rnd(), -2 + 4 * rnd(), charge, STEP_DEG, 120, 300, POLY);
    l.color = charge < 0 ? [0.3, 0.5, 1.0] : [1.0, 0.4, 0.3];
    lines.push(l);
}
const packed = RC.ZLines.pack(lines);
// first instance of each line, so a line index expands to its instances
const lineStart = new Int32Array(lines.length + 1);
for (let i = 0, n = 0; i < lines.length; ++i) { lineStart[i] = n; n += lines[i].points.length; lineStart[i + 1] = n; }

const zl = new RC.ZLines(null, { samples: POLY ? 1 : SAMPLES, lineWidth: WIDTH, screenWidth: !WORLD });
zl.setLines(packed);
zl.pickable = true;
scene.add(zl);
console.log("ZLines:", N_TRACKS, "tracks,", packed.nPoints, "points, samples", zl.samples, "poly", POLY);

// a reference cube so the outline pass has a solid object too
const cube = new RC.Cube(20, new RC.Color(0.2, 0.2, 0.2));
cube.material = new RC.MeshBasicMaterial();
cube.material.emissive.set(0.15, 0.15, 0.15);
cube.position.set(0, 0, -150);
scene.add(cube);

// --- picking and outline ----------------------------------------------------

let outlined = [];     // line indices
window.pickedLine = null;

function instancesOfLines(idcs) {
    const out = [];
    for (const l of idcs) for (let i = lineStart[l]; i < lineStart[l + 1]; ++i) out.push(i);
    return out;
}

window.pickAt = function (x, y) {
    rqt.pick_begin(x, y);
    const state = rqt.pick(x, y, false);
    if (state.object === zl) {
        rqt.pick_instance_low_level(rqt.pqueue, state);
        window.pickedLine = state.instance;
        outlined = (state.instance !== null && state.instance !== undefined) ? [state.instance] : [];
    } else {
        window.pickedLine = null;
        outlined = [];
    }
    rqt.pick_end();
    console.log("pick at", x, y, "object", state.object ? state.object.type : null, "line", window.pickedLine);
    return window.pickedLine;
};

window.outlineLines = function (idcs) { outlined = idcs.slice(); };

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
        zl.outlineMaterial.outline_instances_setup(instancesOfLines(outlined));
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
