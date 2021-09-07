/** IMPORTS */
import * as RC from "../../src/RenderCore.js";
import { HIGHPASS_MODE_BRIGHTNESS } from "../../src/RenderCore.js";
import MeshCore from "./MeshCore.js";


let asss = false;
/** CONTROL PARAMETERS */
const CoreControl = {
    //plain
    canvas: undefined,
    scene: undefined,
    camera: undefined,
    renderer: undefined,
    renderQueue: undefined,

    //util
    stopwatch: {currTime: 0, prevTime: 0, deltaTime: 0},
    keyboard: {keyboardInput: undefined, keyboardTranslation: {x: 0, y: 0, z: 0}, keyboardRotation: {x: 0, y: 0, z: 0}},
    mouse: {mouseInput: undefined},
    cameraControl: {regularCameraControl: undefined, orbitalCameraControl: undefined, activeCameraControl: true},
    keyMap: {
        ROT_X_NEG: 40,
        ROT_X_POS: 38,
        ROT_Y_NEG: 39,
        ROT_Y_POS: 37,
        //ROT_Z_NEG: 69,
        ROT_Z_NEG: undefined,
        //ROT_Z_POS: 81,
        ROT_Z_POS: undefined,

        MV_X_NEG: 65,
        MV_X_POS: 68,
        //MV_Y_NEG: 17,
        MV_Y_NEG: 81,
        //MV_Y_POS: 32,
        MV_Y_POS: 69,
        MV_Z_NEG: 87,
        MV_Z_POS: 83,
    },

    //managers
    canvasManager: undefined,
    sceneManager: undefined,
    cameraManager: undefined,
    rendererManager: undefined,

    //input object
    input: {
        keyboard: undefined,
        navigators: {
            rotation: undefined,
            translation: undefined
        },
        mouse: undefined,
        gamepads: undefined,
        multiplier: 1
    },

    /** INIT CORE */
    initializeCore: function(){
        this.canvas = this.initializeCanvas();
        this.canvasManager = this.initializeCanvasManager(this.canvas);

        this.renderer = this.initializeRenderer(this.canvas.canvas);
        this.renderQueue = this.initializeRenderQueue(this.renderer);
        this.rendererManager = this.initializeRendererManager(this.renderer);

        this.scene = this.createDefaultScene();
        this.sceneManager = this.createSceneManager(this.scene);

        this.camera = this.createDefaultCamera(this.canvas.canvas);
        this.cameraManager = this.createCameraManager(this.camera, this.keyMap);
    },

    initializeCanvas: function(){
        let canvasDOM = document.createElement("canvas");
        canvasDOM.id = "rc-canvas-main";
        canvasDOM.width = document.body.clientWidth;
        canvasDOM.height = document.body.clientHeight;
        canvasDOM.style.padding = '0';
        canvasDOM.style.margin = '0';

        return new RC.Canvas(canvasDOM);
    },
    initializeCanvasManager(canvas){
        let canvasManager = new RC.CanvasManager(document.getElementsByTagName("body")[0]);
        canvasManager.addCanvas(canvas);
        canvasManager.activeCanvas = canvas;

        return canvasManager;
    },

    initializeRenderer: function(canvas){
        let renderer = new RC.MeshRenderer(canvas, RC.WEBGL2, {antialias: true, stencil: true});
        renderer.clearColor = "#000000ff";
        renderer.addShaderLoaderUrls("../../src/shaders");

        return renderer;
    },
    initializeRenderQueue: function(renderer){
        let renderQueue = new RC.RenderQueue(renderer);
        renderQueue.pushRenderPass(MainRenderPass);
        renderQueue.pushRenderPass(PostprocessingPass_HighPass);
        renderQueue.pushRenderPass(PostprocessingPass_Gauss1);
        renderQueue.pushRenderPass(PostprocessingPass_Gauss2);
        renderQueue.pushRenderPass(PostprocessingPass_Bloom);

        return renderQueue;
    },
    initializeRendererManager: function(renderer){
        let rendererManager = new RC.RendererManager();
        rendererManager.addRenderer(renderer);
        rendererManager.activeRenderer = renderer;

        return rendererManager;
    },

    createDefaultScene: function(){
        return this.createEmptyScene();
    },

    createEmptyScene: function(){
        return new RC.Scene();
    },

    createSceneManager: function(scene){
        let sceneManager = new RC.SceneManager();
        sceneManager.addScene(scene);
        sceneManager.activeScene = scene;

        return sceneManager;
    },

    createDefaultCamera: function(canvas){
        let camera = new RC.PerspectiveCamera(75, canvas.width/canvas.height, 0.1, 100000);
        camera.position = new RC.Vector3(0, 0, 8);

        return camera;
    },

    createCameraManager: function(camera, keyMap){
        let cameraManager = new RC.CameraManager();
        cameraManager.addFullOrbitCamera(camera, new RC.Vector3(0, 0, 0));
        cameraManager.camerasControls[camera._uuid].keyMap = keyMap;
        cameraManager.activeCamera = camera;

        return cameraManager;
    },


    /** RENDER LOOP */
    render: function () {
        window.requestAnimationFrame(function(){CoreControl.render()});

        this.stopwatch.currTime = performance.now();
        this.stopwatch.deltaTime = (this.stopwatch.currTime - this.stopwatch.prevTime);
        this.stopwatch.prevTime = this.stopwatch.currTime;


        //CAMERA TRANSFORM ANIMATION
        const input = {
            keyboard: this.keyboard.keyboardInput.update(),
            navigators: {
                rotation: this.keyboard.keyboardRotation,
                translation: this.keyboard.keyboardTranslation
            },
            mouse: this.mouse.mouseInput.update(),
            gamepads: undefined,
            multiplier: 1
        };


        //CAMERA MANAGER
        this.cameraManager.update(input, this.stopwatch.deltaTime);


        //light animation
        let d_light, p_light;
        for(let i = 0; i < this.sceneManager.activeScene.children.length; i++){
            if(this.sceneManager.activeScene.children[i].type === "DirectionalLight"){
                d_light = this.sceneManager.activeScene.children[i];
            }
            else if(this.sceneManager.activeScene.children[i].type === "PointLight"){
                p_light = this.sceneManager.activeScene.children[i];

                p_light.translateX( 8/100*Math.sin(this.stopwatch.currTime/10000));
                p_light.translateZ( 8/100*Math.cos(this.stopwatch.currTime/10000));
            } 
        }
        p_light.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));
        d_light.lookAt(p_light.position, new RC.Vector3(0, 1, 0));


        //RENDER PIPE
        this.renderQueue.render();
    }

};


