import * as RC from '../../src/RenderCore.js'

class App {

  constructor(canvas) {
    window.RC = RC;
    window.App = this;

    window.addEventListener("resize", () => {this.resize();}, false);

    // Class variables
    this.objects = [];

    // Timestamp calculation
    this.prevTime = -1; this.currTime; this.dt;

    // FPS calculation
    this.timenow = 0; this.timeLast = 0; this.fps = 0;

    this.canvas = canvas;

    const cnv = new RC.Canvas();
    cnv.canvasDOM = document.getElementById("canvas");

    this.renderer = new RC.MeshRenderer(cnv, RC.WEBGL2);
    this.renderer.clearColor = "#000000FF";
    this.renderer.addShaderLoaderUrls("../../src/shaders");
    this.renderer.addShaderLoaderUrls("../common/shaders");


    this.initScenes();
    this.initInputControls();
    this.loadResources();

    // Wait to load all resources
    this.callback = function () {
      setTimeout( function() { app.waitToLoad(app.callback); }, 50 );
    }

    this.waitToLoad(this.callback);
  }

  initScenes() {
    this.mainScene = new RC.Scene();

    this.mainCamera = new RC.PerspectiveCamera(1.483, 16/9, 10, 10000);
    this.mainCamera.position = new RC.Vector3(0, 0, 80);

    this.depthScene = new RC.Scene();

    // Initialize output quad
    // let depthShaderMaterial = new RC.CustomShaderMaterial("renderDepth", {
    //     "material.diffuse": [1.0, 1.0, 1.0]
    //   });
    let depthShaderMaterial = new RC.CustomShaderMaterial("renderDepth");
    depthShaderMaterial.color = new RC.Color(1.0, 1.0, 1.0);

    this.quad = new RC.Quad(new RC.Vector2(-1.0, -1.0), new RC.Vector2(1.0, 1.0), depthShaderMaterial);
		this.quad.rotateY(RC._Math.degToRad(180));
    this.objects.push(this.quad);
    this.depthScene.add(this.quad);

    this.secondCamera = new RC.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
		this.secondCamera.position = new RC.Vector3(0, 0, 8);
  }

  initInputControls() {
      this.keyboardRotation = {x: 0, y: 0, z: 0, reset: function() { this.x = 0; this.y = 0; this.z = 0; }};
      this.keyboardTranslation = {x: 0, y: 0, z: 0, reset: function() { this.x = 0; this.y = 0; this.z = 0; }};

      this.keyboardInput = RC.KeyboardInput.instance;

      this.keyboardInput.addListener(function(pressedKeys) {
          // ROTATIONS
          if (pressedKeys.has(65)) { // A
            app.keyboardRotation.y = 1;
          }

          if (pressedKeys.has(68)) { // D
            app.keyboardRotation.y = -1;
          }

          if (pressedKeys.has(87)) { // W
            app.keyboardRotation.x = 1;
          }

          if (pressedKeys.has(83)) { // S
            app.keyboardRotation.x = -1;
          }

          if (pressedKeys.has(81)) { // Q
            app.keyboardRotation.z = 1;
          }

          if (pressedKeys.has(82)) { // R
            app.keyboardRotation.z = -1;
          }


          // TRANSLATIONS
          if (pressedKeys.has(39)) { // RIGHT - Right
            app.keyboardTranslation.x = 1;
          }

          if (pressedKeys.has(37)) { // LEFT - Left
            app.keyboardTranslation.x = -1;
          }

          if (pressedKeys.has(40)) { // DOWN - Backward
            app.keyboardTranslation.z = 1;
          }

          if (pressedKeys.has(38)) { // UP - Forward
            app.keyboardTranslation.z = -1;
          }

          if (pressedKeys.has(85)) { // U - Upward
            app.keyboardTranslation.y = 1;
          }

          if (pressedKeys.has(70)) { // F - Downward
            app.keyboardTranslation.y = -1;
          }
        });
  }

