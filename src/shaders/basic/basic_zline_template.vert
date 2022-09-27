#version 300 es
precision mediump float;
precision highp sampler2D;
precision highp isampler2D;

//DEF
//-----------------------------------------------------------------------------

#define SPRITE_SPACE_WORLD 0.0
#define SPRITE_SPACE_SCREEN 1.0

// Always INSTANCED
struct Material {
    vec3 emissive;
    vec3 diffuse;
    sampler2D  instanceData0;
    isampler2D instanceData1;

    #if (TEXTURE)
        #for I_TEX in 0 to NUM_TEX
            sampler2D texture##I_TEX;
        #end
    #fi
};

//UIO
//-----------------------------------------------------------------------------
uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform vec2 viewport;
uniform float SpriteMode;
uniform vec2 SpriteSize;

uniform int  u_OffsetSegs;
// uniform int  u_OffsetLineInfo;    // line id to segment range
// uniform int  u_OffsetSegmentInfo; // segment to line id

in vec3 VPos;       // Vertex position

#if (COLORS)
    in vec4 VColor;
    out vec4 fragVColor;
#fi

#if (TEXTURE)
    in vec2 uv;
    out vec2 fragUV;
#fi

#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi

// Always INSTANCED
uniform Material material;
#if (PICK_MODE_UINT)
    flat out uint InstanceID;
#fi
#if (OUTLINE)
    uniform bool u_OutlineGivenInstances;
    in  int  a_OutlineInstances;
#fi

#if (OUTLINE)
    out vec3 v_normal_viewspace;
    out vec3 v_ViewDirection_viewspace;
#fi

//

int get_sid(int iid) {
    int   tsx = textureSize(material.instanceData1, 0).x;
    ivec2 tc  = ivec2(iid % tsx, iid / tsx);
    return texelFetch(material.instanceData1, tc, 0).r;

    // XXX missing two level lookup!
}

vec3 get_point(int sid) {
    int   tsx = textureSize(material.instanceData0, 0).x;
    ivec2 tc  = ivec2(sid % tsx, sid / tsx);
    return texelFetch(material.instanceData0, tc, 0).xyz;
}

//MAIN
//-----------------------------------------------------------------------------
void main()
{
    int iID = gl_InstanceID;
    #if (OUTLINE)
        if (u_OutlineGivenInstances)
            iID = a_OutlineInstances;
    #fi

    int sid = get_sid(iID);
    
    // sid = 1 + gl_InstanceID * 20;

    vec3 p1 = get_point(get_sid(iID))    ;// + vec3(1.0, 1.0, 0.0);
    vec3 p2 = get_point(get_sid(iID) + 1);// + vec3(1.0, 1.0, 0.0);

    //p1 = vec3(-14.0, -5.0, 1.0);
    //p2 = vec3(-10.0, 5.0, -1.0);

    // view-space
    vec3 p1_vs  = (MVMat * vec4(p1, 1.0)).xyz;
    vec3 p2_vs  = (MVMat * vec4(p2, 1.0)).xyz;
    vec3 p12_vs = p2_vs - p1_vs;
    // Rotate (x,y) of delta 90 deg to the right and normalize.
    // XXXX ??? degenerate case? line perpendicular to view ???
    // vec3 tgt = normalize( vec3(-p12_vs.y, p12_vs.x, 0.0) );
    vec3 tgt = ( vec3(-p12_vs.y, p12_vs.x, 0.0) );

    // Position of the line center in viewspace.
    vec3 p_vs = p1_vs + VPos.x * p12_vs;

    if(SpriteMode == SPRITE_SPACE_WORLD)
    {
        // Assume vertices in x,y plane, z = 0; close to (0, 0) as SpriteSize
        // will scale them (for centered sprite there should be a quad with x, y = +-0.5).

        gl_Position = PMat * vec4(p1_vs + VPos.x * p12_vs + VPos.y * tgt, 1.0);
    }
    else if(SpriteMode == SPRITE_SPACE_SCREEN)
    {
        vec4 VPos_clipspace = PMat * vec4(p_vs, 1.0);
        gl_Position = VPos_clipspace + vec4(VPos.xy * 2.0 * SpriteSize.xy / viewport * VPos_clipspace.w, 0.0, 0.0);
    }

    #if (COLORS)
        // Pass vertex color to fragment shader
        fragVColor = VColor;
    #fi

    #if (TEXTURE)
        // Pass uv coordinate to fragment shader
        fragUV = uv;
    #fi

    #if (CLIPPING_PLANES)
        vViewPosition = -p_vs;
    #fi

    #if (OUTLINE)
        v_normal_viewspace = vec3(0.0, 0.0, -1.0);

        float dToCam = length(p_vs);
        v_ViewDirection_viewspace = -p_vs / dToCam;
    #fi

    #if (PICK_MODE_UINT)
        InstanceID = uint(iID);
    #fi
 }
