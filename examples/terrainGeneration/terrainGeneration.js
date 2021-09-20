import * as RC from '../../src/RenderCore.js'

let objects = [];
let renderer, camera, scene;
let manager, loaderObj, loaderTexture;
let keyboardRotation, keyboardTranslation, keyboardInput;

function init() {
  const canvas = new RC.Canvas();
  canvas.canvasDOM = document.getElementById("canvas");

  // Initialize renderer
  renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
  renderer.clearColor = "#000000FF";
  renderer.addShaderLoaderUrls("../../src/shaders");

  // Camera initialization
  camera = new RC.PerspectiveCamera(1.483, 16/9, 10, 10000);
  camera.position = new RC.Vector3(0, 80, 0);
  camera.rotateX = Math.degToRad(-30);

  scene = new RC.Scene();

  // Initialize lights and add them to the scene
  let aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 0.0);
  let dLight = new RC.DirectionalLight(new RC.Color("#FFFFFF"), 0.8);
  dLight.position = new RC.Vector3(2.0, 2.0, 1.0);

  scene.add(aLight);
  scene.add(dLight);

  // Initialize object loader, texture(image) loader and load the objects
  manager = new RC.LoadingManager();
  loaderObj = new RC.ObjLoader(manager);
  loaderTexture = new RC.ImageLoader(manager);

  // region Setup keyboard
  keyboardRotation = {x: 0, y: 0, z: 0, reset: function() { this.x = 0; this.y = 0; this.z = 0; }};
  keyboardTranslation = {x: 0, y: 0, z: 0, reset: function() { this.x = 0; this.y = 0; this.z = 0; }};

  keyboardInput = RC.KeyboardInput.instance;
  initInputControls();

  //Init render object
  let plane = generatePlane(200, 200, 100, 100, new RC.MeshPhongMaterial(), undefined);
  scene.add(plane);
  objects.push(plane);

  generateTerrain(plane);

  // Render
  animate();
}

function generateTerrain(plane) {
  loaderTexture.load("../common/textures/perlinNoise.jpg", function ( image ) {
    let imageData = getImageData(image).data;

    let vertices = plane.geometry.vertices.array;
    let texCords = plane.geometry.uv.array;

    for(let y = 0; y <= plane.heightSegment; y++) {
      for(let x = 0; x <= plane.widthSegment; x++) {
        // Get texture cordinate for each pixel
        let u = texCords[(y * (plane.widthSegment + 1) + x) * 2];
        let v = texCords[(y * (plane.widthSegment + 1) + x) * 2 + 1];

        // Get pixel value with texture cordinates
        let texValue = imageData[(Math.floor((image.height - 1) * v) * image.width + Math.floor(image.width * u)) * 4];
        // Convert to range 0 - 1
        texValue = texValue / 255;

        //Displace y cordinate for each vertex with texture value
        vertices[(y * (plane.widthSegment + 1) + x) * 3 + 1] = 50 * texValue;
      }
    }

    // Update vertices
    plane.geometry.vertices.array = vertices;

    // Recalculate normals
    plane.geometry.normals = null;
    plane.geometry.computeVertexNormals();
  });
}

function getImageData(image) {
  let canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  let context = canvas.getContext('2d');
  context.drawImage(image, 0, 0 );

  return context.getImageData(0, 0, image.width, image.height);
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

    camera.translateX(keyboardTranslation.x * dt * 0.1);
    camera.translateY(keyboardTranslation.y * dt * 0.1);
    camera.translateZ(keyboardTranslation.z * dt * 1.0);

    // camera.rotationX += keyboardRotation.x * dt * 0.0001;
    // camera.rotationY += keyboardRotation.y  * dt * 0.0001;
    // camera.rotationZ += keyboardRotation.z * dt * 0.0001;

    objects[0].rotationX += keyboardRotation.x * dt * 0.001;
    objects[0].rotationY += keyboardRotation.y  * dt * 0.0001;
    objects[0].rotationZ += keyboardRotation.z * dt * 0.001;

    renderer.render(scene, camera);
}


function generatePlane(width, height, widthSegment, heightSegment) {
  let plane = new RC.TerrainPlane(width, height, widthSegment, heightSegment, new RC.MeshPhongMaterial(), undefined);
  plane.rotationY = Math.degToRad(180);
  plane.rotationX += Math.degToRad(1);

  plane.translateX(-plane._width / 2);
  plane.translateY(-plane._height / 2);
  plane.translateZ(5000);

  plane.geometry.drawWireframe = false;

  return plane;
}

// FPS calculation
let timeNow = 0, timeLast = 0, fps = 0;
function calculateFps() {
    timeNow = new Date();
    fps++;

    if (timeNow - timeLast >= 1000) {
        //Write value in HTML
        //multiply with 1000.0 / (timeNow - timeLast) for accuracy
        document.getElementById("fps").innerHTML = Number(fps * 1000.0 / (timeNow - timeLast)).toPrecision( 5 );

        //reset
        timeLast = timeNow;
        fps = 0;
    }
}

Math.degToRad = function(degrees) {
  return degrees * Math.PI / 180;
};

function initInputControls() {
  keyboardInput.addListener(function (pressedKeys) {
      // ROTATIONS
      if (pressedKeys.has(65)) {  // A
          keyboardRotation.y = 1;
      }

      if (pressedKeys.has(68)) {  // D
          keyboardRotation.y = -1;
      }

      if (pressedKeys.has(87)) {  // W
          keyboardRotation.x = 1;
      }

      if (pressedKeys.has(83)) {  // S
          keyboardRotation.x = -1;
      }

      if (pressedKeys.has(81)) {  // Q
          keyboardRotation.z = 1;
      }

      if (pressedKeys.has(82)) {  // R
          keyboardRotation.z = -1;
      }


      // TRANSLATIONS
      if (pressedKeys.has(39)) {  // RIGHT - Right
          keyboardTranslation.x = 1;
      }

      if (pressedKeys.has(37)) {  // LEFT - Left
          keyboardTranslation.x = -1;
      }

      if (pressedKeys.has(40)) {  // DOWN - Backward
          keyboardTranslation.z = 1;
      }

      if (pressedKeys.has(38)) {  // UP - Forward
          keyboardTranslation.z = -1;
      }

      if (pressedKeys.has(85)) {  // U - Upward
          keyboardTranslation.y = 1;
      }

      if (pressedKeys.has(70)) {  // F - Downward
          keyboardTranslation.y = -1;
      }
  });
  // endregion
}

init()
