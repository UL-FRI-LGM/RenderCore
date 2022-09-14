/** IMPORTS */
import * as RC from "../../src/RenderCore.js";


const predef_width = document.body.clientWidth;
const predef_height = document.body.clientHeight;
const nearPlane = 0.1;
const farPlane = 1000000;


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
    renderQueueManager: undefined,

    //cores
    meshCore: undefined,

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

        this.renderer = this.initializeRenderer(this.canvas);
        this.renderQueue = this.initializeRenderQueue(this.renderer);
        this.rendererManager = this.initializeRendererManager(this.renderer);
        this.renderQueueManager = this.initializeRenderQueueManager(this.renderQueue);

        this.scene = this.createDefaultScene();
        this.sceneManager = this.createSceneManager(this.scene);

        this.camera = this.createDefaultCamera(this.canvas);
        this.cameraManager = this.createCameraManager(this.camera, this.keyMap);
    },

    initializeCanvas: function(){
        return new RC.Canvas(document.body);
    },
    initializeCanvasManager(canvas){
        const canvasManager = new RC.CanvasManager(document.body);
        canvasManager.addCanvas(canvas);
        canvasManager.activeCanvas = canvas;

        return canvasManager;
    },

    initializeRenderer: function(canvas){
        const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2, {antialias: false, stencil: true});
        renderer.clearColor = "#ffffffff";
        renderer.addShaderLoaderUrls("../../src/shaders");

        return renderer;
    },
    initializeRenderQueue: function(renderer){
        const renderQueue = new RC.RenderQueue(renderer);

        renderQueue.pushRenderPass(RenderPass_MainShader); //normal scene render


        return renderQueue;
    },
    initializeRendererManager: function(renderer){
        const rendererManager = new RC.RendererManager();
        rendererManager.addRenderer(renderer);
        rendererManager.activeRenderer = renderer;

        return rendererManager;
    },
    initializeRenderQueueManager: function(renderQueue){
        const renderQueueManager = new RC.RenderQueueManager();
        renderQueueManager.addRenderQueue(renderQueue);
        renderQueueManager.activeRenderQueue = renderQueue;

        return renderQueueManager;
    },

    createDefaultScene: function(){
        const scene = this.createEmptyScene();

        //lights
        const aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 0.0625);
        scene.add(aLight);

        const pLight = new RC.PointLight(new RC.Color("#FFFFFF"), 2.0, 0.0, 0.0625);
        pLight.position.set(0, 0, 8);
        scene.add(pLight);

        //grid
        const grid1 = new RC.Grid(undefined, undefined, 1.0, 10.0);
        grid1.geometry.computeVertexNormals();
        scene.add(grid1);

        //normal objects
        const radius = 4;
        const subdevision = 2;
        const scale = 1;
        const cube1 = new RC.IcoSphere(radius, subdevision, scale, new RC.Color().setColorName("purple"), true);
        cube1.position.set(-8, 8, 0);
        cube1.material = new RC.MeshBasicMaterial();
        cube1.material.emissive = new RC.Color(0, 0, 0);
        cube1.material.color = new RC.Color(0.5, 0, 0);
        cube1.material.shadingType = RC.FlatShading;
        scene.add(cube1);
        const cube2 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube2.position.set(0, 8, 0);
        cube2.material = new RC.MeshBasicMaterial();
        cube2.material.emissive = new RC.Color(0, 0, 0);
        cube2.material.color = new RC.Color(0.5, 0, 0);
        scene.add(cube2);
        const cube3 = new RC.IcoSphere(radius, subdevision, scale, new RC.Color().setColorName("purple"), true);
        cube3.position.set(8, 8, 0);
        cube3.material = new RC.MeshBasicMaterial();
        cube3.material.emissive = new RC.Color(0, 0, 0);
        cube3.material.color = new RC.Color(0.5, 0, 0);
        cube3.material.shadingType = RC.SmoothShading;
        scene.add(cube3);
        const cube4 = new RC.IcoSphere(radius, subdevision, scale, new RC.Color().setColorName("purple"), true);
        cube4.position.set(-8, 0, 0);
        cube4.material = new RC.MeshLambertMaterial();
        cube4.material.emissive = new RC.Color(0, 0, 0);
        cube4.material.color = new RC.Color(0.5, 0, 0);
        cube4.material.shadingType = RC.FlatShading;
        scene.add(cube4);
        const cube5 = new RC.IcoSphere(radius, subdevision, scale, new RC.Color().setColorName("purple"), true);
        cube5.position.set(0, 0, 0);
        cube5.material = new RC.MeshLambertMaterial();
        cube5.material.emissive = new RC.Color(0, 0, 0);
        cube5.material.color = new RC.Color(0.5, 0, 0);
        cube5.material.shadingType = RC.GouraudShading;
        scene.add(cube5);
        const cube6 = new RC.IcoSphere(radius, subdevision, scale, new RC.Color().setColorName("purple"), true);
        cube6.position.set(8, 0, 0);
        cube6.material = new RC.MeshLambertMaterial();
        cube6.material.emissive = new RC.Color(0, 0, 0);
        cube6.material.color = new RC.Color(0.5, 0, 0);
        cube6.material.shadingType = RC.SmoothShading;
        scene.add(cube6);
        const cube7 = new RC.IcoSphere(radius, subdevision, scale, new RC.Color().setColorName("purple"), true);
        cube7.position.set(-8, -8, 0);
        cube7.material = new RC.MeshPhongMaterial();
        cube7.material.emissive = new RC.Color(0, 0, 0);
        cube7.material.color = new RC.Color(0.5, 0, 0);
        cube7.material.specular = new RC.Color(0.5, 0.5, 0.5);
        cube7.material.shineniness = 32;
        cube7.material.shadingType = RC.FlatShading;
        scene.add(cube7);
        const cube8 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube8.position.set(0, -8, 0);
        cube8.material = new RC.MeshPhongMaterial();
        cube8.material.emissive = new RC.Color(0, 0, 0);
        cube8.material.color = new RC.Color(0.5, 0, 0);
        cube8.material.specular = new RC.Color(0.5, 0.5, 0.5);
        cube8.material.shineniness = 32;
        scene.add(cube8);
        const cube9 = new RC.IcoSphere(radius, subdevision, scale, new RC.Color().setColorName("purple"), true);
        cube9.position.set(8, -8, 0);
        cube9.material = new RC.MeshPhongMaterial();
        cube9.material.emissive = new RC.Color(0, 0, 0);
        cube9.material.color = new RC.Color(0.5, 0, 0);
        cube9.material.specular = new RC.Color(0.5, 0.5, 0.5);
        cube9.material.shineniness = 32;
        cube9.material.shadingType = RC.SmoothShading;
        scene.add(cube9);


        return scene;
    },

    createEmptyScene: function(){
        return new RC.Scene();
    },

    createSceneManager: function(scene){
        const sceneManager = new RC.SceneManager();
        sceneManager.addScene(scene);
        sceneManager.activeScene = scene;

        return sceneManager;
    },

    createDefaultCamera: function(canvas){
        const camera = new RC.PerspectiveCamera(75, canvas.width/canvas.height, nearPlane, farPlane);
        camera.position = new RC.Vector3(0, 0, 8);
        camera.position = new RC.Vector3(-10, 10, 10);
        camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));

        return camera;
    },

    createCameraManager: function(camera, keyMap){
        const cameraManager = new RC.CameraManager();
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

        //camera manager
        this.cameraManager.update(input, this.stopwatch.deltaTime);


        //RENDER PIPE
        //use render queue (multiple composite render passes)
        this.renderQueueManager.activeRenderQueue.render();
    }

};


