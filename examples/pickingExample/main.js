import * as RC from "../../src/RenderCore.js";


const canvas = new RC.Canvas(document.body);

const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
renderer.clearColor = "#000000FF";
renderer.addShaderLoaderUrls("../../src/shaders");

const scene = new RC.Scene();
const camera = new RC.PerspectiveCamera(75, canvas.width/canvas.height, 0.125, 128);
camera.position.set(0, 2, 16);
camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));

const pLight = new RC.PointLight(new RC.Color("#FDB813"), 1.0);
scene.add(pLight);

let text2D;
populateScene();

const params = {
    "Pick mode": "RGB"
};
setUI();

const renderQueue = new RC.RenderQueue(renderer);
const PICK = new RC.PickerFX(
    renderer, 
    {scene: scene, camera: camera},
    {},
    {color: new RC.FX.output("color_picker")}
);
renderQueue.pushRenderQueue(PICK);

const RenderPass_MainPass = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.BASIC,
    // Initialize function
    (textureMap, additionalData) => { },
    // Preprocess function
    (textureMap, additionalData) => { return { scene: scene, camera: camera }; },
    // PostprocesWs function
    (textureMap, additionalData) => { },
    // Target
    RC.RenderPass.SCREEN,
    // Viewport
    { width: canvas.width, height: canvas.height },
    // Bind depth texture to this ID
    "depth_main",
    // Outputs
    [{id: "color_main", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG}]
);
renderQueue.pushRenderPass(RenderPass_MainPass);


function populateScene(){
    for(let i = 0; i < 32; i++){
        const cube = new RC.Cube(1.9, new RC.Color());
        cube.material = new RC.MeshBasicMaterial();
        cube.material.emissive.set(0.0, 0.0, 0.0);
        cube.position.set((Math.random() * 16) - 8, (Math.random() * 16) - 8, (Math.random() * 8) - 4);

        cube.RGB_ID = cube.material.color;
        cube.UINT_ID = i + 1;

        cube.pickable = true;
    
        scene.add(cube);
    }

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

        text2D = new RC.Text2D(
            {
                text: "Click on objects.", 
                fontTexture: fontTexture, 
                xPos: 10, 
                yPos: 10, 
                fontSize: 32,
                cellAspect: 8/16
            }
        );
        text2D.material.transparent = true;
        text2D.material.color = new RC.Color(1.0, 1.0, 1.0);
        scene.add(text2D);
    });
}
function setUI(){
    const gui = new dat.GUI();
    gui.add(params, "Pick mode",["RGB", "UINT"]).onChange(setPickMode);
}
function setPickMode(){
    text2D.text = "Click on objects.";

    const pickMode = params["Pick mode"];
    if(pickMode === "RGB"){
        PICK.pickMode = RC.PickerFX.PICK_MODE.RGB;
    }else if(pickMode === "UINT"){
        PICK.pickMode = RC.PickerFX.PICK_MODE.UINT;
    }
}

function resizeFunction() {
    canvas.updateSize();
    camera.aspect = canvas.width/canvas.height;
    renderer.updateViewport(canvas.width, canvas.height);
    const RQs = renderQueue._renderQueue;
    for(let RQ = 0; RQ < RQs.length; RQ++){
        RQs[RQ].viewport = { width: canvas.width, height: canvas.height };
    }
};
function mousedownFunction(event) {
    console.log(event);

    if (event.which === 1) {
        const pixelRatio = window.devicePixelRatio || 1;
        const x = event.clientX * pixelRatio;
        const y = event.clientY * pixelRatio;


        const pickMode = params["Pick mode"];
        if(pickMode === "RGB"){
            const pickedColor = renderQueue.pickRGB("color_picker", x, y);
            console.log(pickedColor);
            text2D.text = "R:" + ("00" + pickedColor[0]).slice(-3) + " G:" + ("00" + pickedColor[1]).slice(-3) + " B:" + ("00" + pickedColor[2]).slice(-3);
        }else if(pickMode === "UINT"){
            const pickedColor = renderQueue.pickUINT("color_picker", x, y);
            console.log(pickedColor);
            text2D.text = "UINT:" + pickedColor[0];
        }
    }
}

function renderFunction() {
    renderQueue.render(scene, camera);
    window.requestAnimationFrame(renderFunction);
}

window.onload = function() {
    window.addEventListener("resize", resizeFunction, false);
    window.addEventListener("mousedown", mousedownFunction, false);
    resizeFunction();
    window.requestAnimationFrame(renderFunction);
};
