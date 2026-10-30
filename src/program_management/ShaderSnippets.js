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

    // Declares isOrthographic(proj), true for an orthographic projection matrix proj, whose [3][3] is
    // 1, and false for a perspective one, whose [3][3] is 0. Tests no flag.
    projection_decl: `
bool isOrthographic(mat4 proj) {
    return proj[3][3] == 1.0;
}
`,

    // Declares lightAttenuation(d, k) for k = (constant, linear, quadratic), and pointLightFalloff()
    // and spotLightFalloff(), a light's attenuation at p, 0 beyond its range, times the cone of a spot
    // light; highp, as the square of a distance of 256 or more overflows a 16-bit mediump float. Tests
    // PLIGHTS and SLIGHTS.
    light_falloff_decl: `
#if (PLIGHTS || SLIGHTS)
    float lightAttenuation(highp float d, highp vec3 k) {
        return 1.0 / (k.x + k.y * d + k.z * (d * d));
    }
#fi
#if (PLIGHTS)
    float pointLightFalloff(highp vec3 lpos, float range, highp vec3 k, highp vec3 p) {
        highp float d = length(lpos - p);
        if (range > 0.0 && d > range) return 0.0;
        return lightAttenuation(d, k);
    }
#fi
#if (SLIGHTS)
    float spotLightFalloff(highp vec3 lpos, vec3 dir, float cosInner, float cosOuter, float range,
                           highp vec3 k, highp vec3 p) {
        highp float d = length(lpos - p);
        if (range > 0.0 && d > range) return 0.0;
        float theta = dot(normalize(lpos - p), normalize(-dir));
        if (theta <= cosOuter) return 0.0;
        return clamp((theta - cosOuter) / (cosInner - cosOuter), 0.0, 1.0) * lightAttenuation(d, k);
    }
#fi
`,

    // Declares lightSpecular(), Blinn or Phong, and dirLightDS(), pointLightDS() and spotLightDS(),
    // a light's diffuse and specular factors at p for the unit normal n and the unit direction v to
    // the eye. Includes light_falloff_decl. Tests DLIGHTS, PLIGHTS and SLIGHTS.
    light_shading_decl: `
#include light_falloff_decl
#if (DLIGHTS || PLIGHTS || SLIGHTS)
    float lightSpecular(vec3 n, vec3 l, vec3 v, float shininess, bool blinn) {
        if (blinn) return pow(max(dot(n, normalize(l + v)), 0.0), shininess);
        return pow(max(dot(v, reflect(-l, n)), 0.0), shininess);
    }
#fi
#if (DLIGHTS)
    vec2 dirLightDS(vec3 dir, vec3 n, vec3 v, float shininess, bool blinn) {
        vec3 l = normalize(-dir);
        return vec2(max(dot(n, l), 0.0), lightSpecular(n, l, v, shininess, blinn));
    }
#fi
#if (PLIGHTS)
    vec2 pointLightDS(highp vec3 lpos, float range, vec3 k, highp vec3 p,
                      vec3 n, vec3 v, float shininess, bool blinn) {
        float a = pointLightFalloff(lpos, range, k, p);
        if (a == 0.0) return vec2(0.0);
        vec3 l = normalize(lpos - p);
        return a * vec2(max(dot(n, l), 0.0), lightSpecular(n, l, v, shininess, blinn));
    }
#fi
#if (SLIGHTS)
    vec2 spotLightDS(highp vec3 lpos, vec3 dir, float cosInner, float cosOuter, float range, vec3 k,
                     highp vec3 p, vec3 n, vec3 v, float shininess, bool blinn) {
        float a = spotLightFalloff(lpos, dir, cosInner, cosOuter, range, k, p);
        if (a == 0.0) return vec2(0.0);
        vec3 l = normalize(lpos - p);
        return a * vec2(max(dot(n, l), 0.0), lightSpecular(n, l, v, shininess, blinn));
    }
#fi
`,

    // Adds to vec3 combined each light's colour times its diffuse factor times kd plus its specular
    // factor times ks, from the locals vec3 P, N, V (position, unit normal, unit direction to the
    // eye), kd, ks, float shin and bool blinn, and dLights, pLights and sLights. Needs
    // light_shading_decl. Tests DLIGHTS, PLIGHTS and SLIGHTS; uses ##NUM_DLIGHTS, ##NUM_PLIGHTS and
    // ##NUM_SLIGHTS.
    light_shading_stmt: `
#if (DLIGHTS)
    #for lightIdx in 0 to NUM_DLIGHTS
    {
        vec2 f = dirLightDS(dLights[##lightIdx].direction, N, V, shin, blinn);
        combined += dLights[##lightIdx].color * f.x * kd + dLights[##lightIdx].color * f.y * ks;
    }
    #end
#fi
#if (PLIGHTS)
    #for lightIdx in 0 to NUM_PLIGHTS
    {
        vec3 k = vec3(pLights[##lightIdx].constant, pLights[##lightIdx].linear,
                      pLights[##lightIdx].quadratic);
        vec2 f = pointLightDS(pLights[##lightIdx].position, pLights[##lightIdx].distance, k,
                              P, N, V, shin, blinn);
        combined += pLights[##lightIdx].color * f.x * kd + pLights[##lightIdx].color * f.y * ks;
    }
    #end
#fi
#if (SLIGHTS)
    #for lightIdx in 0 to NUM_SLIGHTS
    {
        vec3 k = vec3(sLights[##lightIdx].constant, sLights[##lightIdx].linear,
                      sLights[##lightIdx].quadratic);
        vec2 f = spotLightDS(sLights[##lightIdx].position, sLights[##lightIdx].direction,
                             sLights[##lightIdx].cutoff, sLights[##lightIdx].outerCutoff,
                             sLights[##lightIdx].distance, k, P, N, V, shin, blinn);
        combined += sLights[##lightIdx].color * f.x * kd + sLights[##lightIdx].color * f.y * ks;
    }
    #end
#fi
`,
});
