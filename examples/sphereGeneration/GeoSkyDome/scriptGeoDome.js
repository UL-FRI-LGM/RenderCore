import * as RC from '../../../src/RenderCore.js'

class App {

	constructor(canvas) {
		window.RC = RC;
		window.App = this;

		window.addEventListener("resize", () => {this.resize();}, false);

		this.canvas = canvas;

		this.scene = new RC.Scene();

        this.camera = new RC.PerspectiveCamera(75, this.canvas.width/this.canvas.height, 0.1, 1000.0);
		this.camera.position = new RC.Vector3(0, 0, 1000);
		this.camera.position.z = 0;
        
		const cnv = new RC.Canvas();
		cnv.canvasDOM = canvas;

		this.renderer = new RC.MeshRenderer(cnv, RC.WEBGL2, {antialias: true});
		this.renderer.clearColor = '#336699ff';
		this.renderer.addShaderLoaderUrls('../../../src/shaders');
		
		var d1Light = new RC.DirectionalLight(new RC.Color(.3, .6, .9), 1.0);
		d1Light.position = new RC.Vector3(1,0,0);

		var d2Light = new RC.DirectionalLight(new RC.Color(.3, .6, .9), 1.0);
		d2Light.position = new RC.Vector3(0,1,0);

		var d3Light = new RC.DirectionalLight(new RC.Color(.3, .6, .9), 1.0);
		d3Light.position = new RC.Vector3(0,0,1);

		var d4Light = new RC.DirectionalLight(new RC.Color(1, 1, 1), 1.0);
		d4Light.position = new RC.Vector3(-1,0,0);

		var d5Light = new RC.DirectionalLight(new RC.Color(1, 1, 1), 1.0);
		d5Light.position = new RC.Vector3(0,-1,0);

		var d6Light = new RC.DirectionalLight(new RC.Color(1, 1, 1), 1.0);
		d6Light.position = new RC.Vector3(0,0,-1);

		
		this.scene.add(d1Light);
		this.scene.add(d2Light);
		this.scene.add(d3Light);
		this.scene.add(d4Light);
		this.scene.add(d5Light);
		this.scene.add(d6Light);
		


		this.loadResources();


		this.resize();
	}

	loadResources() {
		this.manager = new RC.LoadingManager();
		this.textureLoader = new RC.ImageLoader(this.manager);

		this.textureLoader.load("../../common/textures/sunset.jpg", (image) => {
			this.texture = new RC.Texture(image, RC.Texture.ClampToEdgeWrapping, RC.Texture.ClampToEdgeWrapping,
				RC.Texture.LinearFilter, RC.Texture.LinearFilter,
				RC.Texture.RGBA, RC.Texture.RGBA, RC.Texture.UNSIGNED_BYTE);
			let material = new RC.MeshPhongMaterial();
			material.addMap(this.texture);

			console.log(this.texture);
			this.instanceOfClassSkyDome = new RC.SkyDome(this.texture, this.camera, 20, 32, new RC.Color(1,1,1), 0, undefined);

			this.scene.add(this.instanceOfClassSkyDome.GetCamera);
			this.scene.add(this.instanceOfClassSkyDome.GetMySkyDome);
			
			window.requestAnimationFrame(() => {this.render()});
		});
	}

	render() {
		this.renderer.render(this.scene, this.camera);
		window.requestAnimationFrame(() => {this.render()});
		
        keyboardRotation.reset();
		keyboardInput.update();	

		this.camera.rotateX(keyboardRotation.x * 0.01);
		this.camera.rotateY(keyboardRotation.y * 0.01);
		this.camera.rotateZ(keyboardRotation.z * 0.01);
	}
 
	resize() {
		// Make the canvas the same size
		this.canvas.width  = window.innerWidth;
		this.canvas.height = window.innerHeight;

		// Update camera aspect ratio and renderer viewport
		this.camera.aspect = this.canvas.width / this.canvas.height;
		this.renderer.updateViewport(this.canvas.width, this.canvas.height);
	}
}

// region Setup keyboard
var keyboardRotation = {x: 0, y: 0, z: 0, reset: function() { this.x = 0; this.y = 0; this.z = 0; }};

var keyboardInput = RC.KeyboardInput.instance; 

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

	if (pressedKeys.has(69)) {  // E
		keyboardRotation.z = -1;
	}
});

document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.querySelector('canvas');
	const app = window.app = new App(canvas);
});