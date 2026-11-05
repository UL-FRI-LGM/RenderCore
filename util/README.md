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
    node image-gator.js [options]

    --host H          GATOR_HOST=127.0.0.1    listen address
    --port P          GATOR_PORT=3000         listen port
    --out DIR         GATOR_OUT=./captures    output directory
    --max-mb N        GATOR_MAX_MB=64         largest accepted body, in MiB
    --origins a,b,c   GATOR_ORIGINS           CORS allowlist; without it the origin is reflected
    --auth                                    require a signed token, see "Off-box"
    --tls-key FILE                            serve HTTPS, needs --tls-cert too
    --tls-cert FILE

A flag takes precedence over its environment variable. The startup lines print
the effective configuration.

On a machine with a system libvips, `sharp` tries to build itself against it and
fails without `node-addon-api`. `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install` takes
the prebuilt binary instead.

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

`X-Event-ID` and `X-View-Type` are sanitised before they go into the filename
`event_<event>_<view>_<ms>.png`: every character outside `[A-Za-z0-9_-]` becomes
`_`, and each is cut to 64 characters. A missing header gives `unknown_event` or
`default_view`.

A body longer than `width * height * 4` is refused with 413. The refusal comes
before the body is read when the `Content-Length` says so, otherwise as soon as
the excess arrives. An image whose `width * height * 4` from the headers is over
`--max-mb` is refused with 413 from the headers alone. A shorter body is refused
with 400.

The sender is `REveManager::GrabImages()` in ROOT (graf3d/eve7), which asks every
connected client to grab its viewers and POST here directly -- the image does not
pass back through ROOT. See the doxygen there for the triggering side.

CORS reflects the caller's origin, since REve serves the viewer on whatever port
THttpServer picked. With `--origins` only the listed origins get the CORS
headers, and a request from any other origin is refused with 403. A request
without an `Origin` header is not checked against the list, since no browser
sends a cross-origin POST without one.

## Why plain HTTP to localhost

By design the receiver runs on the *same machine* as the REve client: either a
console machine at P5, or a tightly controlled CERN IT virtual machine which in
that case also runs the REve server. In both cases the capture never crosses a
network -- it is a loopback POST inside a controlled, physically or
administratively restricted environment -- so no transport security or
authentication is provided here, and none is needed for the CMS use cases this
was written for.

That assumption is the whole security argument, and the defaults follow it: the
service listens on 127.0.0.1 only and checks no caller. A deployment that points
`WebEve.ImageGatorUrl` at a host reachable over a network needs the options of
the next section.

## Off-box

Off-box the service needs three things: a listen address other than loopback,
a token on every capture, and TLS.

`--host` sets the listen address, for example `--host 0.0.0.0`. The service
warns at startup when it listens on a non-loopback address without `--auth`.

`--auth` makes `POST /capture` require a token. The secret is read from the
environment variable `GATOR_SECRET`, as UTF-8, and the service refuses to start
without it. The secret is never accepted on the command line, because a command
line is visible to every user of the machine.

The token is part of the wire contract when `--auth` is on:

    Authorization: Bearer <exp>.<sig>

    exp  = base64url(expiry as decimal Unix time in seconds, the ASCII digits)
    sig  = base64url(HMAC-SHA256(secret, event_id + "|" + view_type + "|" + expiry))

Both parts are base64url without padding. `event_id` and `view_type` are the raw
values of the `X-Event-ID` and `X-View-Type` headers, before sanitising, and a
missing header counts as the empty string. `expiry` is the same decimal string
that `exp` encodes. The HMAC is taken over the UTF-8 bytes. The service
recomputes the HMAC from the request headers and the decoded expiry and compares
it in constant time. It answers 401 with a short reason when the token is
missing, malformed, wrongly signed or expired. Nothing is stored.

The sender side is to come. `REveManager::GrabImages()` in ROOT will mint the
token from a secret in `WebEve.ImageGatorSecret`, and the client will forward it
as the `Authorization` header. Until then `--auth` can only be exercised with a
token made by hand, for example:

    node -e 'const c = require("crypto"), [ev, view] = process.argv.slice(1);
      const exp = String(Math.floor(Date.now() / 1000) + 60);
      const sig = c.createHmac("sha256", process.env.GATOR_SECRET)
                   .update(`${ev}|${view}|${exp}`).digest("base64url");
      console.log(Buffer.from(exp).toString("base64url") + "." + sig)' run1_ev3 3D

The token covers the event id, the view type and the expiry, but not the body,
and the service keeps no record of the tokens it has seen. Whoever reads a token
before it expires can replay it with any image. Each replay writes one more file
under the same event id and view type, next to the genuine one, since the
filename carries the arrival time. A short expiry keeps that window small, and
TLS keeps the token from being read on the way.

With `--auth` the CORS preflight also allows the `Authorization` header, so the
browser can send the token to the service on another origin. `--origins`
narrows which pages may do so.

`--tls-key` and `--tls-cert` make the service serve HTTPS with that key and
certificate. The alternative is a reverse proxy that terminates TLS in front of
a service listening on loopback. The service warns at startup when `--auth` is
on without TLS of its own; behind such a proxy the warning can be ignored.

The rule is TLS on both legs. The REve websocket, from the browser to the ROOT
server, runs behind a TLS proxy, which is how CMS runs it. The POST from the
browser to this service goes over HTTPS. A page loaded over HTTPS cannot POST to
a plain `http://` service on another host anyway, since the browser blocks mixed
content; only `localhost` and `127.0.0.1` are exempt.

There is no rate limit.
