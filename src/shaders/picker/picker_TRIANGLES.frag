#version 300 es
precision mediump float;


//UIO
//**********************************************************************************************************************
uniform uint u_UINT_ID;

layout(location = 0) out uint objectID;
uniform bool u_PickInstance;
flat in uint InstanceID;


//MAIN
//**********************************************************************************************************************
void main() {
    if (u_PickInstance)
        objectID = InstanceID;
    else
        objectID = u_UINT_ID;
}