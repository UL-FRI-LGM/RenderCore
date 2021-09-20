import * as RC from '../../src/RenderCore.js'

let objects;
let renderer, camera, scene;
let manager, loaderObj, loaderTexture;

init();
loadResources();

function init() {
  const canvas = new RC.Canvas();
  canvas.canvasDOM = document.getElementById("canvas");

  // Initialize renderer
  renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
  renderer.clearColor = "#000000FF";
  renderer.addShaderLoaderUrls("../../src/shaders");

  // Camera initialization
  camera = new RC.PerspectiveCamera(1.483, 16/9, 10, 10000);
  camera.position = new RC.Vector3(0, 0, 80);

  scene = new RC.Scene();

  // Initialize lights and add them to the scene
  let aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 1.0);
  scene.add(aLight);

  // Initialize object loader, texture(image) loader and load the objects
  manager = new RC.LoadingManager();
  loaderObj = new RC.ObjLoader(manager);
  loaderTexture = new RC.ImageLoader(manager);
}

function loadResources() {
  let texture;

  loaderTexture.load("../common/textures/crate.gif", function ( image ) {
    texture = new RC.Texture(image, RC.Texture.ClampToEdgeWrapping, RC.Texture.ClampToEdgeWrapping,
                                RC.Texture.LinearFilter, RC.Texture.LinearFilter,
                                RC.Texture.RGBA, RC.Texture.RGBA, RC.Texture.UNSIGNED_BYTE, 256, 256);
    loadObjects();
  });



  function loadObjects() {
    loaderObj.load("../common/models/cube.obj", function ( obj ) {
      objects = obj;
      for (let i = 0; i < obj.length; i++) {
          obj[i].position.z = 0;

          // Create material and apply texture
          let material = new RC.MeshPhongMaterial();
          material.addMap(texture);
          obj[i].material = material;

          scene.add(obj[i]);
        }

      // Start rendering
      animate();
    });
  }
}

let prevTime = -1, currTime, dt;
function animate() {
    requestAnimationFrame(animate);
    calculateFps();

    // Calculate delta time and update timestamps
    currTime = new Date();
    dt = (prevTime !== -1) ? currTime - prevTime : 0;
    prevTime = currTime;

    objects[0].rotationX += 0.005;
    objects[0].rotationY += 0.01;

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
        document.getElementById("fps").innerHTML = Number(fps * 1000.0 / (timeNow - timeLast)).toPrecision( 5 );

        //reset
        timeLast = timeNow;
        fps = 0;
    }
}
