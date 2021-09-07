#version 300 es
precision mediump float;


uniform vec3 cameraPosition; // World space // Camera position
uniform float unitSize;
uniform float orderOfMagnitude;
uniform vec3 LColor;
uniform vec3 UColor;

flat in float VDistanceCameraPlane;
flat in float fragVDiv;
flat in float fragVIDLU;
in vec3 fragVPos;  // World space
flat in vec3 fragVAnchorPoint; // World space // Anchor point is the camera position projected on a plane

out vec4 color;


void main() {
       


    float mixer = VDistanceCameraPlane/orderOfMagnitude - (fragVDiv - 1.0);



    if(mod(fragVDiv, 2.0) == 1.0){
        if(fragVIDLU == 0.0){
            color = vec4(LColor, 1.0 - mixer);
        }else if (fragVIDLU == 1.0){
            color = vec4(UColor, mixer);
        }else{
            color = vec4(1.0, 0.0, 0.0, 1.0);
        }
    }else{
        if(fragVIDLU == 0.0){
            color = vec4(LColor, mixer);
        }else if (fragVIDLU == 1.0){
            color = vec4(UColor, 1.0 - mixer);
        }else{
            color = vec4(1.0, 0.0, 0.0, 1.0);
        }
    }


    float distanceAnchorFrag = distance(fragVAnchorPoint, fragVPos);
    float distanceAnchorCamera = distance(fragVAnchorPoint, cameraPosition);
    //if(distanceAnchorFrag >= 128.0) color.a = (color.a * 128.0/(distanceAnchorFrag) * 128.0/(distanceAnchorFrag)); //fixed
    //if(distanceAnchorFrag >= distanceAnchorCamera) color.a = color.a * distanceAnchorCamera/distanceAnchorFrag; //adaptive (better)
    //if(distanceAnchorFrag >= distanceAnchorCamera) color.a = color.a * distanceAnchorCamera/distanceAnchorFrag * distanceAnchorCamera/distanceAnchorFrag; //adaptive (better)
    //if(distanceAnchorFrag >= distanceAnchorCamera) color.a = color.a * distanceAnchorCamera/distanceAnchorFrag * distanceAnchorCamera/distanceAnchorFrag * distanceAnchorCamera/distanceAnchorFrag; //adaptive (better)

    //if(distanceAnchorFrag - 16.0 >= distanceAnchorCamera) color.a = color.a * pow((distanceAnchorCamera)/(distanceAnchorFrag - 16.0), 2.0); //adaptive (better)
    if(distanceAnchorFrag - 16.0*unitSize >= distanceAnchorCamera) color.a = color.a * pow((distanceAnchorCamera)/(distanceAnchorFrag - 16.0*unitSize), 2.0); //adaptive (better), added uintSize
}