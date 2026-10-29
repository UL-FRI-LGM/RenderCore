#!/usr/bin/env node
// Shader compile check: builds every program in src/shaders/programs.json for a set of
// ShaderBuilder flag combinations, and the programs of a set of materials in each of their pass
// modes, and compiles and links each in headless Chrome. The flag combinations, the materials
// and the ## values are chosen in shader-check.js. No npm dependencies.
//
//   node tools/shader-check/shader-check.mjs [--root DIR] [--only REGEX] [--manifest FILE]
//        [--port 8871] [--tmp DIR] [--chrome /usr/bin/google-chrome] [--gpu] [--timeout 600]
//
// --root      the RenderCore tree to check; default the one holding this script.
// --only      check only the programs whose name matches.
// --manifest  write one line per variant: program, flags, light setup and a hash of the built
//             vertex and fragment source; diff two of them to see which built sources changed.
// --port      port of the static server this script runs on 127.0.0.1.
// --tmp       where Chrome's throw-away profile goes; default the system temp directory.
// --gpu       ANGLE's OpenGL backend instead of SwiftShader.
// --timeout   seconds the whole run may take, Chrome's start included.
//
// Chrome picks its own remote-debugging port, which the script reads from DevToolsActivePort
// in the profile, so it talks only to the Chrome it started.
//
// Prints every failure with the program, the flags, the stage and the GLSL log. Exit code 0
// when everything compiles and links; 1 on failures, an error in the page or a page that does
// not finish within --timeout; 2 when the check itself could not run, an unknown option
// included.

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readdirSync, rmSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// The options, true for those that take a value.
const OPTIONS = { root: true, only: true, manifest: true, port: true, tmp: true, chrome: true,
                  gpu: false, timeout: true };
const usage = (msg) => { console.error("shader-check: " + msg); process.exit(2); };
const A = {};
for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i], name = a.slice(2);
    if (!a.startsWith("--") || !Object.hasOwn(OPTIONS, name)) usage(`unknown argument ${a}`);
    if (!OPTIONS[name]) { A[name] = true; continue; }
    if (i + 1 === process.argv.length) usage(`${a} needs a value`);
    A[name] = process.argv[++i];
}

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(A.root || join(TOOL_DIR, "..", ".."));
const PORT = +(A.port || 8871);
const TIMEOUT = +(A.timeout || 600) * 1000;
const CHROME = A.chrome || "/usr/bin/google-chrome";
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) usage(`bad --port ${A.port}`);
if (!(TIMEOUT > 0)) usage(`bad --timeout ${A.timeout}`);
const DEADLINE = Date.now() + TIMEOUT;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// An error of the page or of the code it checks, exit code 1; any other error is the tool's, 2.
class PageError extends Error {}

// `promise`, or a rejection with an Error of class `E` once the time of --timeout has run out.
function inTime(promise, what, E = Error) {
    let timer;
    const late = new Promise((res, rej) => {
        timer = setTimeout(() => rej(new E(`timed out after ${TIMEOUT / 1000} s, ${what}`)),
                           Math.max(0, DEADLINE - Date.now()));
    });
    return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

// Static server: /tool/ is this directory, /rc/ the RenderCore tree.
const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
                ".html": "text/html", ".wasm": "application/wasm", ".png": "image/png" };
const server = createServer((req, res) => {
    let path;
    try { path = decodeURIComponent(new URL(req.url, "http://x").pathname); }
    catch { res.writeHead(400).end(); return; }
    const mount = path.startsWith("/tool/") ? [TOOL_DIR, path.slice(6)]
                : path.startsWith("/rc/") ? [ROOT, path.slice(4)] : null;
    const file = mount && resolve(mount[0], mount[1]);
    if (!file || !file.startsWith(mount[0] + sep)) { res.writeHead(404).end(); return; }
    try {
        if (!statSync(file).isFile()) throw new Error();
        res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "text/plain",
                             "Cache-Control": "no-store" });
        res.end(readFileSync(file));
    } catch { res.writeHead(404).end(); }
});
try { await new Promise((r, j) => { server.once("error", j); server.listen(PORT, "127.0.0.1", r); }); }
catch (e) { console.error(`shader-check: cannot serve on port ${PORT}: ${e.code || e}`); process.exit(2); }

const profile = mkdtempSync(join(resolve(A.tmp || tmpdir()), "shader-check-chrome-"));
const args = ["--remote-debugging-port=0", `--user-data-dir=${profile}`,
              "--headless=new", "--enable-unsafe-swiftshader", "--no-first-run",
              "--no-default-browser-check", "--disable-extensions", "about:blank"];
if (A.gpu) args.push("--use-angle=gl", "--ignore-gpu-blocklist");
const chrome = spawn(CHROME, args, { stdio: ["ignore", "ignore", "pipe"] });
let chromeErr = "", spawnError = null;
chrome.stderr.on("data", (d) => { chromeErr += d; });
chrome.once("error", (e) => { spawnError = e; });

// Processes whose command line names the profile: Chrome's helpers, which outlive the browser
// process for a moment and write to the profile while they shut down.
function profileUsers() {
    const pids = [];
    for (const pid of readdirSync("/proc")) {
        if (!/^\d+$/.test(pid)) continue;
        try { if (readFileSync(`/proc/${pid}/cmdline`, "latin1").includes(profile)) pids.push(pid); } catch {}
    }
    return pids;
}

