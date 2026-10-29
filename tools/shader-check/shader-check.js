// Shader compile check, the page half; shader-check.mjs drives it in headless Chrome.
//
// For every program in src/shaders/programs.json: reads the vertex and fragment templates,
// collects the flags their #if and #else if lines test, builds both shaders with RenderCore's
// ShaderBuilder for a set of flag combinations, then compiles and links each pair in WebGL2.
// Then builds the programs of the materials in MATERIAL_SETUPS in each of their pass modes.
// The result is left in window.__shaderCheck, and a summary is printed on the page.
//
// URL parameters: rc, the RenderCore root relative to this page (default ../..);
// only, a regular expression on program names.

// Flags the renderer derives from the scene's lights; they come from LIGHT_SETUPS, not from
// the combinations.
const LIGHT_FLAGS = ["NO_LIGHTS", "DLIGHTS", "PLIGHTS", "SLIGHTS"];

// A material sets at most one flag of each group.
const EXCLUSIVE_GROUPS = [
    ["FRONT_SIDE", "BACK_SIDE", "FRONT_AND_BACK_SIDE"],
    ["SMOOTH_SHADING", "FLAT_SHADING"],
    ["SSAAx1", "SSAAx2", "SSAAx4", "SSAAx8", "SSAAx16"],
    ["KERNEL_BOX", "KERNEL_GAUSS", "KERNEL_LANCZOS", "KERNEL_TENT"],
];

// Flags a program's material always sets, added to every combination that has no flag of the
// same exclusive group. Besides these, a program whose Material struct holds nothing but maps
// gets TEXTURE or CUBETEXTURES: its material always has maps.
const DEFAULT_FLAGS = {
    basic_zshape: ["INSTANCED"],                // ZShapeBasicMaterial is instanced only
    custom_SSAA: ["SSAAx2", "KERNEL_BOX"],      // SSAAFX defaults
};

// A flag that samples a map needs the maps.
const IMPLIED_FLAGS = {
    DIFFUSE_TEXTURE: "TEXTURE",
    SPECULAR_TEXTURE: "TEXTURE",
};

// Combinations that do not compile on cb59e2f, the base of the shader-modes branch. Each one is
// built, expected to fail and reported apart from the failures; its first flag is left out of
// the all-together set of the program.
const KNOWN_BROKEN = [
    { program: "phong", flags: ["HEIGHT_MAP"],
      why: "texCoords is declared only with TEXTURE, DIFFUSE_MAP, SPECULAR_MAP or NORMAL_MAP" },
    { program: "phong", flags: ["NORMAL_MAP"],
      why: "the vertex template reads VNorm, which it declares only without NORMAL_MAP and NORMAL_FLAT" },
    { program: "phong", flags: ["NORMAL_FLAT", "CUBETEXTURES"],
      why: "the CUBETEXTURES block reads VNorm, which the vertex template declares only without NORMAL_MAP and NORMAL_FLAT" },
    { program: "phong-FLAT", flags: ["TEXTURE"],
      why: "texture0 is declared as a plain global sampler2D, outside the Material struct" },
    { program: "basic-FLAT", flags: ["TEXTURE"],
      why: "texture0 is declared as a plain global sampler2D, outside the Material struct" },
    { program: "basic", flags: ["CUBETEXTURES", "INSTANCED"],
      why: "MMat is declared twice, as the instance attribute and as the cube-map uniform" },
    { program: "basic_zshape", flags: ["HEIGHT_MAP"],
      why: "main() assigns texCoords, which the template never declares" },
    { program: "custom_SSAA", flags: ["KERNEL_GAUSS"],
      why: "SSAAx2 defines only the box kernel; SSAAFX sets KERNEL_BOX" },
    { program: "custom_SSAA", flags: ["KERNEL_LANCZOS"],
      why: "SSAAx2 defines only the box kernel; SSAAFX sets KERNEL_BOX" },
    { program: "custom_SSAA", flags: ["KERNEL_TENT"],
      why: "SSAAx2 defines only the box kernel; SSAAFX sets KERNEL_BOX" },
];

// The flags of the pass modes, Material.MODE: the pick flags and OUTLINE exclude each other.
const isModeFlag = (f) => f === "OUTLINE" || f.startsWith("PICK_MODE_");

