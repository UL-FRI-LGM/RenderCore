import * as RC from '../../src/RenderCore.js'

let objects, renderer, camera, scene;
let manager, loaderObj, loaderTexture;
let keyboardRotation, keyboardTranslation, keyboardInput;
let effectController;

let aLight, dLight;

init();

function init() {
  // Initialize renderer
  renderer = new RC.MeshRenderer(document.getElementById("canvas"), RC.WEBGL2);
  renderer.clearColor = "#000000FF";
  renderer.addShaderLoaderUrls("../../src/shaders");

  // Camera initialization
  camera = new RC.PerspectiveCamera(1.483, 16 / 9, 10, 10000);
  camera.position = new RC.Vector3(0, 0, 80);

  // Create scene
  scene = new RC.Scene();

  // Initialize lights and add them to the scene
  aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 0.1);
  scene.add(aLight);

  dLight = new RC.DirectionalLight(new RC.Color("#FF0000"), 1.0);
  dLight.position = new RC.Vector3(1.0, 0.39, 0.7);
  scene.add(dLight);

  // Initialize object loader and load the objects
  manager = new RC.LoadingManager();
  loaderObj = new RC.ObjLoader(manager);
  loaderTexture = new RC.ImageLoader(manager);

  // region Setup keyboard
  keyboardRotation = {x: 0, y: 0, z: 0, reset: function() { this.x = 0; this.y = 0; this.z = 0; }};
  keyboardTranslation = {x: 0, y: 0, z: 0, reset: function() { this.x = 0; this.y = 0; this.z = 0; }};

  keyboardInput = RC.KeyboardInput.instance;
  initInputControls();

  // Initialize GUI
  setUpGui();

  loadObjects();
}


function loadObjects() {
  loaderObj.load("../common/models/bunny.obj", function(obj) {
    objects = obj;
    for (let i = 0; i < obj.length; i++) {
      obj[i].position.z = 0;

      let material = new RC.MeshPhongMaterial();
      obj[i].material = material;
      obj[i].position = new RC.Vector3(0.15, -0.8, 0);

      obj[i].geometry.drawWireframe = false;
      scene.add(obj[i]);
    }

    // Start rendering
    animate();
  });
}

let prevTime = -1, currTime, dt;
function animate() {
  requestAnimationFrame(animate);
  calculateFps();

  // Calculate delta time and update timestamps
  currTime = new Date();
  dt = (prevTime !== -1) ? currTime - prevTime : 0;
  prevTime = currTime;

  keyboardTranslation.reset();
  keyboardRotation.reset();
  keyboardInput.update();

  updateObjectPosition();
  updateParameters();

  renderer.render(scene, camera);
}

// FPS calculation
let timeNow = 0, timeLast = 0, fps = 0;
function calculateFps() {
  timeNow = new Date();
  fps++;

  if (timeNow - timeLast >= 1000) {
    //Write value in HTML
    //multiply with 1000.0 / (timeNow - timeLast) for accuracy
    document.getElementById("fps").innerHTML = Number(fps * 1000.0 / (timeNow - timeLast)).toPrecision(5);

    //reset
    timeLast = timeNow;
    fps = 0;
  }
}

function updateObjectPosition() {
  camera.translateX(keyboardTranslation.x * dt * 0.008);
  camera.translateY(keyboardTranslation.y * dt * 0.008);
  camera.translateZ(keyboardTranslation.z * dt * 0.5);

  for (let i = 0; i < objects.length; i++) {
    objects[i].rotateX(keyboardRotation.x * dt * 0.001);
    objects[i].rotateY(keyboardRotation.y * dt * 0.001);
    objects[i].rotateZ(keyboardRotation.z * dt * 0.01);
  }
}

function updateParameters() {
  dLight.intensity = effectController.lIntensity;
  dLight.color = new RC.Color(effectController.lColor);
  dLight.position = new RC.Vector3(effectController.lX, effectController.lY, effectController.lZ);

  objects[0].material.color = new RC.Color(effectController.mColor);
  objects[0].material.shininess = effectController.mShininess;

  aLight.intensity = effectController.aIntensity;
  effectController.wireframe ? objects[0].geometry.drawWireframe = true : objects[0].geometry.drawWireframe = false;
}

function setUpGui() {
  effectController = {
    aIntensity: 0.1,

    lIntensity: 0.8,
    lColor: "#ffffff",
    lX: 1.0,
    lY: 0.39,
    lZ: 0.7,

    mColor: "#ffffff",
    mShininess: 32.0,

    wireframe: true
  };

  let h;
  let gui = new dat.GUI();

  h = gui.addFolder("Light control");
  h.add(effectController, "lIntensity", 0.0, 1.0).name("Intensity");
  h.addColor(effectController, "lColor").name("Color");

  h = gui.addFolder("Light direction");
  h.add(effectController, "lX", -10.0, 10.0).name("X axis");
  h.add(effectController, "lY", -10.0, 10.0).name("Y axis");
  h.add(effectController, "lZ", -10.0, 10.0).name("Z axis");

  h = gui.addFolder("Material control");
  h.addColor(effectController, "mColor").name("Color");
  h.add(effectController, "mShininess", 1.0, 400.0, 1.0).name("Shininess");

  h = gui;
  h.add(effectController, "aIntensity", 0.0, 1.0).name("Ambient intensity");
  h.add(effectController, "wireframe").name("Wireframe");
}

function initInputControls() {
  keyboardInput.addListener(function(pressedKeys) {
    // ROTATIONS
    if (pressedKeys.has(65)) { // A
      keyboardRotation.y = 1;
    }

    if (pressedKeys.has(68)) { // D
      keyboardRotation.y = -1;
    }

    if (pressedKeys.has(87)) { // W
      keyboardRotation.x = 1;
    }

    if (pressedKeys.has(83)) { // S
      keyboardRotation.x = -1;
    }

    if (pressedKeys.has(81)) { // Q
      keyboardRotation.z = 1;
    }

    if (pressedKeys.has(82)) { // R
      keyboardRotation.z = -1;
    }


    // TRANSLATIONS
    if (pressedKeys.has(39)) { // RIGHT - Right
      keyboardTranslation.x = 1;
    }

    if (pressedKeys.has(37)) { // LEFT - Left
      keyboardTranslation.x = -1;
    }

    if (pressedKeys.has(40)) { // DOWN - Backward
      keyboardTranslation.z = 1;
    }

    if (pressedKeys.has(38)) { // UP - Forward
      keyboardTranslation.z = -1;
    }

    if (pressedKeys.has(85)) { // U - Upward
      keyboardTranslation.y = 1;
    }

    if (pressedKeys.has(70)) { // F - Downward
      keyboardTranslation.y = -1;
    }
  });
  // endregion
}