// Stops the Chrome this script started, through devtools or else by its own child handle, and
// removes its profile once no process uses it.
let browser = null;
const alive = () => spawnError === null && chrome.exitCode === null && chrome.signalCode === null;
async function stop() {
    server.close();
    if (alive()) {
        const gone = new Promise((r) => chrome.once("exit", r));
        if (browser) browser.send("Browser.close").catch(() => {});
        else chrome.kill("SIGTERM");
        await Promise.race([gone, sleep(5000)]);
        if (alive()) { chrome.kill("SIGKILL"); await Promise.race([gone, sleep(2000)]); }
    }
    for (let i = 0; i < 50 && profileUsers().length; i++) await sleep(100);
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
    catch (e) { console.error(`shader-check: could not remove ${profile}: ${e.code || e}`); }
}
process.on("SIGINT", () => stop().then(() => process.exit(130)));
process.on("SIGTERM", () => stop().then(() => process.exit(143)));

class CDP {
    constructor(ws) {
        this.ws = ws; this.id = 0; this.pend = new Map();
        ws.addEventListener("message", (e) => {
            const m = JSON.parse(e.data);
            if (m.id && this.pend.has(m.id)) {
                const { res, rej } = this.pend.get(m.id);
                this.pend.delete(m.id);
                m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
            }
        });
    }
    // The result of `method`, raced against the time of --timeout; a late answer is dropped.
    send(method, params = {}, sessionId) {
        const id = ++this.id;
        const answer = new Promise((res, rej) => {
            this.pend.set(id, { res, rej });
            this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
        });
        return inTime(answer, "waiting for devtools " + method, method === "Runtime.evaluate" ? PageError : Error)
            .finally(() => this.pend.delete(id));
    }
}

// The browser's devtools websocket, from the port and the path Chrome writes into
// DevToolsActivePort in its profile once it listens.
async function cdpEndpoint() {
    const file = join(profile, "DevToolsActivePort");
    while (Date.now() < DEADLINE) {
        if (spawnError) throw new Error(`cannot start ${CHROME}: ${spawnError.code || spawnError.message}`);
        if (!alive()) throw new Error(`Chrome exited (${chrome.exitCode ?? chrome.signalCode}) before devtools came up.\n` + chromeErr);
        let lines = [];
        try { lines = readFileSync(file, "latin1").split("\n"); } catch {}
        if (/^\d+$/.test(lines[0]) && lines[1]?.startsWith("/devtools/browser/"))
            return `ws://127.0.0.1:${lines[0]}${lines[1].trim()}`;
        await sleep(100);
    }
    throw new Error(`Chrome's devtools endpoint did not come up within ${TIMEOUT / 1000} s.\n` + chromeErr);
}

let code = 2;
try {
    const ws = new WebSocket(await cdpEndpoint());
    await inTime(new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error("devtools websocket")); }),
                 "opening the devtools websocket");
    browser = new CDP(ws);
    const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });
    const S = (m, p) => browser.send(m, p, sessionId);
    await S("Runtime.enable");
    await S("Debugger.enable");
    await S("Debugger.setSkipAllPauses", { skip: true });

    // Exceptions and console errors that are not the shader-check's own, such as a module
    // of RenderCore that fails to load, and the files that do not parse, which the SyntaxError
    // the page reports does not name.
    const pageErrors = [];
    const served = `http://127.0.0.1:${PORT}/rc/`;
    ws.addEventListener("message", (e) => {
        const m = JSON.parse(e.data);
        if (m.method === "Debugger.scriptFailedToParse")
            pageErrors.push(`${m.params.url.startsWith(served) ? join(ROOT, m.params.url.slice(served.length)) : m.params.url} does not parse`);
        if (m.method === "Runtime.exceptionThrown")
            pageErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
        if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
            pageErrors.push(m.params.args.map((a) => a.value ?? a.description ?? "?").join(" "));
    });

    const only = A.only ? "&only=" + encodeURIComponent(A.only) : "";
    await S("Page.navigate", { url: `http://127.0.0.1:${PORT}/tool/shader-check.html?rc=/rc${only}` });

    // Each evaluate is raced against the deadline, as it does not return while the page's
    // main thread is busy.
    let r;
    for (;;) {
        const v = await S("Runtime.evaluate", {
            expression: "window.__shaderCheck && window.__shaderCheck.done ? JSON.stringify(window.__shaderCheck) : null",
            returnByValue: true });
        if (v.result.value) { r = JSON.parse(v.result.value); break; }
        await inTime(sleep(500), "waiting for the page to finish", PageError);
    }
    for (const e of pageErrors) console.log("page error: " + e);
    if (r.error) throw new PageError("error in the page: " + r.error);

    console.log(`shader-check: ${ROOT}`);
    console.log(`${r.programs} programs, ${r.variants} variants, ${r.materialVariants} material variants, ` +
                `${r.compiles} shader compiles, ${r.links} links, ${r.failures.length} failures, ` +
                `${r.knownFailing.length} known broken, ${r.seconds} s, ${r.renderer}`);
    if (A.manifest) writeFileSync(A.manifest, r.manifest.join("\n") + "\n");
    for (const f of r.knownFailing)
        console.log(`known broken: ${f.program} [${f.flags.join(" ")}] ${f.stage}: ${f.why}`);
    for (const f of r.knownPassing)
        console.log(`NOTE: listed as known broken but compiles, remove it from KNOWN_BROKEN: ` +
                    `${f.program} [${f.flags.join(" ")}]`);
    for (const f of r.failures) {
        console.log(`\nFAIL ${f.program}${f.setup ? " {" + f.setup + "}" : ""} [${f.flags.join(" ")}] ` +
                    `lights=${f.lights ?? "-"} ${f.stage}`);
        console.log(f.log.trim());
        if (f.excerpt) console.log(f.excerpt);
    }
    code = (r.failures.length || pageErrors.length) ? 1 : 0;
} catch (e) {
    code = (e instanceof PageError) ? 1 : 2;
    console.error("shader-check: " + (code === 1 ? e.message : (e.stack || e)));
} finally {
    await stop();
}
process.exit(code);