// Materials with pass modes, set up as REve and the examples set them up. Each is built in COLOR
// and in every mode of its passModes, with the flags and values its requiredProgram() gives, so
// the variants the pass modes produce are compiled as the renderer would build them. A map or an
// instance data texture only counts here, so an empty object stands for it.
const MATERIAL_SETUPS = [
    ["ZShape, REve box set, scale per instance, transparent", (RC) => {
        const m = new RC.ZShapeBasicMaterial();
        m.addSBFlag("SCALE_PER_INSTANCE");
        m.transparent = true; m.instanced = true; m.normalFlat = true;
        m.addInstanceData({});
        return m; }],
    ["ZShape, REve box set, mat4 per instance", (RC) => {
        const m = new RC.ZShapeBasicMaterial();
        m.addSBFlag("MAT4_PER_INSTANCE");
        m.instanced = true; m.normalFlat = true;
        m.addInstanceData({});
        return m; }],
    ["ZShape, outlineExample", (RC) => {
        const m = new RC.ZShapeBasicMaterial();
        m.instanced = true;
        m.addInstanceData({});
        return m; }],
    ["ZSprite, REve markers", (RC) => {
        const m = new RC.ZSpriteBasicMaterial();
        m.transparent = true; m.instanced = true;
        m.addInstanceData({}); m.addMap({});
        return m; }],
    ["ZSprite, textured, not instanced", (RC) => {
        const m = new RC.ZSpriteBasicMaterial();
        m.transparent = true;
        m.addMap({});
        return m; }],
    ["ZSprite, REve camera marker", (RC) => new RC.ZSpriteBasicMaterial()],
    ["ZLogo", (RC) => {
        const m = new RC.ZSpriteBasicMaterial();
        m.transparent = true;
        m.addSBFlag("SPRITE_FRAME");
        m.addMap({});
        return m; }],
    ["ZMultiMesh, REve geo top node", (RC) => {
        const m = new RC.ZMultiMeshBasicMaterial();
        m.normalFlat = true;
        return m; }],
    ["ZMultiMesh, clipping planes", (RC) => {
        const m = new RC.ZMultiMeshBasicMaterial();
        m.normalFlat = true;
        m.useClippingPlanes = true;
        m.clippingPlanes = [{}, {}];
        return m; }],
    ["ZLines", (RC) => {
        const m = new RC.ZLinesBasicMaterial();
        m.addInstanceData({}); m.addInstanceData({});
        return m; }],
    ["ZText, transparent", (RC) => {
        const m = new RC.ZTextMaterial();
        m.transparent = true;
        m.addMap({});
        return m; }],
    ["ZText, anchored, Z3DAxis", (RC) => {
        const m = new RC.ZTextMaterial();
        m.enableAnchor3D();
        m.addMap({});
        return m; }],
];

// The ## values, as the materials and the renderer fill them: Material.resetProgramFlagsAndValues
// (NUM_CLIPPING_PLANES; NUM_TEX and NUM_CUBETEXTURES are the number of maps, here one more than
// the highest textureN or cubeTextureN the templates read), the SSAO, volumetric-light and SSAA
// FX defaults (NUM_SAMPLES 8 or 64, NUM_NOISE 4, SSAA_N 2). NUM_LIGHTS is set by nothing in src.
const BASE_VALUES = {
    NUM_CLIPPING_PLANES: 2,
    NUM_SAMPLES: 8,
    NUM_NOISE: 4,
    SSAA_N: 2,
    NUM_LIGHTS: 1,
};

// GLProgramManager.fetchProgram adds the light counts and flags of the scene.
const LIGHT_SETUPS = {
    none: { flags: ["NO_LIGHTS"], values: { NUM_DLIGHTS: 0, NUM_PLIGHTS: 0, NUM_SLIGHTS: 0 } },
    lit:  { flags: ["DLIGHTS", "PLIGHTS", "SLIGHTS"], values: { NUM_DLIGHTS: 1, NUM_PLIGHTS: 2, NUM_SLIGHTS: 1 } },
};

const out = document.getElementById("out");
const say = (s) => { out.textContent += s + "\n"; };

