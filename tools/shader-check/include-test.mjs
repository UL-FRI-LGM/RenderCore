#!/usr/bin/env node
// Test of ShaderBuilder's #include and of the snippets in ShaderSnippets, in node, no browser:
// expands test templates through snippets registered with ShaderBuilder.registerSnippet() and
// checks the built source and the errors. The GLSL of the snippets is compiled by
// shader-check.mjs.
//
//   node tools/shader-check/include-test.mjs [--root DIR]
//
// --root  the RenderCore tree to test; default the one holding this script.
//
// Prints one line per check. Exit code 0 when every check passes, 1 otherwise.

import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const argRoot = process.argv.indexOf("--root");
const ROOT = resolve(argRoot > 0 ? process.argv[argRoot + 1] : join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const { ShaderBuilder } = await import(pathToFileURL(join(ROOT, "src/program_management/ShaderBuilder.js")).href);
const { ShaderSnippets } = await import(pathToFileURL(join(ROOT, "src/program_management/ShaderSnippets.js")).href);
const { ShaderLoader } = await import(pathToFileURL(join(ROOT, "src/loaders/ShaderLoader.js")).href);

let failed = 0, passed = 0;
function check(what, ok, detail = "") {
    if (ok) passed++; else failed++;
    console.log((ok ? "ok    " : "FAIL  ") + what + (ok || !detail ? "" : "\n      " + detail.replace(/\n/g, "\n      ")));
}

// The Error that f() throws, or null.
function thrown(f) {
    try { f(); } catch (e) { return e; }
    return null;
}

// Runs f() with console.error collected; returns [result, the collected lines].
function quietly(f) {
    const errs = [], ce = console.error;
    console.error = (...a) => errs.push(a.join(" "));
    try { return [f(), errs]; } finally { console.error = ce; }
}

let nTemplates = 0;
// Parses `src` as a new template; returns the builder and the template name.
function parse(src) {
    const sb = new ShaderBuilder();
    const name = "test" + (++nTemplates);
    const r = sb.buildTemplateTree(name, src);
    if (r !== true) throw new Error("buildTemplateTree returned " + r);
    return { sb, name };
}
const build = (t, flags = [], values = {}) => t.sb._templatesCache[t.name].tree.build(flags.slice(), values);

// The flags the #if and #else if lines of a source test.
function testedFlags(src) {
    const flags = new Set();
    for (const m of src.matchAll(/^\s*#(?:if|else\s+if)\s*(\(.*\))\s*$/gim))
        for (const id of m[1].match(/[A-Za-z_][A-Za-z0-9_]*/g) || []) flags.add(id);
    return [...flags];
}

// --- registration, before any template is parsed ---------------------------------------------

const user = {
    t_plain_decl:   "x;\ny; // a line comment\n/* a block\n   comment */",
    t_outer_decl:   "o1;\n#include t_plain_decl\no2;",
    t_cond_decl:    "#if (FOO)\n    foo = ##N;\n#else\n    bar;\n#fi",
    t_loop_stmt:    "v##I = ##I;",
    t_count_stmt:   "#for L in 0 to NUM_L\n    l##L = ##NUM_L;\n#end",
    t_nested_if_decl: "#if (A)\n    a;\n    #include t_cond_decl\n#fi",
    t_cyc_a_decl:   "#include t_cyc_b_decl",
    t_cyc_b_decl:   "#include t_cyc_a_decl",
    t_self_decl:    "s;\n#include t_self_decl",
    t_d1_decl:      "#include t_d2_decl",
    t_d2_decl:      "#include t_d3_decl",
    t_d3_decl:      "#include t_d4_decl",
    t_d4_decl:      "#include t_d5_decl",
    t_d5_decl:      "deep;",
    t_inner_missing_decl: "i;\n#include t_nowhere_decl",
    t_badcmd_decl:  "#fi",
    t_open_decl:    "#if (A)\n    a;",
    t_empty_decl:   "",
};
for (const [name, src] of Object.entries(user)) ShaderBuilder.registerSnippet(name, src);
check("registerSnippet() before the first parse adds the snippets",
      Object.keys(user).every((n) => ShaderBuilder.snippet(n) === user[n]));

for (const [name, why] of [["t_nokind", "no kind suffix"], ["9x_decl", "not an identifier"],
                           ["t-x_decl", "not an identifier"], ["t_x_decl ", "trailing space"]]) {
    const e = thrown(() => ShaderBuilder.registerSnippet(name, "x;"));
    check(`registerSnippet("${name}") throws, ${why}`, e instanceof Error && e.message.includes(name), String(e));
}
{
    const e = thrown(() => ShaderBuilder.registerSnippet("pick_frag_decl", "x;"));
    check("registerSnippet() of a library name throws", e instanceof Error && /already defined/.test(e.message), String(e));
    const e2 = thrown(() => ShaderBuilder.registerSnippet("t_plain_decl", "x;"));
    check("registerSnippet() of a registered name throws", e2 instanceof Error && /already defined/.test(e2.message), String(e2));
    const e3 = thrown(() => ShaderBuilder.registerSnippet("t_num_decl", 3));
    check("registerSnippet() of a non-string source throws", e3 instanceof Error, String(e3));
}

// --- the library ------------------------------------------------------------------------------

check("ShaderSnippets is frozen", Object.isFrozen(ShaderSnippets));
check("ShaderSnippets names are identifiers ending in _decl or _stmt",
      Object.keys(ShaderSnippets).every((n) => ShaderBuilder.snippetNameRegex.test(n)),
      Object.keys(ShaderSnippets).filter((n) => !ShaderBuilder.snippetNameRegex.test(n)).join(" "));
for (const [name, src] of Object.entries(ShaderSnippets)) {
    const flags = testedFlags(src);
    let ok = true, detail = "";
    try {
        const t = parse("#include " + name);
        const values = { NUM_CLIPPING_PLANES: 2 };
        const none = build(t, [], values), all = build(t, flags, values);
        ok = all.length > 0 && !/##/.test(all) && !/#(if|else|fi|for|end|include)\b/.test(none + all);
        detail = all;
    } catch (e) { ok = false; detail = String(e); }
    check(`library snippet ${name} expands, flags [${flags.join(" ")}]`, ok, detail);
}

// --- expansion --------------------------------------------------------------------------------

check("a plain include", build(parse("a;\n#include t_plain_decl\nb;")) === "a;\nx;\ny; \nb;");
check("an include line with a line comment", build(parse("#include t_plain_decl // the plain one\nb;")) === "x;\ny; \nb;");
check("an indented include", build(parse("{\n        #include t_plain_decl\n}")) === "{\nx;\ny; \n}");
check("a nested include", build(parse("#include t_outer_decl")) === "o1;\nx;\ny; \no2;");
{
    const t = parse("#include t_cond_decl");
    check("#if and ## in a snippet, flag set", build(t, ["FOO"], { N: 3 }) === "foo = 3;");
    check("#if and ## in a snippet, flag not set", build(t, [], { N: 3 }) === "bar;");
    check("#if in a snippet, a longer flag with the name as prefix", build(t, ["FOO_BAR"], { N: 3 }) === "bar;");
    check("fetchShader() of a template with an include", t.sb.fetchShader(t.name, ["FOO"], { N: 4 }) === "foo = 4;");
}
{
    const t = parse("#if (A)\n#include t_plain_decl\n#else\nz;\n#fi");
    check("an include in a template #if block", build(t, ["A"]) === "x;\ny; " && build(t, []) === "z;");
}
{
    const t = parse("#include t_nested_if_decl");
    check("an include in a snippet #if block", build(t, ["A", "FOO"], { N: 1 }) === "a;\nfoo = 1;" && build(t, ["FOO"], { N: 1 }) === "");
}
check("an include in a #for loop, the loop index in the snippet",
      build(parse("#for I in 0 to 3\n#include t_loop_stmt\n#end")) === "v0 = 0;\nv1 = 1;\nv2 = 2;");
check("a #for loop over a ## value in a snippet",
      build(parse("#include t_count_stmt"), [], { NUM_L: 2 }) === "l0 = 2;\nl1 = 2;");
check("an empty snippet", build(parse("a;\n#include t_empty_decl\nb;")) === "a;\nb;");
check("nesting at the depth limit", build(parse("#include t_d2_decl")) === "deep;");

// --- errors -----------------------------------------------------------------------------------

// A bad #include: buildTemplateTree() returns false, throws nothing and logs an error that names
// the template and every string of `must`.
function failsFor(what, src, ...must) {
    const name = "test" + (++nTemplates);
    let r, errs = [];
    const e = thrown(() => { [r, errs] = quietly(() => new ShaderBuilder().buildTemplateTree(name, src)); });
    const log = errs.join("\n");
    const ok = e === null && r === false && must.every((m) => log.includes(m)) && log.includes('template "' + name + '"');
    check(what, ok, e !== null ? "threw " + e : "returned " + r + "\n" + log);
}
failsFor("a missing snippet fails, naming it, the line and the template", "#include t_nope_decl",
         '"t_nope_decl"', 'line "#include t_nope_decl" of template');
failsFor("a missing snippet in a snippet fails, naming both, the line and the template", "#include t_inner_missing_decl",
         '"t_nowhere_decl"', 'line "#include t_nowhere_decl" of snippet "t_inner_missing_decl" in template');
failsFor("a cycle fails, naming the snippets, the line and the template", "#include t_cyc_a_decl",
         "includes itself (t_cyc_a_decl -> t_cyc_b_decl -> t_cyc_a_decl)",
         'line "#include t_cyc_a_decl" of snippet "t_cyc_b_decl" in template');
failsFor("a snippet that includes itself fails", "#include t_self_decl", "includes itself (t_self_decl -> t_self_decl)",
         'line "#include t_self_decl" of snippet "t_self_decl" in template');
failsFor("nesting deeper than the limit fails", "#include t_d1_decl",
         "nested deeper than " + ShaderBuilder.MAX_INCLUDE_DEPTH, "t_d1_decl -> t_d2_decl -> t_d3_decl -> t_d4_decl -> t_d5_decl",
         'line "#include t_d5_decl" of snippet "t_d4_decl" in template');
failsFor("#include without a name fails, naming the line", "a;\n#include\nb;", "malformed", 'line "#include" of template');
failsFor("#include with two names fails, naming the line", "#include t_plain_decl t_outer_decl", "malformed",
         'line "#include t_plain_decl t_outer_decl" of template');
failsFor("#include <name> fails, naming the line", "#include <t_plain_decl>", "malformed", 'line "#include <t_plain_decl>" of template');
{
    const sb = new ShaderBuilder();
    let r1;
    const e = thrown(() => { [r1] = quietly(() => sb.buildTemplateTree("test_bad_then", "#include t_nope_decl")); });
    const r2 = sb.buildTemplateTree("test_good_after", "a;\n#include t_plain_decl");
    check("a builder parses the next template after a bad #include, and keeps no tree of the bad one",
          e === null && r1 === false && !sb.hasTemplate("test_bad_then") && r2 === true && sb.hasTemplate("test_good_after"),
          e !== null ? "threw " + e : "returned " + r1 + " and " + r2);
}
{
    // ShaderLoader runs its loads one after the other; a load that throws in onLoad never calls
    // its done callback, and every load queued after it waits for ever. The shader sources come
    // from a stand-in for the XHR loader, asynchronous like XHR.
    const sl = new ShaderLoader();
    sl._programs = { bad: { shaders: { vert: "bad.vert" }, urls: ["/"] }, good: { shaders: { vert: "good.vert" }, urls: ["/"] } };
    const SRC = { "/bad.vert": "#include t_nope_decl\nvoid main() {}", "/good.vert": "void main() {}" };
    const pending = [];
    sl._xhrLoader = { load: (url, onLoad) => pending.push(() => onLoad(SRC[url])) };
    const sb = new ShaderBuilder();
    const loaded = [], threw = [];
    const onLoad = (t) => { for (const k in t.sources) sb.buildTemplateTree("loader_" + t.id + k, t.sources[k]); loaded.push(t.id); };
    quietly(() => {
        sl.loadProgramSources("bad", onLoad, undefined, () => {});
        sl.loadProgramSources("good", onLoad, undefined, () => {});
        while (pending.length) { try { pending.shift()(); } catch (e) { threw.push(String(e)); } }
    });
    check("ShaderLoader loads the next program after a bad #include",
          threw.length === 0 && loaded.join() === "bad,good" && sl._queue.length === 0 && sl._inProgress === false,
          `threw [${threw.join("; ")}], loaded [${loaded}], queue ${sl._queue.length}, in progress ${sl._inProgress}`);
}

check("#include is a builder command", ShaderBuilder.commandRegex.test("#include t_plain_decl"));
{
    const [r, errs] = quietly(() => new ShaderBuilder().buildTemplateTree("test_mid", "a; #include t_plain_decl"));
    check("#include after code on a line is not parsed as code", r === false && errs.length > 0, errs.join("\n"));
}
{
    const [r, errs] = quietly(() => new ShaderBuilder().buildTemplateTree("test_badcmd", "#include t_badcmd_decl"));
    check("a bad command in a snippet is reported with the snippet name",
          r === false && errs.some((l) => l.includes("(snippet t_badcmd_decl)")), errs.join("\n"));
}
{
    const [r, errs] = quietly(() => new ShaderBuilder().buildTemplateTree("test_open", "#include t_open_decl"));
    check("an #if a snippet leaves open fails the template", r === false && errs.length > 0, errs.join("\n"));
}

// --- registration after a parse ---------------------------------------------------------------

{
    const e = thrown(() => ShaderBuilder.registerSnippet("t_late_decl", "late;"));
    check("registerSnippet() after a template was parsed throws",
          e instanceof Error && e.message.includes("t_late_decl") && /after a template was parsed/.test(e.message), String(e));
    check("the late snippet is not added", ShaderBuilder.snippet("t_late_decl") === undefined);
}

console.log(`${passed + failed} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
