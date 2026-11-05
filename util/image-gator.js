const express = require('express');
const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const path = require('path');
const { parseArgs } = require('util');

const USAGE = `Usage: node image-gator.js [options]

  --host H          listen address (GATOR_HOST, default 127.0.0.1)
  --port P          listen port (GATOR_PORT, default 3000)
  --out DIR         output directory (GATOR_OUT, default ./captures)
  --max-mb N        largest accepted body in MiB (GATOR_MAX_MB, default 64)
  --origins a,b,c   CORS allowlist (GATOR_ORIGINS); without it the origin is reflected
  --auth            require a signed token; the secret is read from GATOR_SECRET
  --tls-key FILE    serve HTTPS, together with --tls-cert
  --tls-cert FILE
  -h, --help`;

function fail(msg) {
  console.error(`image-gator: ${msg}`);
  process.exit(1);
}

// The secret only ever comes from the environment: a command line is visible
// to every user of the machine through ps.
if (process.argv.some(a => a.startsWith('--secret'))) {
  fail('the secret is read from the environment variable GATOR_SECRET, never from the command line');
}

let opts;
try {
  opts = parseArgs({
    options: {
      host:       { type: 'string' },
      port:       { type: 'string' },
      out:        { type: 'string' },
      'max-mb':   { type: 'string' },
      origins:    { type: 'string' },
      auth:       { type: 'boolean', default: false },
      'tls-key':  { type: 'string' },
      'tls-cert': { type: 'string' },
      help:       { type: 'boolean', short: 'h', default: false }
    },
    strict: true
  }).values;
} catch (err) {
  fail(`${err.message}\n\n${USAGE}`);
}
if (opts.help) {
  console.log(USAGE);
  process.exit(0);
}

const HOST = opts.host || process.env.GATOR_HOST || '127.0.0.1';
const PORT = Number(opts.port || process.env.GATOR_PORT || 3000);
const OUTPUT_DIR = opts.out || process.env.GATOR_OUT || './captures';
const MAX_MB = Number(opts['max-mb'] || process.env.GATOR_MAX_MB || 64);
const ORIGINS_ARG = opts.origins || process.env.GATOR_ORIGINS || '';
const ORIGINS = ORIGINS_ARG ? ORIGINS_ARG.split(',').map(s => s.trim()).filter(Boolean) : null;

if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) fail(`bad port '${PORT}'`);
if (!(MAX_MB > 0)) fail(`bad --max-mb '${opts['max-mb'] || process.env.GATOR_MAX_MB}'`);
const MAX_BYTES = Math.floor(MAX_MB * 1024 * 1024);

const SECRET = process.env.GATOR_SECRET || '';
if (opts.auth && !SECRET) fail('--auth needs the secret in the environment variable GATOR_SECRET');

if (!!opts['tls-key'] !== !!opts['tls-cert']) fail('--tls-key and --tls-cert go together');
let tls = null;
if (opts['tls-key']) {
  try {
    tls = { key: fs.readFileSync(opts['tls-key']), cert: fs.readFileSync(opts['tls-cert']) };
  } catch (err) {
    fail(`cannot read the TLS key or certificate: ${err.message}`);
  }
}

// Ensure capture directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function isLoopback(host) {
  if (host === 'localhost') return true;
  if (net.isIPv4(host)) return host.startsWith('127.');
  if (net.isIPv6(host)) return host === '::1' || /^::ffff:127\./i.test(host);
  return false;
}

// Header values end up in the filename, so only [A-Za-z0-9_-] survives.
function sanitise(raw, fallback) {
  if (!raw) return fallback;
  return raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
}

