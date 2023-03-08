import * as RC from "../../src/RenderCore.js";


const canvas = new RC.Canvas(document.body);

const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
renderer.addShaderLoaderUrls("../../src/shaders");

const scene = new RC.Scene();
const camera = new RC.PerspectiveCamera(75, canvas.width/canvas.height, 0.125, 128);
camera.position = new RC.Vector3(0, 0, 8);

const dLight = new RC.DirectionalLight(
    new RC.Color("#FFFFFF"), 
    0.94, 
    {
        castShadows: false
    }
);
dLight.rotateX(0.1);
scene.add(dLight);

const cube = new RC.Cube(1.0, new RC.Color().setColorName("grey"));
cube.material = new RC.MeshLambertMaterial();
scene.add(cube);

const fontImgLoader = new RC.ImageLoader();
fontImgLoader.load("../common/textures/fonts/font2.png", function (image) {
    const fontTexture = new RC.Texture(
        image, 
        RC.Texture.WRAPPING.ClampToEdgeWrapping, 
        RC.Texture.WRAPPING.ClampToEdgeWrapping,
        RC.Texture.FILTER.NearestFilter, 
        RC.Texture.FILTER.NearestFilter,
        RC.Texture.FORMAT.RGBA, 
        RC.Texture.FORMAT.RGBA, 
        RC.Texture.TYPE.UNSIGNED_BYTE,
        128,
        256
    );
    fontTexture._generateMipmaps = false;

    const text = new RC.Text2D(
        {
            text: " <- This is a corner.", 
            fontTexture: fontTexture, 
            xPos: 0, 
            yPos: 0, 
            fontSize: 64, 
            cellAspect: 8/16, 
            mode: RC.TEXT2D_SPACE_WORLD
        }
    );
    text.position = new RC.Vector3(1, 1, 1);
    cube.add(text);
});


function resizeFunction() {
    canvas.updateSize();
    renderer.updateViewport(canvas.width, canvas.height);
};

function renderFunction() {
    cube.rotateX(-0.01);
    cube.rotateY(+0.01);
    cube.rotateZ(+0.01);

    renderer.render(scene, camera);
    window.requestAnimationFrame(renderFunction);
}

window.onload = function() {
    window.addEventListener("resize", resizeFunction, false);
    resizeFunction();
    window.requestAnimationFrame(renderFunction);
};
