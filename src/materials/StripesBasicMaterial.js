import { STRIPE_SPACE_SCREEN } from "../constants.js";
import { BufferAttribute, Float32Attribute } from "../core/BufferAttribute.js";
import { StripesGeometry } from "../objects/StripesGeometry.js";
import { Color } from "../math/Color.js";
import { StripeBasicMaterial } from "./StripeBasicMaterial.js";


export class StripesBasicMaterial extends StripeBasicMaterial {
    constructor(args = {}){
        //SUPER
        super();


        this.type = "StripesBasicMaterial";
        this.programName = "basic_stripes";


        //ASSEMBLE MATERIAL
        this.color = args.color ? args.color : new Color(Math.random() * 0xffffff);
        this.emissive = args.emissive ? args.emissive : new Color(Math.random() * 0xffffff);

        //this.setUniform("aspect", args.aspect ? args.aspect : window.innerWidth/window.innerHeight);
        //this.setUniform("viewport", args.viewport ? args.viewport : [window.innerWidth, window.innerHeight]);
        //this.setUniform("halfLineWidth", args.lineWidth? args.lineWidth/2.0 : 1.0/2.0);
        this.lineWidth = (args.lineWidth !== undefined) ? args.lineWidth : 1.0;
        this.mode = (args.mode !== undefined) ? args.mode : STRIPE_SPACE_SCREEN;
        this.prevVertex = (args.baseGeometry !== undefined) ? StripesBasicMaterial._setupPrevVertices(args.baseGeometry) : null;
        this.nextVertex = (args.baseGeometry !== undefined) ? StripesBasicMaterial._setupNextVertices(args.baseGeometry) : null;
        this.deltaOffset = (args.baseGeometry !== undefined) ? StripesBasicMaterial._setupDeltaDirections(args.baseGeometry) : null;
        this.depthBias = (args.depthBias !== undefined) ? args.depthBias : 0;
    }


    /// Constant bias towards the viewer, in NDC depth units, for a stripe that
    /// has to win against a surface it is drawn on -- an axis panel ruling a
    /// floor, most obviously. Negative values push away.
    ///
    /// Compiled in only when asked for: zero removes the flag, so a stripe that
    /// does not want it pays nothing and gets the same program it always had.
    /// See basic_stripes_template.vert for why polygon offset cannot do this.
    ///
    /// Beware it wins against EVERYTHING nearby, not only the surface it was
    /// meant for -- a track passing just behind a biased line will be drawn over
    /// by it. Hence off by default and set per material rather than globally.
    get depthBias() { return this._depthBias; }
    set depthBias(v) {
        v = v || 0;
        this._depthBias = v;

        if (v !== 0) {
            if (!this.hasSBFlag("DEPTH_BIAS")) {
                this.addSBFlag("DEPTH_BIAS");
                // The flag set changed, so the cached template no longer
                // describes this material -- drop it and let it be rebuilt.
                this.requiredProgramTemplate = null;
            }
            this.setUniform("depthBias", v);
        } else if (this.hasSBFlag("DEPTH_BIAS")) {
            this.rmSBFlag("DEPTH_BIAS");
            this.requiredProgramTemplate = null;
        }
    }

    get lineWidth() { return this._lineWidth; }
    set lineWidth(lineWidth) {
        this._lineWidth = lineWidth;
        this.setUniform("halfLineWidth", lineWidth/2.0);
    }
    get mode() { return this._mode; }
    set mode(mode) {
        this._mode = mode;
        this.setUniform("MODE", mode);
    }
    get prevVertex() { return this._prevVertex; }
    set prevVertex(prevVertex) {
        this._prevVertex = prevVertex;
        this.setAttribute("prevVertex", prevVertex);
    }
    get nextVertex() { return this._nextVertex; }
    set nextVertex(nextVertex) {
        this._nextVertex = nextVertex;
        this.setAttribute("nextVertex", nextVertex);
    }
    get deltaOffset() { return this._deltaOffset; }
    set deltaOffset(deltaOffset) {
        this._deltaOffset = deltaOffset;
        this.setAttribute("deltaOffset", deltaOffset);
    }


    // The three attributes a stripe needs, none of them built.
    //
    // One segment is one instance of a four-vertex quad, so:
    //
    //   prevVertex   the segment's start   per instance, a VIEW of the caller's
    //   nextVertex   the segment's end     positions at offsets 0 and 12, both
    //                                      with stride 24 -- no copy at all
    //   deltaOffset  which corner          per vertex, four values, ONE buffer
    //                                      shared by every stripe in existence
    //
    // The vertex's own position is not an attribute any more: the shader takes
    // it as `(deltaOffset.x < 0.0) ? prevVertex : nextVertex`, which is what it
    // always was.
    //
    // This replaces four arrays built per geometry -- expanded vertices, prev,
    // next and delta, each twice the base size and each first materialised as a
    // boxed `new Array` before being copied into a Float32Array. A track of a
    // thousand points built eight thousand vertices' worth of data to draw two
    // thousand. Now it builds none.

    static _setupPrevVertices(baseGeometry) {
        return StripesBasicMaterial._endpointView(baseGeometry, 0);
    }

    static _setupNextVertices(baseGeometry) {
        return StripesBasicMaterial._endpointView(baseGeometry, 12);
    }

    /// One end of every segment, as a strided view. byteOffset 0 is the start
    /// vertex of each pair, 12 the end.
    static _endpointView(baseGeometry, byteOffset) {
        const arr = StripesGeometry.orderedPositions(baseGeometry);
        const n = (arr.length / 6) | 0;   // segments

        return new BufferAttribute(arr, 3, 1, { stride: 24, offset: byteOffset, count: n });
    }

    /// The four corners of the quad, one buffer for every stripe in the
    /// process. It says start-or-end and which side, which depends on nothing
    /// at all -- not the positions, not even how many there are, now that the
    /// quad is per instance.
    ///
    /// Sharing it is the point: a scene can hold thousands of stripe objects,
    /// and eight floats each is not the cost -- allocating and freeing a buffer
    /// per object is, and one buffer that every draw touches stays in cache
    /// instead of walking thousands that do not.
    ///
    /// Sharing one attribute between viewers is only safe because a
    /// BufferAttribute is pure data: the GL buffer, the version last uploaded,
    /// the idle counter and the attrib locations all live in the per-context
    /// entry in GLAttributeManager, so each context uploads and ages its own.
    /// It was not always so -- see that class -- and when those lived on the
    /// attribute this static filled only in whichever viewer rendered first.
    static _setupDeltaDirections(baseGeometry) {
        if ( ! StripesBasicMaterial._delta)
            StripesBasicMaterial._delta =
                Float32Attribute([-1, +1,  -1, -1,  +1, +1,  +1, -1], 2);
        return StripesBasicMaterial._delta;
    }
}

StripesBasicMaterial._delta = null;
