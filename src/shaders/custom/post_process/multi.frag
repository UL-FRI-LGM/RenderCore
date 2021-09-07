#version 300 es
precision highp float;


uniform float near;
uniform float far;

in vec3 fragVPos;
in vec3 fragVNorm;
in vec3 vViewDirection;
in float fragVDistanceToCamera;

//out vec4 color[3];
layout (location = 0) out vec4 de;
layout (location = 1) out vec3 no;
layout (location = 2) out vec3 vd;
layout (location = 3) out vec4 dc;
layout (location = 4) out vec3 vp;


#if (CLIPPING_PLANES)
    struct ClippingPlane {
        vec3 normal;
        float constant;
    };

    uniform ClippingPlane clippingPlanes[##NUM_CLIPPING_PLANES];

    in vec3 vViewPosition;
#fi




// float linearizeDepth_1(float depth){
//     return (-depth - near) / (far - near); //linearizaiton [0-1]
// }
// float linearizeDepth_2(float depth) {
//     float z_NDC = depth * 2.0 - 1.0; // back to NDC 

//     return (2.0 * near * far) / (far + near - z_NDC * (far - near));	
// }

void main() {

    #if (CLIPPING_PLANES)
        bool clipped = true;
        for(int i = 0; i < ##NUM_CLIPPING_PLANES; i++){
                clipped = ( dot( vViewPosition, clippingPlanes[i].normal ) > clippingPlanes[i].constant ) && clipped;
        }
        if ( clipped ) discard;
    #fi


    #if (CIRCLES)
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float pct = dot(cxy, cxy);
        if (pct > 1.0) {
            discard; //performance trap
            //color = vec4(1.0, 1.0, 1.0, 0.0);
        }
    #fi





    float depth = gl_FragCoord.z;
    //depth = linearizeDepth_1(fragVPos.z);
    //depth = linearizeDepth_2(gl_FragCoord.z) / far;


    //color[0] = vec4(vec3(depth), 1.0);
    de = vec4(depth, 0.0, 0.0, 1.0);
    //color[1] = vec4(fragVNorm, 1.0);
    //no = normalize(fragVNorm) * 0.5 + 0.5;
    no = fragVNorm;
    //color[2] = vec4(normalize(vViewDirection), 1.0);
    //vd = normalize(vViewDirection) * 0.5 + 0.5;
    vd = vViewDirection;
    dc = vec4(fragVDistanceToCamera, 0.0, 0.0, 1.0);
    vp = fragVPos;
}