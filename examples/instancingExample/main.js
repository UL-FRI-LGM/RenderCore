import * as RC from "../../src/RenderCore.js";


const canvas = new RC.Canvas(document.body);

const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
renderer.addShaderLoaderUrls("../../src/shaders");

const scene = new RC.Scene();
const camera = new RC.PerspectiveCamera(75, canvas.width/canvas.height, 0.125, 128);
camera.position.set(0, 2, 16);
camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));

const pLight = new RC.PointLight(new RC.Color("#FDB813"), 1.0);
scene.add(pLight);

const cluster = prepareCluster(8);
const cubeObject = cluster.object;
const cubeInstances = cluster.instances;
const cubePositions = cluster.positions;
scene.add(cubeObject);


function prepareCluster(mult = 4, step = 1.0){
    //cube
    //NON-INDEXED: 6 sides, 2 tris per side, 3 vertices per tri, 3 components(x, y, z) per vertex
    const cubeVertices = new Float32Array(6 * 2 * 3 * 3);
    cubeVertices[0  ] = -1; cubeVertices[1  ] = -1; cubeVertices[2  ] = +1; //vertex 0 //front
    cubeVertices[3  ] = +1; cubeVertices[4  ] = -1; cubeVertices[5  ] = +1; //vertex 1
    cubeVertices[6  ] = -1; cubeVertices[7  ] = +1; cubeVertices[8  ] = +1; //vertex 2

    cubeVertices[9  ] = -1; cubeVertices[10 ] = +1; cubeVertices[11 ] = +1; //vertex 2
    cubeVertices[12 ] = +1; cubeVertices[13 ] = -1; cubeVertices[14 ] = +1; //vertex 1
    cubeVertices[15 ] = +1; cubeVertices[16 ] = +1; cubeVertices[17 ] = +1; //vertex 3


    cubeVertices[18 ] = +1; cubeVertices[19 ] = -1; cubeVertices[20 ] = +1; //vertex 1 //right
    cubeVertices[21 ] = +1; cubeVertices[22 ] = -1; cubeVertices[23 ] = -1; //vertex 5
    cubeVertices[24 ] = +1; cubeVertices[25 ] = +1; cubeVertices[26 ] = +1; //vertex 3

    cubeVertices[27 ] = +1; cubeVertices[28 ] = +1; cubeVertices[29 ] = +1; //vertex 3
    cubeVertices[30 ] = +1; cubeVertices[31 ] = -1; cubeVertices[32 ] = -1; //vertex 5
    cubeVertices[33 ] = +1; cubeVertices[34 ] = +1; cubeVertices[35 ] = -1; //vertex 7


    cubeVertices[36 ] = +1; cubeVertices[37 ] = -1; cubeVertices[38 ] = -1; //vertex 5 //back
    cubeVertices[39 ] = -1; cubeVertices[40 ] = -1; cubeVertices[41 ] = -1; //vertex 4
    cubeVertices[42 ] = +1; cubeVertices[43 ] = +1; cubeVertices[44 ] = -1; //vertex 7

    cubeVertices[45 ] = +1; cubeVertices[46 ] = +1; cubeVertices[47 ] = -1; //vertex 7
    cubeVertices[48 ] = -1; cubeVertices[49 ] = -1; cubeVertices[50 ] = -1; //vertex 4
    cubeVertices[51 ] = -1; cubeVertices[52 ] = +1; cubeVertices[53 ] = -1; //vertex 6


    cubeVertices[54 ] = -1; cubeVertices[55 ] = -1; cubeVertices[56 ] = -1; //vertex 4 //left
    cubeVertices[57 ] = -1; cubeVertices[58 ] = -1; cubeVertices[59 ] = +1; //vertex 0
    cubeVertices[60 ] = -1; cubeVertices[61 ] = +1; cubeVertices[62 ] = -1; //vertex 6

    cubeVertices[63 ] = -1; cubeVertices[64 ] = +1; cubeVertices[65 ] = -1; //vertex 6
    cubeVertices[66 ] = -1; cubeVertices[67 ] = -1; cubeVertices[68 ] = +1; //vertex 0
    cubeVertices[69 ] = -1; cubeVertices[70 ] = +1; cubeVertices[71 ] = +1; //vertex 2


    cubeVertices[72 ] = -1; cubeVertices[73 ] = +1; cubeVertices[74 ] = +1; //vertex 2 //up
    cubeVertices[75 ] = +1; cubeVertices[76 ] = +1; cubeVertices[77 ] = +1; //vertex 3
    cubeVertices[78 ] = -1; cubeVertices[79 ] = +1; cubeVertices[80 ] = -1; //vertex 6

    cubeVertices[81 ] = -1; cubeVertices[82 ] = +1; cubeVertices[83 ] = -1; //vertex 6
    cubeVertices[84 ] = +1; cubeVertices[85 ] = +1; cubeVertices[86 ] = +1; //vertex 3
    cubeVertices[87 ] = +1; cubeVertices[88 ] = +1; cubeVertices[89 ] = -1; //vertex 7


    cubeVertices[90 ] = -1; cubeVertices[91 ] = -1; cubeVertices[92 ] = -1; //vertex 4 //down
    cubeVertices[93 ] = +1; cubeVertices[94 ] = -1; cubeVertices[95 ] = -1; //vertex 5
    cubeVertices[96 ] = -1; cubeVertices[97 ] = -1; cubeVertices[98 ] = +1; //vertex 0

    cubeVertices[99 ] = -1; cubeVertices[100] = -1; cubeVertices[101] = +1; //vertex 0
    cubeVertices[102] = +1; cubeVertices[103] = -1; cubeVertices[104] = -1; //vertex 5
    cubeVertices[105] = +1; cubeVertices[106] = -1; cubeVertices[107] = +1; //vertex 1

    
    const cubeInstances = new Array();
    const cubePositions = new Array();

    for(let i = -step*mult; i <= step*mult; i+=step){
        for(let j = -step*mult; j <= step*mult; j+=step){
            for(let k = -step*mult; k <= step*mult; k+=step){
                
                const cubeInstance = new RC.Mesh();
                cubeInstance.scale.setScalar(0.25 * step);
                cubeInstance.position.set(i, j, k);
                cubeInstance.translate(new RC.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5));
    
    
                cubeInstance.updateMatrix();
                cubeInstances.push(cubeInstance);
                cubePositions.push(new RC.Vector3().copy(cubeInstance.position));
            }
        }
    }
    
    
    const cubeGeometry = new RC.Geometry();
    cubeGeometry.vertices = new RC.Float32Attribute(cubeVertices, 3);
    cubeGeometry.vertices.divisor = 0;
    cubeGeometry.computeVertexNormals();
    cubeGeometry.normals.divisor = 0;
    
    
    cubeGeometry.MMat = new RC.Float32Attribute(cubeInstances.reduce((acc, x) => {acc.push(...x.matrix.elements); return acc;}, new Array()), 16);
    cubeGeometry.MMat.divisor = 1;
    cubeGeometry.MMat.drawType = RC.BufferAttribute.DRAW_TYPE.DYNAMIC;
    
    
    const cubeMaterial = new RC.MeshBasicMaterial();
    cubeMaterial.emissive.set(0.0, 0.0, 0.0);
    
    
    const cubeObject = new RC.Mesh(cubeGeometry, cubeMaterial);
    cubeObject.position.set(0.0, 0.0, 0.0);
    cubeObject.scale.set(0.1, 0.1, 0.1);
    cubeObject.instanced = true;
    cubeObject.instanceCount = cubeInstances.length;

    return {object: cubeObject, instances: cubeInstances, positions: cubePositions};
}

