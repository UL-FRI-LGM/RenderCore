#version 300 es
precision mediump float;
precision highp int;


uniform mat4 MVMat; // Model View Matrix
uniform mat4 PMat;  // Projection Matrix
uniform float aspect;
uniform vec3 cameraPosition;
uniform float lineWidth;


in vec3 VPos;       // Vertex position
in vec3 prevPosition;
in vec3 nextPosition;
in float normalDirection;


void main() {
    //gl_Position = PMat * MVMat * vec4(VPos, 1.0);


    mat4 MVP = PMat * MVMat;
    //mat4 MVP = modelViewMatrix;

    vec4 currentProjected = MVP * vec4(VPos, 1.0);
    vec4 prevProjected = MVP * vec4(prevPosition, 1.0);
    vec4 nextProjected = MVP * vec4(nextPosition, 1.0);

    vec2 currentNDC = currentProjected.xy / currentProjected.w; //z coordinate is "lost" on projection
    vec2 prevNDC = prevProjected.xy / prevProjected.w;
    vec2 nextNDC = nextProjected.xy / nextProjected.w;

    currentNDC.x = currentNDC.x * aspect;
    prevNDC.x = prevNDC.x * aspect;
    nextNDC.x = nextNDC.x * aspect;


    vec2 direction;
    if(VPos == prevPosition){ //start vertex
        //direction = normalize(nextNDC - currentNDC);
        direction = nextNDC - currentNDC;
    }else if(VPos == nextPosition){ //end vertex
        //direction = normalize(currentNDC - prevNDC);
        direction = currentNDC - prevNDC;
    }else{ //middle
        //direction = normalize(nextNDC - currentNDC);
        //direction = normalize(currentNDC - prevNDC);
        //direction = normalize(nextNDC - prevNDC); //skor povprecje
        //direction = normalize(normalize(nextNDC - currentNDC) - normalize(currentNDC - prevNDC));

        //direction = normalize(((nextNDC - currentNDC) + (currentNDC - prevNDC))/2.0);
        //direction = normalize(((nextNDC - currentNDC) + (currentNDC - prevNDC)));

        direction = nextNDC - prevNDC;
    }

    vec2 normal = normalize(vec2(-direction.y, direction.x));
    //normal = normal * lineWidth/2.0*32.0; //fixed size in world space
    normal = normal * lineWidth/2.0 * (distance(VPos, cameraPosition)/128.0); // fixed size in screen space
    normal.x = normal.x / aspect;

    vec4 delta = vec4(normal * normalDirection, 0.0, 0.0);


    gl_Position = currentProjected + delta;
}