import * as RC from "../../src/RenderCore.js";


const canvas = new RC.Canvas(document.body);

const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
renderer.addShaderLoaderUrls("../../src/shaders"); //change shaders

const scene = new RC.Scene();
const camera = new RC.PerspectiveCamera(75, canvas.width/canvas.height, 0.125, 128);

camera.position = new RC.Vector3(0, 0, 100);

const dLight = new RC.DirectionalLight(
    new RC.Color("#FFFFFF"),
    0.94,
    {
        castShadows: false
    }
);
dLight.rotateX(0.1);
scene.add(dLight);

const texture_cache = new RC.TextureCache;

let textWorld;
let textScreen;
let speed = 0.3;
const cube = new RC.Cube(10.0, new RC.Color().setColorName("grey"));
cube.material = new RC.MeshLambertMaterial();
cube.translateZ(-30);
cube.rotateX(1);
cube.rotateY(1);
scene.add(cube);

const fontDir = "../common/textures/fonts/";

function img2tex(image) { return RC.ZText.createDefaultTexture(image); }
function font_delay_handler(url_base) { console.log("Some font stuff was delayed for", url_base); }

let fn1 = "LiberationSerif-Regular"; // "monotype"; //"dejavu-serif-italic"

texture_cache.deliver_font(fontDir + fn1,
(texture, font_metrics, some_delayed) => {
    textScreen = new RC.ZText(
    {
        text: "Abc_123+Xyz-890\n2 Woorrld\n3\n4\n5\n6\n7\n8\n9\n10",
        fontTexture: texture,
        xPos: 0.01,
        yPos: 1.0,
        fontSize: 0.06,
        mode: RC.TEXT2D_SPACE_SCREEN,
        fontHinting: 0.0,
        color: new RC.Color(0.0, 0.0, 0.0),
        font: font_metrics
    });
    scene.add(textScreen);
},
img2tex, font_delay_handler);

let fn2 = "LiberationMono-Regular";

texture_cache.deliver_font(fontDir + fn2,
  (texture, font_metrics, some_delayed) => {
    textWorld = new RC.ZText(
    {
        text: "Woooorld Coordinates",
        fontTexture: texture,
        xPos: 0,
        yPos: 0,
        fontSize: 7,
        mode: RC.TEXT2D_SPACE_WORLD,
        fontHinting: 0.0,
        color: new RC.Color(0.0, 0.0, 0.0),
        font: font_metrics
    });
    textWorld.position = new RC.Vector3(-40, 4, 30);
    textWorld.rotateY(0.4);
    textWorld.frustumCulled = false;
    scene.add(textWorld);
  },
  img2tex, font_delay_handler);


function resizeFunction() {
    canvas.updateSize();
    renderer.updateViewport(canvas.width, canvas.height);
    camera.aspect = canvas.width / canvas.height;
    renderFunction();
};

let initialMouseX;
let initialMouseY;
let btnMouseDown = 0;

function mousedownFunction(event){
    console.log("butt down", event.which);
    if (!btnMouseDown)
    {
        initialMouseX = event.clientX;
        initialMouseY = event.clientY;
        btnMouseDown = event.which;
    }
    // event.preventDefault();
    // event.stopImmediatePropagation();
}

function mousemoveFunction(event) {
    if (!btnMouseDown)
        return;
    const x = event.clientX ;//* pixelRatio;
    const y = event.clientY ;//* pixelRatio;
    if (btnMouseDown == 1) {
        camera.translateX(0.1*(x - initialMouseX));
        camera.translateY(-0.1*(y - initialMouseY));
    }
    else if (btnMouseDown == 3)
    {
        camera.translateZ((y - initialMouseY)*0.1);
    }
    initialMouseX = x;
    initialMouseY = y;
    renderFunction();
}

function mouseupFunction(event) {
    if (btnMouseDown == event.which) {
        btnMouseDown = 0;
    }
}

function renderFunction() {
    renderer.render(scene, camera);
    if (!renderer.used)
        setTimeout(renderFunction, 200);
}

window.onload = function() {
    window.requestAnimationFrame(renderFunction);
    window.addEventListener("mousedown", mousedownFunction);
    window.addEventListener("mouseup", mouseupFunction);
    window.addEventListener("mousemove", mousemoveFunction);
    window.addEventListener("contextmenu", (event) => {
        event.preventDefault();});
    window.addEventListener("resize", resizeFunction);
    resizeFunction();
    renderFunction();
};
