#version 300 es
precision mediump float;


uniform uint pickingID;

layout(location = 0) out uint objID;


void main() {
    objID = pickingID;
}