/** INIT MAIN */
window.onload = function(){
    window.addEventListener("resize", resizeFunction, false);
    window.addEventListener("mouseup", function(event){
        //CoreControl.rendererManager.activeRenderer.pick(RC.MouseInput.instance.cursor.position.x, RC.MouseInput.instance.cursor.position.y);
        CoreControl.rendererManager.activeRenderer.pick(event.clientX, event.clientY, function(pickedColor){
            console.log(pickedColor);
        });
    }, false);

    //INPUT
    CoreControl.keyboard.keyboardInput = RC.KeyboardInput.instance;
    CoreControl.mouse.mouseInput = RC.MouseInput.instance;
    CoreControl.mouse.mouseInput.setSourceObject(window);



    //INIT
    CoreControl.initializeCore();



    //ADD TO (DEFAULT) SCENE
    const shaderPath = "../../src/shaders";
    const MCore = new MeshCore(shaderPath);
    MCore._populateScene(CoreControl.sceneManager.activeScene);



    //RENDER
    window.requestAnimationFrame(function(){CoreControl.render()});
};


const resizeFunction = function () {
    // Make the canvas the same size
    CoreControl.canvasManager.activeCanvas.canvas.width  = document.body.clientWidth;
    CoreControl.canvasManager.activeCanvas.canvas.height = document.body.clientHeight;

    // Update camera aspect ratio and renderer viewport
    if (CoreControl.cameraManager.activeCamera) {
        CoreControl.cameraManager.activeCamera.aspect = CoreControl.canvasManager.activeCanvas.canvas.width / CoreControl.canvasManager.activeCanvas.canvas.height;
    }
    if(CoreControl.rendererManager.activeRenderer){
        CoreControl.rendererManager.activeRenderer.updateViewport(CoreControl.canvasManager.activeCanvas.canvas.width, CoreControl.canvasManager.activeCanvas.canvas.height);
    }
};


