# image-gator

A minimal receiver for images grabbed from a REve viewer, used to move event
displays from a control room (CMS P5) to a central computing centre for
publishing on the web.

This is a **reference implementation**, not the production collector: it exists
so the wire contract has something to test against, and so the ROOT side has
something to point a tutorial at. A real deployment is expected to implement the
same contract behind its own infrastructure.

## Running

    npm install          # express, sharp
    node image-gator.js

    GATOR_PORT=3000              # listen port
    GATOR_OUT=./captures         # output directory

## Wire contract

`POST /capture`, `Content-Type: application/octet-stream`.

Body is the raw framebuffer: `width * height * 4` bytes, **RGBA8, straight
(un-premultiplied) alpha**, with no background composited in — so the resulting
PNG is transparent and can be placed over any backdrop downstream.

| Header        | Meaning                                                        |
|---------------|----------------------------------------------------------------|
| `X-Width`     | pixels                                                          |
| `X-Height`    | pixels                                                          |
| `X-Event-ID`  | free-form tag recorded in the filename, e.g. run/lumi/event     |
| `X-View-Type` | which view produced it; REve sends the viewer name              |
| `X-Flip-Y`    | `1` (default) if rows are still in WebGL bottom-left order      |

The sender is `REveManager::GrabImages()` in ROOT (graf3d/eve7), which asks every
connected client to grab its viewers and POST here directly -- the image does not
pass back through ROOT. See the doxygen there for the triggering side.

CORS reflects the caller's origin, since REve serves the viewer on whatever port
THttpServer picked.

## Why plain HTTP to localhost

By design the receiver runs on the *same machine* as the REve client: either a
console machine at P5, or a tightly controlled CERN IT virtual machine which in
that case also runs the REve server. In both cases the capture never crosses a
network -- it is a loopback POST inside a controlled, physically or
administratively restricted environment -- so no transport security or
authentication is provided here, and none is needed for the CMS use cases this
was written for.

That assumption is the whole security argument. If a deployment ever points
`WebEve.ImageGatorUrl` at a host reachable over a network, this service is not
the right receiver: it accepts any origin and any body, with no authentication.
Anything off-box needs TLS and a token, and probably a size/rate limit too.
