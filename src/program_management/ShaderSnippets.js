/**
 * The GLSL snippets a shader template includes with `#include name`, see ShaderBuilder.
 *
 * A name ends in _decl for declarations, which go at global scope after the precision lines, or
 * in _stmt for statements, which go inside a function. _vert or _frag before that marks a snippet
 * that compiles in that stage only; the others compile in both. A snippet may test flags with
 * #if blocks and use ## values, which are evaluated with the flags and values of each build of
 * the including template. tools/shader-check compiles every snippet for each combination of the
 * flags it tests.
 *
 * ShaderBuilder.registerSnippet() adds snippets of the application's own.
 */
export const ShaderSnippets = Object.freeze({

    // Declares the given instance list that MeshRenderer._setup_instances() binds in the outline
    // pass, u_GivenInstances and a_Instances. Tests OUTLINE.
    outline_instances_vert_decl: `
#if (OUTLINE)
    uniform bool u_GivenInstances;
    in  int  a_Instances;
#fi
`,

    // Replaces the instance index iID by the element of the given list when u_GivenInstances.
    // Needs outline_instances_vert_decl and an int iID. Tests OUTLINE.
    outline_instances_vert_stmt: `
#if (OUTLINE)
    if (u_GivenInstances)
        iID = a_Instances;
#fi
`,

    // Declares the InstanceID output that the pick fragment stage reads. Tests PICK_MODE_UINT.
    pick_vert_decl: `
#if (PICK_MODE_UINT)
    flat out uint InstanceID;
#fi
`,

    // Writes iID to InstanceID. Needs pick_vert_decl and an int iID. Tests PICK_MODE_UINT.
    pick_vert_stmt: `
#if (PICK_MODE_UINT)
    InstanceID = uint(iID);
#fi
`,

    // Declares the pick pass inputs, u_UINT_ID, u_PickInstance and InstanceID, and its R32UI output
    // objectID. Tests PICK_MODE_UINT.
    pick_frag_decl: `
#if (PICK_MODE_UINT)
    uniform uint u_UINT_ID;
    uniform bool u_PickInstance;
    flat in uint InstanceID;
    layout(location = 0) out uint objectID;
#fi
`,

    // Writes InstanceID to objectID when u_PickInstance, else u_UINT_ID. Needs pick_frag_decl.
    // Tests PICK_MODE_UINT.
    pick_frag_stmt: `
#if (PICK_MODE_UINT)
    objectID = u_PickInstance ? InstanceID : u_UINT_ID;
#fi
`,

    // Declares the outline pass outputs of the vertex stage, v_normal_viewspace and
    // v_ViewDirection_viewspace. Tests OUTLINE.
    outline_vert_decl: `
#if (OUTLINE)
    out vec3 v_normal_viewspace;
    out vec3 v_ViewDirection_viewspace;
#fi
`,

    // Declares the outline pass outputs of the fragment stage, the normal vn_viewspace and the view
    // direction vd_viewspace. Tests OUTLINE.
    outline_frag_decl: `
#if (OUTLINE)
    layout (location = 0) out vec4 vn_viewspace;
    layout (location = 1) out vec4 vd_viewspace;
#fi
`,

    // Declares texelAtIndex(s, idx), the texel of element idx of a data texture filled row by row,
    // and fetchAtIndex(s, idx), its value, for sampler2D and isampler2D; highp, as data textures
    // hold 32-bit values. Tests no flag.
    texel_index_decl: `
highp ivec2 texelAtIndex(highp sampler2D s, highp int idx) {
    int tsx = textureSize(s, 0).x;
    return ivec2(idx % tsx, idx / tsx);
}
highp ivec2 texelAtIndex(highp isampler2D s, highp int idx) {
    int tsx = textureSize(s, 0).x;
    return ivec2(idx % tsx, idx / tsx);
}
highp vec4 fetchAtIndex(highp sampler2D s, highp int idx) {
    return texelFetch(s, texelAtIndex(s, idx), 0);
}
highp ivec4 fetchAtIndex(highp isampler2D s, highp int idx) {
    return texelFetch(s, texelAtIndex(s, idx), 0);
}
`,

    // Declares the clippingPlanes uniform and clippedByPlanes(p), true when p is on the positive
    // side of every plane. Tests CLIPPING_PLANES; uses ##NUM_CLIPPING_PLANES.
    clipping_decl: `
#if (CLIPPING_PLANES)
    struct ClippingPlane {
        vec3 normal;
        float constant;
    };

    uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];

    bool clippedByPlanes(vec3 p) {
        bool clipped = true;
        for(int i = 0; i < ##NUM_CLIPPING_PLANES; i++){
                clipped = ( dot( p, clippingPlanes[i].normal ) > clippingPlanes[i].constant ) && clipped;
        }
        return clipped;
    }
#fi
`,
});
