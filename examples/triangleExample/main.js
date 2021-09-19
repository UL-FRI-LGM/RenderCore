import * as RC from "../../src/RenderCore.js";


const canvas = new RC.Canvas(document.body);

const renderer = new RC.MeshRenderer(canvas.canvasDOM, RC.WEBGL2);
renderer.addShaderLoaderUrls("../../src/shaders");

const scene = new RC.Scene();
const camera = new RC.OrthographicCamera(-1, 1, 1, -1, 0, 10);

const geometry = new RC.Geometry({vertices: new RC.Float32Attribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3)});
const material = new RC.MeshBasicMaterial();
const object = new RC.Mesh(geometry, material);
scene.add(object);


function resizeFunction() {
    canvas.updateSize();
    renderer.updateViewport(canvas.width, canvas.height);
};

function renderFunction() {
    renderer.render(scene, camera);
    window.requestAnimationFrame(renderFunction);
}

window.onload = function() {
    window.addEventListener("resize", resizeFunction, false);
    window.requestAnimationFrame(renderFunction);
};
