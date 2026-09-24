import { BufferAttribute, Uint32Attribute } from '../core/BufferAttribute.js';
import { Geometry } from './Geometry.js';


/// Geometry for a set of line segments drawn as screen-space quads.
///
/// One segment is one INSTANCE of a four-vertex quad, so this holds four
/// vertices' worth of indices and nothing else that scales with the data. The
/// positions themselves are handed to the material as two views of the caller's
/// own buffer -- see StripesBasicMaterial.
///
/// It used to expand everything: each base vertex became two, and the positions
/// were then copied again into prev and next attributes, so a segment's two
/// endpoints were stored eight times between them. For a track of a thousand
/// points that is four arrays built and thrown away per geometry.
///
/// `vertices` is kept pointing at the base positions. Nothing binds it -- the
/// shaders take the position from prevVertex and nextVertex now -- but the
/// bounding box is computed from it, and it costs nothing to leave correct.
///
/// That holds only while EVERY program drawing this geometry derives VPos
/// rather than declaring it: basic_stripes_template.vert, GBuffer_stripes.vert
/// and GBufferMini_stripes.vert. MeshRenderer binds `vertices` to VPos for any
/// program that does declare it, and under instancing it would then read the
/// first four positions for every segment -- which is silent, and looks like a
/// misplaced outline rather than a wrong attribute.
export class StripesGeometry extends Geometry {
	constructor(args = {}) {
		super();

		this.type = "StripesGeometry";

		const base = args.baseGeometry;
		const ordered = StripesGeometry.orderedPositions(base);

		// For the bounding box, not for drawing.
		this.vertices = new BufferAttribute(ordered, 3);
		this.indices = StripesGeometry.quadIndices();

		/// Segments, which is how many instances get drawn.
		this.segmentCount = (ordered.length / 6) | 0;
	}

	/// The base positions as a flat array in segment order, two vertices per
	/// segment. Returned as-is when the base is already in that order, which is
	/// the common case and the whole point -- no copy at all.
	static orderedPositions(baseGeometry) {
		const verts = baseGeometry.vertices.array;

		if ( ! baseGeometry.indices)
			return verts;

		// Indexed: the positions are not in segment order, so striding over them
		// would read the wrong pairs. Compact them once.
		//
		// Memoised on the base geometry because three callers ask for it -- this
		// class for the bounding box, and the material once for each endpoint --
		// and without it an indexed base is compacted three times into three
		// arrays holding the same numbers. They must also BE one array, or the
		// two endpoint views stop being views of the same buffer, which is the
		// whole point.
		if (baseGeometry._stripeOrderedPositions)
			return baseGeometry._stripeOrderedPositions;

		const idx = baseGeometry.indices.array;
		const out = new Float32Array(idx.length * 3);
		for (let i = 0; i < idx.length; ++i) {
			const s = idx[i] * 3, d = i * 3;
			out[d] = verts[s]; out[d + 1] = verts[s + 1]; out[d + 2] = verts[s + 2];
		}

		baseGeometry._stripeOrderedPositions = out;
		return out;
	}

	/// Two triangles over the four corners of one segment. The same six indices
	/// for every stripe object there will ever be.
	/// Two triangles over the four corners of one segment -- the same six
	/// values for every stripe object there will ever be, so one buffer serves
	/// the whole process. A scene can hold thousands of stripes; the twenty-four
	/// bytes are not what they cost, allocating and freeing a buffer each is,
	/// and one index buffer that every draw touches stays in cache.
	///
	/// Safe to share between viewers only because a BufferAttribute is pure
	/// data: the GL buffer, the uploaded version, the idle counter and the
	/// attrib locations all live in the per-context entry in
	/// GLAttributeManager. When they lived on the attribute this static was
	/// uploaded into whichever context rendered first and every other view drew
	/// every index as 0, which is to say drew nothing.
	static quadIndices() {
		if ( ! StripesGeometry._quadIdx)
			StripesGeometry._quadIdx = Uint32Attribute([0, 1, 2, 3, 2, 1], 1);
		return StripesGeometry._quadIdx;
	}
}

StripesGeometry._quadIdx = null;
