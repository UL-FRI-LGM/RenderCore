const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.GATOR_PORT || 3000;
const OUTPUT_DIR = process.env.GATOR_OUT || './captures';

// Ensure capture directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// Use raw body parser for binary buffers (e.g., from gl.readPixels)
app.use(express.raw({ 
  type: 'application/octet-stream', 
  limit: '50mb' // 1080p RGBA is ~8MB; 4K is ~33MB
}));

app.use((req, res, next) => {
  // REve serves the viewer from whatever port THttpServer picked, so reflect the
  // caller's origin rather than pinning one.
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Headers',
             'Content-Type, X-Width, X-Height, X-Event-ID, X-View-Type, X-Flip-Y');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.post('/capture', async (req, res) => {
  try {
    // Extract custom headers
    const width = parseInt(req.headers['x-width']);
    const height = parseInt(req.headers['x-height']);
    if (!width || !height) {
      return res.status(400).send('Missing dimensions in headers');
    }

    const eventId = req.headers['x-event-id'] || 'unknown_event';
    const viewType = req.headers['x-view-type'] || 'default_view';
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

app.listen(PORT, () => {
  console.log(`CMS P5 Capture Service running at http://localhost:${PORT}`);
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
    },
    body: pixels
  });
}
*/