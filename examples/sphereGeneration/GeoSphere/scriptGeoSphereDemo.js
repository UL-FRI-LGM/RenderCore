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
        
		this.renderer = new RC.MeshRenderer(this.canvas, RC.WEBGL2, {antialias: true});
		this.renderer.clearColor = '#336699ff';
		this.renderer.addShaderLoaderUrls('../../../src/shaders');


		this.geoSphereOne = new RC.GeoidSphere(4, 2, 2, 0.5, new RC.Color(0.0, 1.0, 0.0));
		this.geoSphereTwo = new RC.GeoidSphere(4, 4, 4, 0.5, new RC.Color(0.0, 1.0, 0.0));
		this.geoSphereThree = new RC.GeoidSphere(4, 8, 8, 0.5, new RC.Color(0.0, 1.0, 0.0));
		this.geoSphereFour = new RC.GeoidSphere(4, 16, 16, 0.5, new RC.Color(0.0, 1.0, 0.0));
		this.geoSphereFive = new RC.GeoidSphere(4, 32, 32, 0.5, new RC.Color(0.0, 1.0, 0.0));
		this.geoSphereSix = new RC.GeoidSphere(4, 64, 64, 0.5, new RC.Color(0.0, 1.0, 0.0));

		this.geoSphereTexture = new RC.GeoidSphere(4, 64, 64, 0.5, new RC.Color(0.0, 1.0, 0.0));
		
		var d1Light = new RC.DirectionalLight(new RC.Color(1, 1, 1), 1.0);
		d1Light.position = new RC.Vector3(1,0,0);

		var d2Light = new RC.DirectionalLight(new RC.Color(1, 1, 1), 1.0);
		d2Light.position = new RC.Vector3(0,1,0);

		var d3Light = new RC.DirectionalLight(new RC.Color(1, 1, 1), 1.0);
		d3Light.position = new RC.Vector3(0,0,1);

		this.geoSphereOne.position = new RC.Vector3(0,0,0);
		this.geoSphereTwo.position = new RC.Vector3(8,0,0);
		this.geoSphereThree.position = new RC.Vector3(16,0,0);
		this.geoSphereFour.position = new RC.Vector3(24,0,0);
		this.geoSphereFive.position = new RC.Vector3(32,0,0);
		this.geoSphereSix.position = new RC.Vector3(40,0,0);
		this.geoSphereTexture.position = new RC.Vector3(48,0,0);

		let material = new RC.MeshPhongMaterial();
		this.geoSphereOne.material = material;
		this.geoSphereTwo.material = material;
		this.geoSphereThree.material = material;
		this.geoSphereFour.material = material;
		this.geoSphereFive.material = material;
		this.geoSphereSix.material = material;

		this.scene.add(d1Light);
		this.scene.add(d2Light);
		this.scene.add(d3Light);

		this.scene.add(this.geoSphereOne);
		this.scene.add(this.geoSphereTwo);
		this.scene.add(this.geoSphereThree);
		this.scene.add(this.geoSphereFour);
		this.scene.add(this.geoSphereFive);
		this.scene.add(this.geoSphereSix);
		this.scene.add(this.geoSphereTexture);
		
		this.camera.position.z = 5;
		
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
			this.geoSphereTexture.material = material;

			window.requestAnimationFrame(() => {this.render()});
		});
	}

	render() {
		this.renderer.render(this.scene, this.camera);
		window.requestAnimationFrame(() => {this.render()});
		
		keyboardTranslation.reset();
        keyboardRotation.reset();
		keyboardInput.update();	

		
        this.camera.translateX(keyboardTranslation.x * 0.5);
        this.camera.translateY(keyboardTranslation.y * 0.5);
        this.camera.translateZ(keyboardTranslation.z * 0.5);

        this.camera.rotateX(keyboardRotation.x * 0.5);
        this.camera.rotateY(keyboardRotation.y * 0.5);
		this.camera.rotateZ(keyboardRotation.z * 0.5);

		this.geoSphereOne.rotation.x += 0.01;
		this.geoSphereOne.rotation.y += 0.01;
		
		this.geoSphereTwo.rotation.x += 0.01;
		this.geoSphereTwo.rotation.y += 0.01;
		
		this.geoSphereThree.rotation.x += 0.01;
		this.geoSphereThree.rotation.y += 0.01;
		
		this.geoSphereFour.rotation.x += 0.01;
		this.geoSphereFour.rotation.y += 0.01;

		this.geoSphereFive.rotation.x += 0.01;
		this.geoSphereFive.rotation.y += 0.01;
		
		this.geoSphereSix.rotation.x += 0.01;
        this.geoSphereSix.rotation.y += 0.01;
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
var keyboardTranslation = {x: 0, y: 0, z: 0, reset: function() { this.x = 0; this.y = 0; this.z = 0; }};

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

	if (pressedKeys.has(89)) {  // Y - Upward
		keyboardTranslation.y = 1;
	}

	if (pressedKeys.has(88)) {  // X - Downward
		keyboardTranslation.y = -1;
	}
});

document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.querySelector('canvas');
	const app = window.app = new App(canvas);
});