const wvec = new RC.Vector3();
function wave(pos, time, amp = 3.0, omega = 1.0, c = 1.0){
    const r = Math.max(Math.sqrt(pos.x*pos.x + pos.y*pos.y + pos.z*pos.z), 0.001);
    const phi = Math.atan2(pos.y, pos.x);
    const theta = Math.acos(pos.z/r);

    const k = omega/c;
    const w = amp*Math.sin(k*r - omega*time) / (r*r);

    const x = r*Math.cos(phi)*Math.sin(theta) * w;
    const y = r*Math.sin(phi)*Math.sin(theta) * w;
    const z = r*Math.cos(theta) * w;

    wvec.set(x, y, z);

    return wvec;
}

function resizeFunction() {
    canvas.updateSize();
    renderer.updateViewport(canvas.width, canvas.height);
};

let then = 0;
function renderFunction(now) {
    now *= 0.001; // seconds
    const delta = now - then;
    then = now;


    for(let i = 0; i < cubeInstances.length; i++){
        const pos = cubePositions[i];
        const offset = wave(pos, now, 3.0);

        cubeInstances[i].translate(offset);
        cubeInstances[i].rotateY(delta * 8.0*(Math.random() - 0.5));
  
        cubeInstances[i].updateMatrix();
    }


    cubeInstances.reduce((acc, x) => {cubeObject.geometry.MMat.array.set(x.matrix.elements, acc); return acc+=16;}, 0);
    cubeObject.geometry.MMat.update();


    renderer.render(scene, camera);
    window.requestAnimationFrame(renderFunction);
}

window.onload = function() {
    window.addEventListener("resize", resizeFunction, false);
    window.requestAnimationFrame(renderFunction);
};