const q = new URLSearchParams(location.search);
const rcBase = new URL((q.get("rc") || "../..").replace(/\/?$/, "/"), location.href);
const only = q.get("only") ? new RegExp(q.get("only")) : null;

window.__shaderCheck = { done: false };

async function fetchText(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status + " " + url);
    return r.text();
}

// The flags a template tests, read the way ShaderBuilder reads lines: block comments and
// line comments removed first.
function testedFlags(src) {
    const flags = new Set();
    src = src.replace(/\/\*[^*]*(?:\*+[^*\/][^*]*)*\*\//g, "");
    for (let line of src.split(/\r?\n/)) {
        line = line.replace(/\/\/.*/, "").trim();
        const m = line.match(/^#(?:if|else\s+if)\s*(\(.*\))\s*$/i);
        if (!m) continue;
        for (const id of m[1].match(/[A-Za-z_][A-Za-z0-9_]*/g) || [])
            if (id !== "true" && id !== "false") flags.add(id);
    }
    return flags;
}

// One more than the highest index of name<N> in the sources, at least 1.
function slotCount(name, ...srcs) {
    let n = 1;
    for (const src of srcs)
        for (const m of src.matchAll(new RegExp("\\b" + name + "(\\d+)\\b", "g"))) n = Math.max(n, +m[1] + 1);
    return n;
}

function mentionsLights(src) {
    return LIGHT_FLAGS.some((f) => new RegExp("\\b" + f + "\\b").test(src)) ||
           /NUM_[DPS]LIGHTS/.test(src);
}

// A combination with its implied flags and the program's defaults added, sorted.
function withDefaults(c, defaults) {
    const r = [...c];
    for (const f of c) if (IMPLIED_FLAGS[f] && !r.includes(IMPLIED_FLAGS[f])) r.push(IMPLIED_FLAGS[f]);
    for (const d of defaults) {
        const g = EXCLUSIVE_GROUPS.find((g) => g.includes(d)) || [d];
        if (!r.some((f) => g.includes(f))) r.push(d);
    }
    return r.sort();
}

// None, each flag alone, the known broken ones, and all together, each with the defaults added.
// "All together" takes from each exclusive group the default, else the first flag the templates
// test, and is made once per pass mode, including no mode.
function flagCombos(flagSet, defaults, known) {
    const flags = [...flagSet].filter((f) => !LIGHT_FLAGS.includes(f) && !defaults.includes(f)).sort();
    const combos = [{ flags: withDefaults([], defaults), all: false }];
    for (const f of flags) combos.push({ flags: withDefaults([f], defaults), all: false });
    for (const k of known)
        if (k.flags.length > 1) combos.push({ flags: withDefaults(k.flags, defaults), all: false });

    const modes = flags.filter(isModeFlag);
    const grouped = new Set(EXCLUSIVE_GROUPS.flat());
    const omit = new Set(known.map((k) => k.flags[0]));
    const all = flags.filter((f) => !isModeFlag(f) && !grouped.has(f) && !omit.has(f));
    for (const g of EXCLUSIVE_GROUPS) {
        const pick = g.find((f) => defaults.includes(f)) || g.find((f) => flagSet.has(f));
        if (pick) all.push(pick);
    }
    for (const m of [null, ...modes]) {
        const c = m ? [...all, m] : [...all];
        if (c.length > 1) combos.push({ flags: withDefaults(c, defaults), all: true });
    }
    // With the defaults added, an all-together combination can repeat a single-flag one.
    const seen = new Map();
    for (const c of combos) {
        const k = c.flags.join(" ");
        if (!seen.has(k) || c.all) seen.set(k, c);
    }
    return [...seen.values()];
}

// cyrb53, for the manifest of built sources.
function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 2654435761);
        h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

function excerpt(src, log) {
    const lines = src.split("\n");
    const want = new Set();
    for (const m of log.matchAll(/ERROR: \d+:(\d+):/g)) {
        const n = +m[1];
        for (let i = Math.max(1, n - 2); i <= Math.min(lines.length, n + 2); i++) want.add(i);
    }
    return [...want].sort((a, b) => a - b)
        .map((i) => String(i).padStart(5) + " | " + lines[i - 1]).join("\n");
}

async function main() {
    const t0 = performance.now();
    const RC = await import(new URL("src/RenderCore.js", rcBase).href);
    const programs = JSON.parse(await fetchText(new URL("src/shaders/programs.json", rcBase)));

    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) throw new Error("no WebGL2 context");

    const builder = new RC.ShaderBuilder();
    const srcCache = new Map();
    const getSrc = async (path) => {
        if (!srcCache.has(path)) srcCache.set(path, await fetchText(new URL("src/shaders/" + path, rcBase)));
        return srcCache.get(path);
    };

    // A template the builder cannot parse: buildTemplateTree only logs the reason.
    const buildTree = (name, src) => {
        const errs = [];
        const ce = console.error;
        console.error = (...a) => errs.push(a.join(" "));
        let ok;
        try { ok = builder.buildTemplateTree(name, src); } finally { console.error = ce; }
        return ok === false ? errs.join("\n") || "buildTemplateTree failed" : null;
    };

    const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        const ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS);
        return { sh, ok, log: ok ? "" : gl.getShaderInfoLog(sh) };
    };

    const pairCache = new Map();   // identical source pairs are compiled once
    const res = { programs: 0, variants: 0, materialVariants: 0, compiles: 0, links: 0, failures: [],
                  knownFailing: [], knownPassing: [], manifest: [] };

    // Compiles and links a built pair once; the result of a pair seen before is reused.
    const compilePair = (vs, fs) => {
        const key = vs + "\u0000" + fs;
        let r = pairCache.get(key);
        if (r) return r;
        const v = compile(gl.VERTEX_SHADER, vs);
        const f = compile(gl.FRAGMENT_SHADER, fs);
        res.compiles += 2;
        r = null;
        if (!v.ok) r = { stage: "vertex", log: v.log, excerpt: excerpt(vs, v.log) };
        else if (!f.ok) r = { stage: "fragment", log: f.log, excerpt: excerpt(fs, f.log) };
        else {
            const p = gl.createProgram();
            gl.attachShader(p, v.sh);
            gl.attachShader(p, f.sh);
            gl.linkProgram(p);
            res.links++;
            if (!gl.getProgramParameter(p, gl.LINK_STATUS))
                r = { stage: "link", log: gl.getProgramInfoLog(p) };
            gl.deleteProgram(p);
        }
        gl.deleteShader(v.sh);
        gl.deleteShader(f.sh);
        r = r || { ok: true };
        pairCache.set(key, r);
        return r;
    };

    for (const [name, def] of Object.entries(programs)) {
        if (only && !only.test(name)) continue;
        res.programs++;
        const vPath = def.shaders.vertex, fPath = def.shaders.fragment;
        let vSrc, fSrc;
        try { vSrc = await getSrc(vPath); fSrc = await getSrc(fPath); }
        catch (e) { res.failures.push({ program: name, stage: "fetch", flags: [], log: String(e) }); continue; }

        const vName = name + ":vertex", fName = name + ":fragment";
        const treeErr = buildTree(vName, vSrc) || buildTree(fName, fSrc);
        if (treeErr) { res.failures.push({ program: name, stage: "template", flags: [], log: treeErr }); continue; }

        const flagSet = new Set([...testedFlags(vSrc), ...testedFlags(fSrc)]);
        const lit = mentionsLights(vSrc) || mentionsLights(fSrc);
        const maps = { NUM_TEX: slotCount("texture", vSrc, fSrc),
                       NUM_CUBETEXTURES: slotCount("cubeTexture", vSrc, fSrc) };

        const defaults = [...(DEFAULT_FLAGS[name] || [])];
        const emptyMaterial = (flags) => {
            const v = { ...BASE_VALUES, ...maps, ...LIGHT_SETUPS.none.values };
            const f = [...flags, ...LIGHT_SETUPS.none.flags];
            try {
                return /struct\s+Material\s*\{\s*\}/.test(builder._templatesCache[vName].tree.build(f.slice(), v) +
                                                        builder._templatesCache[fName].tree.build(f.slice(), v));
            } catch { return false; }
        };
        if (emptyMaterial(defaults))
            for (const m of ["TEXTURE", "CUBETEXTURES"])
                if (flagSet.has(m) && !emptyMaterial([...defaults, m])) { defaults.push(m); break; }
        const known = KNOWN_BROKEN.filter((k) => k.program === name);
        const combos = flagCombos(flagSet, defaults, known);
        const knownOf = (combo) => known.find((k) => withDefaults(k.flags, defaults).join() === combo.join());

        for (const { flags: combo, all } of combos) {
            // The lit setup goes with the all-together combinations only, to bound the run.
            const setups = (lit && all) ? ["none", "lit"] : ["none"];
            for (const s of setups) {
                const L = LIGHT_SETUPS[s];
                const flags = [...combo, ...L.flags];
                const values = { ...BASE_VALUES, ...maps, ...L.values };
                res.variants++;
                const rec = { program: name, flags: combo, lights: s };
                const k = knownOf(combo);
                const report = (r) => {
                    if (k) (r.ok ? res.knownPassing : res.knownFailing).push({ ...rec, ...r, why: k.why });
                    else if (!r.ok) res.failures.push({ ...rec, ...r });
                };

                let vs, fs;
                try {
                    vs = builder._templatesCache[vName].tree.build(flags.slice(), values);
                    fs = builder._templatesCache[fName].tree.build(flags.slice(), values);
                } catch (e) {
                    report({ stage: "build", log: String(e) });
                    continue;
                }
                res.manifest.push(`${name} [${combo.join(" ")}] ${s} ${hash(vs)} ${hash(fs)}`);
                report(compilePair(vs, fs));
            }
        }
    }

    // The pass-mode variants of the materials in MATERIAL_SETUPS.
    const modeName = Object.fromEntries(Object.entries(RC.Material.MODE).map(([k, v]) => [v, k]));
    for (const [label, make] of MATERIAL_SETUPS) {
        const mat = make(RC);
        for (const mode of [RC.Material.MODE.COLOR, ...mat.passModes]) {
            const t = mat.requiredProgram(undefined, mode);
            const name = t.name;
            if (only && !only.test(name)) continue;
            const vTree = builder._templatesCache[name + ":vertex"], fTree = builder._templatesCache[name + ":fragment"];
            const flags = [...t.flags].sort();
            if (!vTree || !fTree) {
                res.failures.push({ program: name, setup: label, stage: "template", flags, log: "not built" });
                continue;
            }
            for (const s of ["none", "lit"]) {
                const L = LIGHT_SETUPS[s];
                const values = { ...BASE_VALUES, ...t.values, ...L.values };
                res.materialVariants++;
                const rec = { program: name, setup: label + ", " + modeName[mode], flags, lights: s };
                let vs, fs;
                try {
                    vs = vTree.tree.build([...flags, ...L.flags], values);
                    fs = fTree.tree.build([...flags, ...L.flags], values);
                } catch (e) {
                    res.failures.push({ ...rec, stage: "build", log: String(e) });
                    continue;
                }
                res.manifest.push(`${name} {${rec.setup}} [${flags.join(" ")}] ${s} ${hash(vs)} ${hash(fs)}`);
                const r = compilePair(vs, fs);
                if (!r.ok) res.failures.push({ ...rec, ...r });
            }
        }
    }

    res.seconds = +((performance.now() - t0) / 1000).toFixed(1);
    const dri = gl.getExtension("WEBGL_debug_renderer_info");
    res.renderer = gl.getParameter(dri ? dri.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    say(`${res.programs} programs, ${res.variants} variants, ${res.materialVariants} material variants, ` +
        `${res.compiles} shader compiles, ${res.links} links, ${res.failures.length} failures, ` +
        `${res.knownFailing.length} known broken, ${res.seconds} s`);
    for (const f of res.knownPassing)
        say(`KNOWN BROKEN BUT COMPILES ${f.program} [${f.flags.join(" ")}] lights=${f.lights}`);
    for (const f of res.failures)
        say(`FAIL ${f.program}${f.setup ? " {" + f.setup + "}" : ""} [${f.flags.join(" ")}] lights=${f.lights} ${f.stage}\n${f.log}`);
    Object.assign(window.__shaderCheck, res, { done: true });
}

main().catch((e) => {
    say("ERROR " + (e && e.stack || e));
    Object.assign(window.__shaderCheck, { done: true, error: String(e && e.stack || e) });
});
