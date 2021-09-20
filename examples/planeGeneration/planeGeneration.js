import * as RC from '../../src/RenderCore.js'

let objects = [];
let renderer, camera, scene;
let manager, loaderObj, loaderTexture;
let effectController;

function init() {
  const canvas = new RC.Canvas();
  canvas.canvasDOM = document.getElementById("canvas");

  // Initialize renderer
  renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
  renderer.clearColor = "#000000FF";
  renderer.addShaderLoaderUrls("../../src/shaders");

  // Camera initialization
  camera = new RC.PerspectiveCamera(1.483, 16/9, 10, 10000);
  camera.position = new RC.Vector3(0, 0, 0);

  scene = new RC.Scene();

  // Initialize lights and add them to the scene
  let aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 1.0);
  scene.add(aLight);

  // Initialize object loader, texture(image) loader and load the objects
  manager = new RC.LoadingManager();
  loaderObj = new RC.ObjLoader(manager);
  loaderTexture = new RC.ImageLoader(manager);

  //Init render object
  let plane = generatePlane(1, 1, 1, 1, new RC.MeshPhongMaterial(), undefined);
  scene.add(plane);
  objects.push(plane);

  // Initialize GUI
  setUpGui();

  // Render
  animate();
}

function setUpGui() {
  effectController = {
					width: 1,
					height: 1,
					widthSegments: 1,
					heightSegments: 1
				};

  let gui = new dat.GUI();
  gui.add(effectController, 'width', 1, 50).step(1).name("Width");
  gui.add(effectController, 'height', 1, 30).step(1).name("Height");
  gui.add(effectController, 'widthSegments', 1, 50).step(1).name("Width segments");
  gui.add(effectController, 'heightSegments', 1, 50).step(1).name("Height segments");
}

let prevTime = -1, currTime, dt;
function animate() {
    requestAnimationFrame(animate);
    calculateFps();

    // Calculate delta time and update timestamps
    currTime = new Date();
    dt = (prevTime !== -1) ? currTime - prevTime : 0;
    prevTime = currTime;

    updateParameters();

    renderer.render(scene, camera);
}

function updateParameters() {
  if(objects[0]._width != effectController.width ||
      objects[0]._height != effectController.height ||
       objects[0]._widthSegment != effectController.widthSegments ||
        objects[0]._heightSegment != effectController.heightSegments) {
          scene.remove(objects[0]);

          let plane = generatePlane(effectController.width, effectController.height,
                        effectController.widthSegments, effectController.heightSegments);

          objects[0] = plane;
          scene.add(plane);
        }
}

function generatePlane(width, height, widthSegment, heightSegment) {
  let plane = new RC.TerrainPlane(width, height, widthSegment, heightSegment, new RC.MeshPhongMaterial(), undefined);
  plane.rotationY = Math.degToRad(180);

  plane.translateX(-plane._width / 2);
  plane.translateY(-plane._height / 2);
  plane.translateZ(1200);

  plane.rotationX = Math.degToRad(90);

  plane.geometry.drawWireframe = true;

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

init()