  initRenderQueue() {
    this.mainRenderPass = new RC.RenderPass(
      // Rendering pass type
      RC.RenderPass.BASIC,

      // Initialize function
			(textureMap, additionalData) => {},

      // Preprocess function
      (textureMap, additionalData) => {
				return {scene: this.mainScene, camera: this.mainCamera};
			},

      function (textureMap, additionalData) {
      },

      // Target
      RC.RenderPass.TEXTURE,

      // Viewport
      { width: this.canvas.width, height: this.canvas.height },

      // Bind depth texture to this ID
      "MainRenderDepth",
      [{
        id: "MainRenderTex",
        textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG
      }]
    );


    this.depthRenderPass = new RC.RenderPass(
      // Rendering pass type
      RC.RenderPass.BASIC,

      // Initialize function
      (textureMap, additionalData) => {
        this.objects[0].material.addMap(textureMap.MainRenderDepth);
      },

      // Preprocess function
      (textureMap, additionalData) => {
        return {scene: this.depthScene, camera: this.secondCamera};
      },

      function (textureMap, additionalData) {
      },

      // Target
      RC.RenderPass.SCREEN,

      // Viewport
      { width: this.canvas.width, height: this.canvas.height },

      // Bind depth texture to this ID
      "Depth",
      [{
        id: "MainRenderTex",
        textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG
      }]
    );

    this.renderQueue = new RC.RenderQueue(this.renderer);
    this.renderQueue.pushRenderPass(this.mainRenderPass);
    this.renderQueue.pushRenderPass(this.depthRenderPass);
  }

  loadResources() {
    this.loadFlag = [false];

    this.manager = new RC.LoadingManager();
    this.loaderObj = new RC.ObjLoader(this.manager);
    this.loaderTexture = new RC.ImageLoader(this.manager);


    this.loaderObj.load("../common/models/untitled4.obj", function ( obj ) {
      app.objects.push(...obj);
      for (let i = 0; i < obj.length; i++) {
        obj[i].position.z = 0;

        let material = new RC.MeshPhongMaterial();
        obj[i].material = material;
        obj[i].position = new RC.Vector3(0.15, -0.8, 0);

        obj[i].geometry.drawWireframe = false;
        app.mainScene.add(obj[i]);
      }

      app.loadFlag[0] = true;
    });
  }

  waitToLoad(callback) {
    if(this.loadFlag[0] == true) {
      this.initRenderQueue();
      this.resize();
      window.requestAnimationFrame(() => {this.update()});
    } else {
      callback();
    }
  }

  update() {
    this.calculateFps();
    this.resize();

    // Calculate delta time and update timestamps
    this.currTime = new Date();
    this.dt = (this.prevTime !== -1) ? this.currTime - this.prevTime : 0;
    this.prevTime = this.currTime;

    this.keyboardTranslation.reset();
    this.keyboardRotation.reset();
    this.keyboardInput.update();

    this.updateObjectPosition();

    this.render();
		window.requestAnimationFrame(() => {this.update()});
  }

  render() {
    this.renderQueue.render();
  }

  resize() {
    // Make the canvas the same size
    this.canvas.width  = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;

    // Update camera aspect ratio and renderer viewport
    this.mainCamera.aspect = this.canvas.width / this.canvas.height;
    this.renderer.updateViewport(this.canvas.width, this.canvas.height);

    this.mainRenderPass.viewport = { width: this.canvas.width, height: this.canvas.height };
    this.depthRenderPass.viewport = { width: this.canvas.width, height: this.canvas.height };
  }

  calculateFps() {
    this.timeNow = new Date();
    this.fps++;

    if (this.timeNow - this.timeLast >= 1000) {
        //Write value in HTML
        //multiply with 1000.0 / (timeNow - timeLast) for accuracy
        document.getElementById("fps").innerHTML = Number(this.fps * 1000.0 / (this.timeNow - this.timeLast)).toPrecision( 5 );

        //reset
        this.timeLast = this.timeNow;
        this.fps = 0;
    }
  }

  updateObjectPosition() {
    for (let i = 1; i < this.objects.length; i++) {
      this.objects[i].rotateX(this.keyboardRotation.x * this.dt * 0.001);
      this.objects[i].rotateY(this.keyboardRotation.y * this.dt * 0.001);
      this.objects[i].rotateZ(this.keyboardRotation.z * this.dt * 0.01);

      this.objects[i].translateX(this.keyboardTranslation.x * this.dt * 0.008);
      this.objects[i].translateY(this.keyboardTranslation.y * this.dt * 0.008);
      this.objects[i].translateZ(this.keyboardTranslation.z * this.dt * 0.1);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.querySelector('canvas');
  const app = window.app = new App(canvas);
});

Math.degToRad = function(degrees) {
  return degrees * Math.PI / 180;
};