// Token is exp.sig, both base64url without padding: exp the expiry in Unix
// seconds as decimal digits, sig = HMAC-SHA256(secret, event_id|view_type|exp)
// over the raw header values. Returns null if the token is good, else the reason.
function checkToken(req) {
  const m = /^Bearer ([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(req.headers['authorization'] || '');
  if (!m) return 'missing or malformed bearer token';
  const exp = Buffer.from(m[1], 'base64url').toString('latin1');
  if (!/^[0-9]{1,15}$/.test(exp)) return 'malformed token expiry';
  const msg = `${req.headers['x-event-id'] || ''}|${req.headers['x-view-type'] || ''}|${exp}`;
  const want = Buffer.from(crypto.createHmac('sha256', SECRET).update(msg, 'utf8').digest('base64url'));
  const got = Buffer.from(m[2]);
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return 'bad token signature';
  if (Number(exp) < Math.floor(Date.now() / 1000)) return 'token expired';
  return null;
}

// A rejection is sent before the body is read, so close the connection rather
// than leave the rest of the upload in it.
function reject(res, status, reason) {
  res.set('Connection', 'close');
  return res.status(status).send(reason);
}

const app = express();

const ALLOW_HEADERS = 'Content-Type, X-Width, X-Height, X-Event-ID, X-View-Type, X-Flip-Y' +
                      (opts.auth ? ', Authorization' : '');

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ORIGINS) {
    // No browser sends a cross-origin POST without Origin, and a non-browser
    // caller can claim any origin anyway, so a request without one passes;
    // --auth is what keeps those out.
    res.vary('Origin');
    if (origin !== undefined && !ORIGINS.includes(origin)) {
      return reject(res, 403, 'Origin not allowed');
    }
  }
  // REve serves the viewer from whatever port THttpServer picked, so reflect the
  // caller's origin rather than pinning one.
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Headers', ALLOW_HEADERS);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Everything that can be decided from the headers is, before the body is read.
function checkHeaders(req, res, next) {
  if (opts.auth) {
    const reason = checkToken(req);
    if (reason) return reject(res, 401, reason);
  }
  const width = parseInt(req.headers['x-width']);
  const height = parseInt(req.headers['x-height']);
  if (!width || !height) {
    return reject(res, 400, 'Missing dimensions in headers');
  }
  const expected = width * height * 4;
  if (expected > MAX_BYTES) {
    return reject(res, 413, `${width}x${height} RGBA is ${expected} bytes, more than the ${MAX_MB} MiB limit`);
  }
  // Use raw body parser for binary buffers (e.g., from gl.readPixels), limited
  // to what the headers announce: a longer body is refused with 413 while it
  // is read, or at once when its Content-Length says so.
  express.raw({ type: 'application/octet-stream', limit: expected })(req, res, next);
}

app.post('/capture', checkHeaders, async (req, res) => {
  try {
    // Extract custom headers
    const width = parseInt(req.headers['x-width']);
    const height = parseInt(req.headers['x-height']);

    const eventId = sanitise(req.headers['x-event-id'], 'unknown_event');
    const viewType = sanitise(req.headers['x-view-type'], 'default_view');
    // WebGL reads bottom-left origin, so rows normally need flipping. Senders
    // that already flipped can say so with X-Flip-Y: 0.
    const flipY = req.headers['x-flip-y'] !== '0';

    const expected = width * height * 4;
    if (req.body.length !== expected) {
      return res.status(400)
        .send(`Buffer is ${req.body.length} bytes, expected ${expected} for ${width}x${height} RGBA`);
    }
    
    const filename = `event_${eventId}_${viewType}_${Date.now()}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);

    // Process raw buffer: 1. Set raw metadata, 2. Flip Y, 3. Save.
    // The buffer carries straight (un-premultiplied) alpha and no background,
    // so the PNG stays transparent and can be composited downstream.
    let pipeline = sharp(req.body, {
      raw: {
        width: width,
        height: height,
        channels: 4 // RGBA
      }
    });
    if (flipY) pipeline = pipeline.flip(); // corrects WebGL bottom-left origin
    await pipeline.png().toFile(filepath);

    console.log(`Saved: ${filename} (${width}x${height}, Event: ${eventId}, View: ${viewType})`);
    res.status(200).send({ status: 'success', file: filename });
    
  } catch (err) {
    console.error('Processing error:', err);
    res.status(500).send('Error processing image buffer');
  }
});

// Body parser errors (413 for a body over the limit) as a short reply, not
// the default HTML page with a stack trace.
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('Request error:', err);
  res.set('Connection', 'close');
  res.status(status).send(status === 413 ? 'Body larger than announced by X-Width and X-Height'
                                         : err.expose ? err.message : 'Request error');
});

if (!isLoopback(HOST) && !opts.auth) {
  console.warn(`image-gator: WARNING: listening on ${HOST} without --auth, the service accepts any caller on the network`);
}
if (opts.auth && !tls) {
  console.warn('image-gator: WARNING: --auth without TLS, the token and the image travel in the clear; ' +
               'put a TLS proxy in front or give --tls-key and --tls-cert');
}

const server = tls ? https.createServer(tls, app) : http.createServer(app);
server.on('error', err => fail(err.message));
server.listen(PORT, HOST, () => {
  const scheme = tls ? 'https' : 'http';
  const shown = net.isIPv6(HOST) ? `[${HOST}]` : HOST;
  console.log(`image-gator ${scheme}://${shown}:${server.address().port}/capture -> ${path.resolve(OUTPUT_DIR)}, ` +
              `max ${MAX_MB} MiB`);
  console.log(`image-gator auth ${opts.auth ? 'on' : 'off'}, TLS ${tls ? 'on' : 'off'}, ` +
              `origins ${ORIGINS ? ORIGINS.join(',') : 'any (reflected)'}`);
});

/*
async function sendEventCapture(eventId, viewType) {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const pixels = new Uint8Array(width * height * 4);
  
  // Synchronous read - okay at your 0.1Hz frequency
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  await fetch('http://localhost:3000/capture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Width': width.toString(),
      'X-Height': height.toString(),
      'X-Event-ID': eventId,
      'X-View-Type': viewType
      // with --auth also 'Authorization': 'Bearer ' + token
    },
    body: pixels
  });
}
*/
