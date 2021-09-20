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
		cnv.canvasDOM = canvas;

    this.renderer = new RC.MeshRenderer(cnv, RC.WEBGL2);
    this.renderer.clearColor = "#000000FF";
    this.renderer.addShaderLoaderUrls("../../src/shaders");
    this.renderer.addShaderLoaderUrls("../common/shaders");


    this.initScenes();
    this.initGui();
    this.initRenderQueue();


    window.requestAnimationFrame(() => {this.update()});
  }

  initScenes() {
    this.noiseScene = new RC.Scene();

    this.noiseCamera = new RC.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
		this.noiseCamera.position = new RC.Vector3(0, 0, 8);

    let noiseShaderMaterial = new RC.CustomShaderMaterial("valueNoiseGenerator", {"resolution": 2, "frequency": 1.0,
          	                                                   "scale": 1.0, "offsetX": 0.0, "offsetY": 0.0, "lacunarity": 1.0,
                                                                "persistance": 0.5, "redestribution": 1.0, "layer": 1});

    this.quadTexture = new RC.Quad(new RC.Vector2(-1.0, -1.0), new RC.Vector2(1.0, 1.0), noiseShaderMaterial, undefined);
    this.quadTexture.rotateY(Math.degToRad(180));
    this.objects.push(this.quadTexture);
    this.noiseScene.add(this.quadTexture);
  }

  initGui() {
    this.effectController = {
      resolution: 2,
      frequency: 1,
      scale: 0.4,
      offsetX: 0,
      offsetY: 0,
      redestribution: 1.0,
      lacunarity: 2,
      persistance: 0.5,
      layer: 1
    };

    let gui = new dat.GUI();
    gui.add(this.effectController, 'resolution', 1, 256).step(2).name("Resolution");
    gui.add(this.effectController, 'frequency', 0.001, 4.00).name("Frequency");
    gui.add(this.effectController, 'scale', 0.001, 4.00).name("Scale");
    gui.add(this.effectController, 'offsetX', -10, 10).name("OffsetX");
    gui.add(this.effectController, 'offsetY', -10, 10).name("OffsetY");
    gui.add(this.effectController, 'redestribution', 0.01, 8.00).name("Redestribution");
    gui.add(this.effectController, 'lacunarity', 1.00, 8.00).name("Lacunarity");
    gui.add(this.effectController, 'persistance', 0.01, 0.99).name("Persistance");
    gui.add(this.effectController, 'layer', 1, 16).step(1).name("Layer");
  }

  initRenderQueue() {
    this.noiseGenerationPass = new RC.RenderPass(
      // Rendering pass type
      RC.RenderPass.BASIC,

      // Initialize function
      function(textureMap, additionalData) {},

      // Preprocess function
      (textureMap, additionalData) => {
        return {scene: this.noiseScene, camera: this.noiseCamera};
      },

      function(textureMap, additionalData) {},

      // Target
      RC.RenderPass.SCREEN,

      // Viewport
      {width: 1024, height: 1024},

      // Bind depth texture to this ID
      "Depth",
      [{
        id: "noiseTex",
        textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG
      }]
    );

    this.renderQueue = new RC.RenderQueue(this.renderer);
    this.renderQueue.pushRenderPass(this.noiseGenerationPass);
  }

  update() {
    this.calculateFps();
    this.resize();

    // Calculate delta time and update timestamps
    this.currTime = new Date();
    this.dt = (this.prevTime !== -1) ? this.currTime - this.prevTime : 0;
    this.prevTime = this.currTime;

    this.updateParameters();

    this.render();
		window.requestAnimationFrame(() => {this.update()});
  }

  render() {
    this.renderQueue.render();
  }

  resize() {
    // Make the canvas the same size
    this.canvas.width  = window.innerWidth / 2;
    this.canvas.height = this.canvas.width;

    // Update camera aspect ratio and renderer viewport
    this.noiseCamera.aspect = 1;
    this.renderer.updateViewport(this.canvas.width, this.canvas.height);

    this.noiseGenerationPass.viewport = { width: this.canvas.width, height: this.canvas.height };
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

  updateParameters() {
    let currrentResolution = this.objects[0].material.getUniform("resolution");
    if(currrentResolution != this.effectController.resolution) {
      this.objects[0].material.setUniform("resolution", this.effectController.resolution);
    }

    let currentFrequency = this.objects[0].material.getUniform("frequency");
    if(currrentResolution != this.effectController.frequency) {
      this.objects[0].material.setUniform("frequency", this.effectController.frequency);
    }

    let currentScale = this.objects[0].material.getUniform("scale");
    if(currentScale != this.effectController.scale) {
      this.objects[0].material.setUniform("scale", this.effectController.scale);
    }

    let currentOffsetX = this.objects[0].material.getUniform("offsetX");
    if(currentOffsetX != this.effectController.offsetX) {
      this.objects[0].material.setUniform("offsetX", this.effectController.offsetX);
    }

    let currentOffsetY = this.objects[0].material.getUniform("offsetY");
    if(currentOffsetY != this.effectController.offsetY) {
      this.objects[0].material.setUniform("offsetY", this.effectController.offsetY);
    }

    let currentRedestribution = this.objects[0].material.getUniform("redestribution");
    if(currentRedestribution != this.effectController.redestribution) {
      this.objects[0].material.setUniform("redestribution", this.effectController.redestribution);
    }

    let currentLacunarity = this.objects[0].material.getUniform("lacunarity");
    if(currentLacunarity != this.effectController.lacunarity) {
      this.objects[0].material.setUniform("lacunarity", this.effectController.lacunarity);
    }

    let currentPersitance = this.objects[0].material.getUniform("persistance");
    if(currentRedestribution != this.effectController.persistance) {
      this.objects[0].material.setUniform("persistance", this.effectController.persistance);
    }

    let currentLayer = this.objects[0].material.getUniform("layer");
    if(currentLayer != this.effectController.layer) {
      this.objects[0].material.setUniform("layer", this.effectController.layer);
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