//RENDER PASS DEFINITIONS
const MainRenderPass = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.BASIC,

    // Initialize function
    function (textureMap, additionalData) {
        /** runs once */
    },

    // Preprocess function
    function (textureMap, additionalData) {
        return { scene: CoreControl.sceneManager.activeScene, camera: CoreControl.cameraManager.activeCamera };
    },

    function (textureMap, additionalData) {
    },

    // Target
    RC.RenderPass.TEXTURE,

    // Viewport
    { width: window.innerWidth, height: window.innerHeight },

    // Bind depth texture to this ID
    "dt",

    [
        {id: "color0", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG},
        //{id: "color1", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG},
        //{id: "color2", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG}
    ]
);
const PostprocessingPass_HighPass = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.POSTPROCESS,

    // Initialize function
    function (textureMap, additionalData) {
        /** runs once */
    },

    // Preprocess function
    function (textureMap, additionalData) {

        var hp = new RC.CustomShaderMaterial("highPass", {MODE: HIGHPASS_MODE_BRIGHTNESS, targetColor: [0.2126, 0.7152, 0.0722], threshold: 0.75});
		hp.lights = false;


        return {material: hp, textures: [textureMap["color0"]]};
    },

    function (textureMap, additionalData) {
    },

    // Target
    RC.RenderPass.TEXTURE,

    // Viewport
    { width: window.innerWidth, height: window.innerHeight },

    // Bind depth texture to this ID
    "dt",

    [
        {id: "color1", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG}
    ]
);
const PostprocessingPass_Gauss1 = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.POSTPROCESS,

    // Initialize function
    function (textureMap, additionalData) {
        /** runs once */
    },

    // Preprocess function
    function (textureMap, additionalData) {

        var gb = new RC.CustomShaderMaterial("gaussBlur", {horizontal: true, power: 1.0});
		gb.lights = false;


        return {material: gb, textures: [textureMap["color1"]]};
    },

    function (textureMap, additionalData) {
    },

    // Target
    RC.RenderPass.TEXTURE,

    // Viewport
    { width: window.innerWidth, height: window.innerHeight },

    // Bind depth texture to this ID
    "dt",

    [
        {id: "color2", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG}
    ]
);
const PostprocessingPass_Gauss2 = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.POSTPROCESS,

    // Initialize function
    function (textureMap, additionalData) {
        /** runs once */
    },

    // Preprocess function
    function (textureMap, additionalData) {

        var gb = new RC.CustomShaderMaterial("gaussBlur", {horizontal: false, power: 1.0});
		gb.lights = false;


        return {material: gb, textures: [textureMap["color2"]]};
    },

    function (textureMap, additionalData) {
    },

    // Target
    RC.RenderPass.TEXTURE,

    // Viewport
    { width: window.innerWidth, height: window.innerHeight },

    // Bind depth texture to this ID
    "dt",

    [
        {id: "color3", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG}
    ]
);
const PostprocessingPass_Bloom = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.POSTPROCESS,

    // Initialize function
    function (textureMap, additionalData) {
        /** runs once */
    },

    // Preprocess function
    function (textureMap, additionalData) {

        var gb = new RC.CustomShaderMaterial("bloom");
		gb.lights = false;


        return {material: gb, textures: [textureMap["color3"], textureMap["color0"]]};
    },

    function (textureMap, additionalData) {
    },

    // Target
    RC.RenderPass.SCREEN,

    // Viewport
    { width: window.innerWidth, height: window.innerHeight }
);