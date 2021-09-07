/** IMPORTS */
import * as RC from "../../src/RenderCore.js";
import PointCloudCore from "./PointCloudCore.js";



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
    initializeCore: function(canvas){
        this.canvas = this.initializeCanvas();
        this.canvasManager = this.initializeCanvasManager(this.canvas);

        this.renderer = this.initializeRenderer(this.canvas.canvas);
        //this.renderQueue = this.initializeRenderQueue(this.renderer);
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
        let renderer = new RC.MeshRenderer(canvas, RC.WEBGL2, {antialias: true, stencil: false});
        renderer.clearColor = "#000000ff";
        renderer.addShaderLoaderUrls("../../src/shaders");

        return renderer;
    },
    /*initializeRenderQueue: function(renderer){
        let renderQueue = new RC.RenderQueue(renderer);
        renderQueue.pushRenderPass(MainRenderPass);

        return renderQueue;
    },*/
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
        let camera = new RC.PerspectiveCamera(75, canvas.width/canvas.height, 0.1, 10000);
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
        if(renderEnable || currentFrame < maxFrames){
            window.requestAnimationFrame(function(){CoreControl.render()});
            if(!renderEnable){
                currentFrame++;
            }else{
                currentFrame = 0;
            }
        }

        this.stopwatch.currTime = performance.now();
        this.stopwatch.deltaTime = (this.stopwatch.currTime - this.stopwatch.prevTime);
        this.stopwatch.prevTime = this.stopwatch.currTime;


        //RUN STAT TEST
        //console.log("FPS:" + 1/deltaTime + ", " + "Frame Time: " + deltaTime);
        //stat.test(this.stopwatch.deltaTime); //stat.initTest(10000, statLI);


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
        /*this.input.keyboard = this.keyboard.keyboardInput.update();
        this.input.navigators.rotation = this.keyboard.keyboardRotation;
        this.input.navigators.translation = this.keyboard.keyboardTranslation;
        this.input.mouse = this.mouse.mouseInput.update();*/

        //camera manager
        this.cameraManager.update(input, this.stopwatch.deltaTime);

        for(let i = 0; i < this.sceneManager.activeScene.children.length; i++){
            if(this.sceneManager.activeScene.children[i].name === "pLightContainer"){
                this.sceneManager.activeScene.children[i].rotateZ(0.0001 * this.stopwatch.deltaTime);
            }

        }


        //RENDER PIPE
        //use renderer manager
        this.rendererManager.activeRenderer.render(this.sceneManager.activeScene, this.cameraManager.activeCamera);
        //use render queue
        //this.renderQueue.render();
    }
};


/** INIT MAIN */
let renderEnable = false;
let maxFrames = 128;
let currentFrame = 0;
window.onload = function(){
    window.addEventListener("mousedown", function(){
        if(renderEnable === false) {
            renderEnable = true;
            CoreControl.render();
        }
        }, false);
    window.addEventListener("wheel", function(){
        if(renderEnable === false) {
            renderEnable = true;
            CoreControl.render();
            //renderEnable = false;
        }
    }, false);
    window.addEventListener("resize", resizeFunction, false);
    window.addEventListener("mouseup", function(event){
        //CoreControl.rendererManager.activeRenderer.pick(RC.MouseInput.instance.cursor.position.x, RC.MouseInput.instance.cursor.position.y);
        CoreControl.rendererManager.activeRenderer.pick(event.clientX, event.clientY, function(pickedColor){
            console.log(pickedColor);
        });

        renderEnable = false;
        currentFrame = maxFrames;
    }, false);

    //INPUT
    CoreControl.keyboard.keyboardInput = RC.KeyboardInput.instance;
    CoreControl.mouse.mouseInput = RC.MouseInput.instance;
    CoreControl.mouse.mouseInput.setSourceObject(window);



    //INIT
    CoreControl.initializeCore();



    //ADD TO (DEFAULT) SCENE
    const shaderPath = "../../src/shaders";
    //const MCore = new MeshCore(shaderPath);
    //MCore._populateScene(CoreControl.sceneManager.activeScene);


    //ADD MORE SCENES
    const PCCore = new PointCloudCore(shaderPath);
    PCCore._populateScene(CoreControl.sceneManager.activeScene);
    window.app = CoreControl.sceneManager.activeScene;
    //CoreControl.canvasManager.addCanvas(PCCore.canvas);
    //CoreControl.cameraManager.addFullOrbitCamera(PCCore.camera, new RC.Vector3(0, 0, 0));
    //CoreControl.cameraManager.camerasControls[PCCore.camera._uuid].keyMap = CoreControl.keyMap;
    //CoreControl.sceneManager.addScene(PCCore.scene);
    //CoreControl.rendererManager.addRenderer(PCCore.renderer);


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


let rccode = "#ffffffff";
document.addEventListener('keydown', function(event) {
    //console.log(event);
    //console.log(event.key);
    //console.log(event.keyCode);


    //CYCLE SCENE AND CAMERA
    if (event.keyCode === 50){   //key "2"
        CoreControl.sceneManager.cycle();
        CoreControl.cameraManager.cycle();
        CoreControl.rendererManager.cycle();
        CoreControl.canvasManager.cycle();

        //canvas specific
        resizeFunction();

    }


    //CYCLE BACKGROUND
    if (event.keyCode === 51){   //key "3"
        //cycle renderer?

        if(rccode === "#000000ff"){
            CoreControl.rendererManager.activeRenderer.clearColor = "#ffffffff";
            rccode = "#ffffffff";
        }else{
            CoreControl.rendererManager.activeRenderer.clearColor = "#000000ff";
            rccode = "#000000ff";
        }
    }

});