/** INIT MAIN */
window.onload = function(){
    window.addEventListener("resize", resizeFunction, false);


    //INPUT
    CoreControl.keyboard.keyboardInput = RC.KeyboardInput.instance;
    CoreControl.mouse.mouseInput = RC.MouseInput.instance;
    CoreControl.mouse.mouseInput.setSourceObject(window);


    //INIT
    CoreControl.initializeCore();

    
    //RENDER
    window.requestAnimationFrame(function(){CoreControl.render()});
};


const resizeFunction = function () {
    const activeCanvas = CoreControl.canvasManager.activeCanvas;

    // Update canvas size
    activeCanvas.updateSize();

    // Update camera aspect ratio and renderer viewport
    CoreControl.cameraManager.activeCamera.aspect = activeCanvas.width / activeCanvas.height;
    CoreControl.rendererManager.activeRenderer.updateViewport(activeCanvas.width, activeCanvas.height);

    const RQs = CoreControl.renderQueueManager.activeRenderQueue._renderQueue;
    for(let RQ = 0; RQ < RQs.length; RQ++){
        RQs[RQ].viewport = { width: activeCanvas.width, height: activeCanvas.height };
    }
};


const RenderPass_MainShader = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.BASIC,

    // Initialize function
    function (textureMap, additionalData) {
    },

    // Preprocess function
    function (textureMap, additionalData) {
        return { scene: CoreControl.scene, camera: CoreControl.camera };
    },

    function(textureMap, additionalData) {
    },

    // Target
    RC.RenderPass.SCREEN,

    // Viewport
    { width: predef_width, height: predef_height },

    // Bind depth texture to this ID
    "depthDefaultDefaultMaterials",

    [
        {id: "color_main", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG},
    ]
);

