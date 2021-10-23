import * as RC from '../../src/RenderCore.js'

let objects, renderer, camera, scene;
let manager, loaderObj, loaderTexture;
let keyboardRotation, keyboardTranslation, keyboardInput;
let effectController;

let aLight, dLight, pLight, sLight;

init();

function init() {
  const canvas = new RC.Canvas();
  canvas.canvasDOM = document.getElementById("canvas");

  // Initialize renderer
  renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
  renderer.clearColor = "#000000FF";
  renderer.addShaderLoaderUrls("../../src/shaders");

  // Camera initialization
  camera = new RC.PerspectiveCamera(1.483, 16 / 9, 10, 10000);
  camera.position = new RC.Vector3(0, 8, 80);
  camera.lookAt(new RC.Vector3(0, 0.5, 0), new RC.Vector3(0, 1, 0));

  // Create scene
  scene = new RC.Scene();

  // Initialize lights and add them to the scene
  aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 0.1);
  scene.add(aLight);

  dLight = new RC.DirectionalLight(new RC.Color("#FF0000"), 0.5);
  dLight.rotation = new RC.Euler(-1.3, -1.2, 0.0);
  scene.add(dLight);

  pLight = new RC.PointLight(new RC.Color("#0000FF"), 0.5);
  pLight.position = new RC.Vector3(0.0, 1.0, 1.0);
  scene.add(pLight);

  sLight = new RC.SpotLight(new RC.Color("#0000FF"), 0.5);
  sLight.position = new RC.Vector3(0.0, 1.5, 0.0);
  sLight.rotation = new RC.Euler(-Math.PI/2, 0.0, 0.0);
  scene.add(sLight);

  const plane = new RC.Quad({x: -32, y: 32}, {x: 32, y: -32});
  plane.material = new RC.MeshPhongMaterial();
  plane.material.emissive = new RC.Color(0, 0, 0);
  plane.material.color = new RC.Color(1.0, 1.0, 1.0);
  plane.material.specular = new RC.Color(0.8, 0.8, 0.8);
  plane.material.shininess = 32;
  plane.rotateX(-Math.PI/2);
  scene.add(plane);

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

      const material = new RC.MeshPhongMaterial();
      material.emissive = new RC.Color(0, 0, 0);
      material.color = new RC.Color(0.5, 0.5, 0.5);
      material.specular = new RC.Color(0.8, 0.8, 0.8);
      material.shininess = 16;
      obj[i].material = material;
      obj[i].position = new RC.Vector3(0.0, 0.0, 0.0);

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
  camera.translateZ(keyboardTranslation.z * dt * 0.008);

  for (let i = 0; i < objects.length; i++) {
    objects[i].rotateX(keyboardRotation.x * dt * 0.001);
    objects[i].rotateY(keyboardRotation.y * dt * 0.001);
    objects[i].rotateZ(keyboardRotation.z * dt * 0.001);
  }
}

function updateParameters() {
  aLight.intensity = effectController.aIntensity;
  aLight.color = new RC.Color(effectController.aColor);

  dLight.intensity = effectController.lIntensity;
  dLight.color = new RC.Color(effectController.lColor);
  dLight.rotation = new RC.Euler(effectController.lX, effectController.lY, effectController.lZ);

  pLight.intensity = effectController.plIntensity;
  pLight.color = new RC.Color(effectController.plColor);
  pLight.position = new RC.Vector3(effectController.plpX, effectController.plpY, effectController.plpZ);

  sLight.intensity = effectController.slIntensity;
  sLight.color = new RC.Color(effectController.slColor);
  sLight.position = new RC.Vector3(effectController.slpX, effectController.slpY, effectController.slpZ);
  sLight.rotation = new RC.Euler(effectController.slX, effectController.slY, effectController.slZ);

  objects[0].material.color = new RC.Color(effectController.mColor);
  objects[0].material.shininess = effectController.mShininess;

  effectController.wireframe ? objects[0].geometry.drawWireframe = true : objects[0].geometry.drawWireframe = false;
}

function setUpGui() {
  effectController = {
    aIntensity: 0.1,
    aColor: "#FFFFFF",

    lIntensity: 0.5,
    lColor: "#FF0000",
    lX: -1.3,
    lY: -1.2,
    lZ: 0.0,

    plIntensity: 0.5,
    plColor: "#0000FF",
    plpX: 0.0,
    plpY: 1.0,
    plpZ: 1.0,

    slIntensity: 0.5,
    slColor: "#FFFFFF",
    slpX: 0.0,
    slpY: 1.5,
    slpZ: 0.0,
    slX: -Math.PI/2,
    slY: 0.0,
    slZ: 0.0,

    mColor: "#ffffff",
    mShininess: 32.0,

    wireframe: false
  };

  
  let gui = new dat.GUI();

  const LIGHTS = gui.addFolder("Lights");

  const al = LIGHTS.addFolder("Ambients light");
  al.add(effectController, "aIntensity", 0.0, 1.0).name("Intensity");
  al.addColor(effectController, "aColor").name("Color");

  const dl = LIGHTS.addFolder("Direction light");
  dl.add(effectController, "lIntensity", 0.0, 1.0).name("Intensity");
  dl.addColor(effectController, "lColor").name("Color");

  const dld = dl.addFolder("Light rotation");
  dld.add(effectController, "lX", -10.0, 10.0).name("X axis");
  dld.add(effectController, "lY", -10.0, 10.0).name("Y axis");
  dld.add(effectController, "lZ", -10.0, 10.0).name("Z axis");

  const pl = LIGHTS.addFolder("Point light");
  pl.add(effectController, "plIntensity", 0.0, 1.0).name("Intensity");
  pl.addColor(effectController, "plColor").name("Color");
  const plp = pl.addFolder("Light position");
  plp.add(effectController, "plpX", -2.0, 2.0).name("X axis");
  plp.add(effectController, "plpY", -2.0, 2.0).name("Y axis");
  plp.add(effectController, "plpZ", -2.0, 2.0).name("Z axis");

  const sl = LIGHTS.addFolder("Spot light");
  sl.add(effectController, "slIntensity", 0.0, 1.0).name("Intensity");
  sl.addColor(effectController, "slColor").name("Color");

  const slp = sl.addFolder("Light position");
  slp.add(effectController, "slpX", -2.0, 2.0).name("X axis");
  slp.add(effectController, "slpY", -2.0, 2.0).name("Y axis");
  slp.add(effectController, "slpZ", -2.0, 2.0).name("Z axis");

  const dsl = sl.addFolder("Light rotation");
  dsl.add(effectController, "slX", -10.0, 10.0).name("X axis");
  dsl.add(effectController, "slY", -10.0, 10.0).name("Y axis");
  dsl.add(effectController, "slZ", -10.0, 10.0).name("Z axis");

  const m = gui.addFolder("Material");
  m.addColor(effectController, "mColor").name("Color");
  m.add(effectController, "mShininess", 1.0, 400.0, 1.0).name("Shininess");
  m.add(effectController, "wireframe").name("Wireframe");
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
