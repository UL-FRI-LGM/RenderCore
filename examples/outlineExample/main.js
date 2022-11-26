/** IMPORTS */
import * as RC from "../../src/RenderCore.js";


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
        renderQueue.pushRenderPass(RenderPass_MainMulti); //render normals, view direction, depth, ... of outlined objects
        renderQueue.pushRenderPass(RenderPass_Outline); //computes outline based on multi render pass
        renderQueue.pushRenderPass(RenderPass_Blend);

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

        const aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 0.2);
        scene.add(aLight);

        const pLight1 = new RC.PointLight(new RC.Color("#FFFFFF"), 0.5);
        pLight1.position.set(0, 0, 4);
        scene.add(pLight1);

        const pLight2 = new RC.PointLight(new RC.Color("#FFFFFF"), 0.5);
        pLight2.position.set(0, 0, -4);
        scene.add(pLight2);

        const grid1 = new RC.Grid(undefined, undefined, 1.0, 10.0);
        grid1.geometry.computeVertexNormals();
        scene.add(grid1);


        //normal objects
        const cube1 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube1.position.set(-4, 4, 0);
        cube1.material = new RC.MeshPhongMaterial();
        cube1.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube1);
        const cube2 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube2.position.set(0, 4, 0);
        cube2.material = new RC.MeshPhongMaterial();
        cube2.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube2);
        const cube3 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube3.position.set(4, 4, 0);
        cube3.material = new RC.MeshPhongMaterial();
        cube3.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube3);
        const cube4 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube4.position.set(-4, 0, 0);
        cube4.material = new RC.MeshPhongMaterial();
        cube4.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube4);
        const cube5 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube5.position.set(0, 0, 0);
        cube5.material = new RC.MeshPhongMaterial();
        cube5.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube5);
        const cube6 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube6.position.set(4, 0, 0);
        cube6.material = new RC.MeshPhongMaterial();
        cube6.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube6);
        const cube7 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube7.position.set(-4, -4, 0);
        cube7.material = new RC.MeshPhongMaterial();
        cube7.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube7);
        const cube8 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube8.position.set(0, -4, 0);
        cube8.material = new RC.MeshPhongMaterial();
        cube8.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube8);
        const cube9 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube9.position.set(4, -4, 0);
        cube9.material = new RC.MeshPhongMaterial();
        cube9.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube9);

                
        //outlined objects
        const cube_outlined = new RC.Cube(2, new RC.Color().setColorName("purple"));
        cube_outlined.drawOutline = true;
        cube_outlined.position.set(1, 1, 1);
        cube_outlined.material = new RC.MeshPhongMaterial();
        scene.add(cube_outlined);

        const cube_outlined2 = new RC.Cube(2, new RC.Color().setColorName("purple"));
        cube_outlined2.drawOutline = true;
        cube_outlined2.position.set(-1, -1, -1);
        cube_outlined2.material = new RC.MeshPhongMaterial();
        scene.add(cube_outlined2);

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
    resizeFunction();
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



function iterateSceneR(object, callback) {
    if (object === null || object === undefined) {
        return;
    }

    if(object.children.length > 0){
        for (let i = 0; i < object.children.length; i++) {
            iterateSceneR(object.children[i], callback);
        }
    }

    callback(object);
}



const OriginalMats = [];
const MultiMats = [];
const RenderPass_MainShader = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.BASIC,

    // Initialize function
    function (textureMap, additionalData) {
        iterateSceneR(CoreControl.scene, function(object){
            if(object.drawOutline) {
                OriginalMats.push(object.material);
            }
        });
    },

    // Preprocess function
    function (textureMap, additionalData) {
        let m_index = 0;

        iterateSceneR(CoreControl.scene, function(object){
            if(object.drawOutline) {
                object.material = OriginalMats[m_index];
                m_index++;

                object.visible = true;
            }else{
                object.visible = true;
            }
        });

        return { scene: CoreControl.scene, camera: CoreControl.camera };
    },

    function(textureMap, additionalData) {
    },

    // Target
    RC.RenderPass.TEXTURE,

    // Viewport
    { width: undefined, height: undefined },

    // Bind depth texture to this ID
    "depthDefaultDefaultMaterials",

    [
        {id: "color_main", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG},
    ]
);

const multi = new RC.CustomShaderMaterial("multi");
multi.lights = false;
multi.side = RC.FRONT_AND_BACK_SIDE;
const RenderPass_MainMulti = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.BASIC,

    // Initialize function
    function (textureMap, additionalData) {
        iterateSceneR(CoreControl.scene, function(object){
            if(object.drawOutline) {
                MultiMats.push(multi);
            }
        });
    },

    // Preprocess function
    function (textureMap, additionalData) {
        let m_index = 0;

        iterateSceneR(CoreControl.scene, function(object){
            if(object.drawOutline) {
                object.material = MultiMats[m_index];
                m_index++;

                object.visible = true;
            }else if (object instanceof RC.Scene || object instanceof RC.Group){
                object.visible = true;
            }else{
                object.visible = false;
            }
        });

        return { scene: CoreControl.scene, camera: CoreControl.camera };
    },

    function(textureMap, additionalData) {
    },

    // Target
    RC.RenderPass.TEXTURE,

    // Viewport
    { width: undefined, height: undefined },

    // Bind depth texture to this ID
    "depthDefaultMultiMaterials",

    [
        {id: "depth", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG},
        {id: "position", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
        {id: "normal", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
        {id: "viewDir", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
        {id: "camDist", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
    ]
);


const outlineMaterial = new RC.CustomShaderMaterial("outline", {scale: Math.E, edgeColor: [0.7, 0.1, 0.5, 1.0], _DepthThreshold: 6.0, _NormalThreshold: 0.4, _DepthNormalThreshold: 0.5, _DepthNormalThresholdScale: 7.0});
outlineMaterial.lights = false;
const RenderPass_Outline = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.POSTPROCESS,

    // Initialize function
    function (textureMap, additionalData) {
    },

    // Preprocess function
    function (textureMap, additionalData) {
        return {material: outlineMaterial, textures: [textureMap["depthDefaultMultiMaterials"], textureMap["normal"], textureMap["viewDir"], textureMap["color_main"]]};
    },

    function(textureMap, additionalData) {
    },

    // Target
    RC.RenderPass.TEXTURE,

    // Viewport
    { width: undefined, height: undefined },

    // Bind depth texture to this ID
    null,

    [
        {id: "color_outline", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
    ]
);

const blendingMaterial = new RC.CustomShaderMaterial("blendingAdditive");
blendingMaterial.lights = false; 
const RenderPass_Blend = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.POSTPROCESS,

    // Initialize function
    (textureMap, additionalData) => {},

    // Preprocess function
    (textureMap, additionalData) => {
        return {
            material: blendingMaterial, 
            textures: [
                textureMap["color_outline"],
                textureMap["color_main"]
            ]
        };
    },

    (textureMap, additionalData) => {},

    // Target
    RC.RenderPass.SCREEN,

    // Viewport
    { width: undefined, height: undefined },

    // Bind depth texture to this ID
    null,

    [
        {id: "null", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG}
    ]
);