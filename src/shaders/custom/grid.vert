#version 300 es
precision mediump float;


struct GridPlane {
    vec3 normal; // Object space
    float constant; // Object space
};


uniform mat4 u_MMat;
uniform mat4 VMat;
uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform vec3 cameraPosition; // World space // Camera position
uniform GridPlane plane;
uniform float unitSize;
uniform float orderOfMagnitude;
uniform float lineBase;

in float VIDLU;
in vec3 VPos;       // Vertex position
//in vec3 VPosL;
//in vec3 VPosU;
in vec3 offset;

flat out float VDistanceCameraPlane;
flat out float fragVDiv;
flat out float fragVIDLU;
out vec3 fragVPos; // World space
flat out vec3 fragVAnchorPoint; // World space // Anchor point is the camera position projected on a plane


void main() {

    //float distanceCameraPlane = dot(plane.normal, (cameraPosition - plane.constant)); //need model mat
    //vec3 anchorPoint = cameraPosition - plane.normal*distanceCameraPlane; //need model mat
    vec4 planeNormal_worldspace = u_MMat * vec4(plane.normal, 0.0);
    vec4 planePosition_worldspace = u_MMat * vec4(plane.constant*plane.normal, 1.0);
    float distanceCameraPlane = dot(planeNormal_worldspace.xyz, (cameraPosition - planePosition_worldspace.xyz)); //OK?
    //float distanceCameraPlane = dot(planeNormal_worldspace.xyz, cameraPosition) + length(planePosition_worldspace.xyz); //OK
    vec3 anchorPoint = cameraPosition - planeNormal_worldspace.xyz*distanceCameraPlane;
    fragVAnchorPoint = anchorPoint; // World space



    VDistanceCameraPlane = abs(distanceCameraPlane);
    //float lineLength = 128.0 * max(1.0, VDistanceCameraPlane);
    VDistanceCameraPlane = sqrt(VDistanceCameraPlane);
    //VDistanceCameraPlane = log2(VDistanceCameraPlane);
    //VDistanceCameraPlane = log2(VDistanceCameraPlane*VDistanceCameraPlane);
    //VDistanceCameraPlane = pow(VDistanceCameraPlane, 0.33);


    
    float div = ceil(VDistanceCameraPlane / orderOfMagnitude);
    fragVDiv = div;

    fragVIDLU = VIDLU;


    float LSize = pow(orderOfMagnitude, div-1.0);
    float USize = LSize * orderOfMagnitude; // equals to: float USize = pow(orderOfMagnitude, div);
    //vec3 globalOffsetDelta = USize * round(anchorPoint/USize); // World space
    vec3 globalOffsetDelta = USize*unitSize * round((anchorPoint - planePosition_worldspace.xyz)/(USize*unitSize)); // World space
    float lineLength = USize*lineBase;


    vec3 VPos_aligned;
    /*if(VIDLU == 0.0){
        gl_Position = PMat * MVMat * vec4(VPos + offset, 1.0);
    }else if (VIDLU == 1.0){
        gl_Position = PMat * MVMat * vec4(VPos + offset*orderOfMagnitude, 1.0);
    }else{
        gl_Position = PMat * MVMat * vec4(VPos + offset, 1.0);
    }*/
    if(mod(div, 2.0) == 1.0){
        if(VIDLU == 0.0){
            VPos_aligned = VPos*lineLength + offset*unitSize*LSize;
        }else if (VIDLU == 1.0){
            VPos_aligned = VPos*lineLength + offset*unitSize*USize;
        }else{
            VPos_aligned = VPos;
        }
    }else{
        if(VIDLU == 0.0){
            VPos_aligned = VPos*lineLength + offset*unitSize*USize;
        }else if (VIDLU == 1.0){
            VPos_aligned = VPos*lineLength + offset*unitSize*LSize;
        }else{
            VPos_aligned = VPos;
        }
    }
    


    //fragVPos = VPos4.xyz; // Camera space
    //fragVPos = VPos_aligned;  //need model mat
    fragVPos = (u_MMat * vec4(VPos_aligned, 1.0)).xyz + globalOffsetDelta; // World space
    gl_Position = PMat * VMat * vec4(fragVPos, 1.0);
    

}