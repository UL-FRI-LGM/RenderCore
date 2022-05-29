import * as RC from "../../src/RenderCore.js";


const canvas = new RC.Canvas(document.body);

const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
renderer.addShaderLoaderUrls("../../src/shaders");

const scene = new RC.Scene();
const camera = new RC.PerspectiveCamera(75, canvas.width/canvas.height, 0.125, 128);
camera.position.set(0, 2, 16);
camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));

const pLight = new RC.PointLight(new RC.Color("#FDB813"), 1.0, 0.0, 1/64);
scene.add(pLight);

const cluster = prepaireCluster(8);
const spriteObject = cluster.object;
const spriteInstances = cluster.instances;
const spritePositions = cluster.positions;
const spriteTranslations = cluster.translations;
scene.add(spriteObject);


function prepaireCluster(mult = 4, step = 1.0){

    const spriteInstances = new Array();
    const spritePositions = new Array();
    const spriteTranslations = new Array();

    for(let i = -step*mult; i <= step*mult; i+=step){
        for(let j = -step*mult; j <= step*mult; j+=step){
            for(let k = -step*mult; k <= step*mult; k+=step){
                
                const spriteInstance = new RC.Mesh();
                spriteInstance.scale.setScalar(0.25 * step);
                spriteInstance.position.set(i, j, k);
                spriteInstance.translate(new RC.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5));
    
    
                spriteInstance.updateMatrix();
                spriteInstances.push(spriteInstance);
                spritePositions.push(new RC.Vector3().copy(spriteInstance.position));
                spriteTranslations.push(new RC.Vector4().copy(spriteInstance.position));
            }
        }
    }
    
    const spriteBaseGeometry = new RC.Geometry();
    spriteBaseGeometry.vertices = new RC.Float32Attribute([0, 0, 0], 3);
    spriteBaseGeometry.normals = new RC.Float32Attribute([0, 0, 1], 3);

    const spriteGeometry = new RC.SpriteGeometry({baseGeometry: spriteBaseGeometry});
    spriteGeometry.vertices.divisor = 0;
    spriteGeometry.normals.divisor = 0;
    

    spriteGeometry.translation = new RC.Float32Attribute(spriteTranslations.reduce((acc, x) => {acc.push(...x.toArray()); return acc;}, new Array()), 4);
    spriteGeometry.translation.divisor = 1;
    spriteGeometry.translation.drawType = RC.BufferAttribute.DRAW_TYPE.DYNAMIC;
    
    
    const spriteMaterial = new RC.SpriteBasicMaterial({baseGeometry: spriteBaseGeometry, color: new RC.Color(Math.random(), Math.random(), Math.random()), spriteSize: [8, 8], drawCircles: true});
    spriteMaterial.emissive.set(0.0, 0.0, 0.0);
    
    
    const spriteObject = new RC.Sprite({geometry: spriteGeometry, material: spriteMaterial});
    spriteObject.position.set(0.0, 0.0, 0.0);
    spriteObject.scale.set(0.1, 0.1, 0.1);
    spriteObject.instancedTranslation = true;
    spriteObject.instanceCount = spriteInstances.length;

    return {object: spriteObject, instances: spriteInstances, positions: spritePositions, translations: spriteTranslations};
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


    for(let i = 0; i < spriteInstances.length; i++){
        const pos = spritePositions[i];
        const offset = wave(pos, now, 3.0);

        spriteTranslations[i].add(offset);
    }


    spriteTranslations.reduce((acc, x) => {spriteObject.geometry.translation.array.set(x.toArray(), acc); return acc+=4;}, 0);
    spriteObject.geometry.translation.update();


    renderer.render(scene, camera);
    window.requestAnimationFrame(renderFunction);
}

window.onload = function() {
    window.addEventListener("resize", resizeFunction, false);
    window.requestAnimationFrame(renderFunction);
};
