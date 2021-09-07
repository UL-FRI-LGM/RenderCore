/** IMPORTS */
import * as RC from "../../src/RenderCore.js";
import MeshCore from "./MeshCore.js";


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

    MeshCore: undefined,
    animationName: "input_00",

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
        camera.position = new RC.Vector3(0, 0, 128);

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
        //if(renderEnable || currentFrame < maxFrames){
            window.requestAnimationFrame(function(){CoreControl.render()});
            if(!renderEnable){
                currentFrame++;
            }else{
                currentFrame = 0;
            }
        //}

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



        //animation
        const animationsTable = this.MeshCore._ANIMATIONS_TABLE;//console.log(animationsTable);
        const animationsNames = Object.keys(animationsTable);

        if(animationsNames.length > 0){
            const animation = animationsTable[CoreControl.animationName];
            const animationTimes = Object.keys(animation);
            animationTimes.sort(function(a, b){return parseFloat(a) - parseFloat(b)});

        
            const animationDuration = parseFloat(animationTimes[animationTimes.length-1]);//console.log(animationDuration);
            const currentAnimationTime = (this.stopwatch.currTime) % animationDuration;


            //CLOSEST INTERPOLATED KEYFRAME
            let shortestDistance = Number.MAX_VALUE;
            let timeIndex = null;
            for(let t = 0; t < animationTimes.length; t++){
                const timeDistance = Math.abs(currentAnimationTime - parseFloat(animationTimes[t]));
                
                if(timeDistance < shortestDistance){
                    shortestDistance = timeDistance;
                    timeIndex = animationTimes[t];
                }
            }
 
            //console.log(timeIndex);
            const group = this.MeshCore._ANIMATION_OBJECT;
            group.children[0].geometry = animation[timeIndex].children[0].geometry;
            group.children[1].geometry = animation[timeIndex].children[1].geometry;
            group.children[2].geometry = animation[timeIndex].children[2].geometry;


            //LERP
            /*let lowerBound, higherBound;
            for(let t = 0; t < animationTimes.length; t++){
                if(animationTimes[t] === currentAnimationTime){
                    lowerBound = animationTimes[t];
                    higherBound = animationTimes[t];

                    break;
                }else if(animationTimes[t] > currentAnimationTime){
                    lowerBound = animationTimes[t-1];
                    higherBound = animationTimes[t];

                    break;
                }
            }

            const group = this.MeshCore._ANIMATION_OBJECT;
            if(lowerBound !== higherBound){
                //LERP
                const t = (currentAnimationTime - lowerBound)/(higherBound-lowerBound);

                const lerpGeometry0 = this.MeshCore.lerpGeometry(animation[lowerBound].children[0].geometry, animation[higherBound].children[0].geometry, t);
                const lerpGeometry1 = this.MeshCore.lerpGeometry(animation[lowerBound].children[1].geometry, animation[higherBound].children[1].geometry, t);
                const lerpGeometry2 = this.MeshCore.lerpGeometry(animation[lowerBound].children[2].geometry, animation[higherBound].children[2].geometry, t);

                group.children[0].geometry = lerpGeometry0;
                group.children[1].geometry = lerpGeometry1;
                group.children[2].geometry = lerpGeometry2;
            }else{
                group.children[0].geometry = animation[lowerBound].children[0].geometry;
                group.children[1].geometry = animation[lowerBound].children[1].geometry;
                group.children[2].geometry = animation[lowerBound].children[2].geometry;
            }*/
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


    //ADD MORE SCENES
    const MCore = new MeshCore(shaderPath, function(_ANIMATIONS_TABLE){
        console.log(_ANIMATIONS_TABLE);
    });
    CoreControl.MeshCore = MCore;
    //MCore._populateScene(CoreControl.sceneManager.activeScene);
    CoreControl.sceneManager.activeScene = MCore.scene;
    

    //CoreControl.canvasManager.addCanvas(PCCore.canvas);
    //CoreControl.cameraManager.addFullOrbitCamera(PCCore.camera, new RC.Vector3(0, 0, 0));
    //CoreControl.cameraManager.camerasControls[PCCore.camera._uuid].keyMap = CoreControl.keyMap;
    //CoreControl.sceneManager.addScene(PCCore.scene);
    //CoreControl.rendererManager.addRenderer(PCCore.renderer);


    //RENDER
    window.requestAnimationFrame(function(){CoreControl.render()});



    window.app = CoreControl.sceneManager.activeScene;
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
    //ANIMATION PRESETS
    if (event.keyCode === 49) CoreControl.animationName = "input_00";
    if (event.keyCode === 50) CoreControl.animationName = "input_01";
    if (event.keyCode === 51) CoreControl.animationName = "input_02";
    if (event.keyCode === 52) CoreControl.animationName = "input_03";

    //CYCLE BACKGROUND
    if (event.keyCode === 53){   //key "5"
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