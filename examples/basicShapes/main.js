import * as RC from "../../src/RenderCore.js";


const canvas = new RC.Canvas(document.body);

const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
renderer.addShaderLoaderUrls("../../src/shaders");

const scene = new RC.Scene();
const camera = new RC.PerspectiveCamera(75, canvas.width/canvas.height, 0.125, 128);
camera.position.set(0, 2, 8);
camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));
camera.aspect = canvas.width/canvas.height;


const objects = new Array();

//mesh (point)
const pointGeometry = new RC.Geometry({vertices: new RC.Float32Attribute([0, 0, 0], 3)});
const point = new RC.Point(pointGeometry);
point.material.pointSize = 64.0;
objects.push(point);

//mesh (line)
const lineGeometry = new RC.Geometry({vertices: new RC.Float32Attribute([-1, -1, 0, 1, 1, 0], 3)});
const line = new RC.Line(lineGeometry);
objects.push(line);

//mesh (triangle)
const triangleGeometry = new RC.Geometry({vertices: new RC.Float32Attribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3)});
const triangle = new RC.Mesh(triangleGeometry);
triangle.material.side = RC.FRONT_AND_BACK_SIDE;
objects.push(triangle);

//circle
const circle = new RC.Circle();
circle.material.side = RC.FRONT_AND_BACK_SIDE;
objects.push(circle);

//quad
const quad = new RC.Quad({x: -1, y: 1}, {x: 1, y: -1});
quad.material.side = RC.FRONT_AND_BACK_SIDE;
objects.push(quad);

//cube
const cube = new RC.Cube(1.0, new RC.Color());
objects.push(cube);


//group all and add to a scene
const group = new RC.Group();
for(let o = 0; o < objects.length; o++){
    const phi = o/objects.length * 2*Math.PI;
    const x = 4*Math.cos(phi);
    const y = 4*Math.sin(phi);

    const object = objects[o];
    object.position.set(x, 0, y);
    group.add(object);
}
scene.add(group);


function resizeFunction() {
    canvas.updateSize();
    renderer.updateViewport(canvas.width, canvas.height);
    camera.aspect = canvas.width/canvas.height;
};

function renderFunction() {
    for(let o = 0; o < objects.length; o++){
        const object = objects[o];
        object.rotateY(-0.03);
    }
    group.rotateY(0.01);

    renderer.render(scene, camera);
    window.requestAnimationFrame(renderFunction);
}

window.onload = function() {
    window.addEventListener("resize", resizeFunction, false);
    window.requestAnimationFrame(renderFunction);
};
