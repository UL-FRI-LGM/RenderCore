#version 300 es
precision mediump float;


//UIO
//**********************************************************************************************************************
uniform uint u_UINT_ID;

layout(location = 0) out uint objectID;


//MAIN
//**********************************************************************************************************************
void main() {
    #if (CIRCLES)
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float pct = dot(cxy, cxy);
        if (pct > 1.0) {
            discard; //performance trap
            //color = vec4(1.0, 1.0, 1.0, 0.0);
        }
    #fi


    objectID = u_UINT_ID;
}