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
        
		const cnv = new RC.Canvas();
		cnv.canvasDOM = canvas;

		this.renderer = new RC.MeshRenderer(cnv, RC.WEBGL2, {antialias: true});
		this.renderer.clearColor = '#336699ff';
		this.renderer.addShaderLoaderUrls('../../../src/shaders');

		this.icoSphereOne = new RC.IcoSphere(4, 1, 0.5, new RC.Color(0.0, 1.0, 0.0), false);
		this.icoSphereTwo = new RC.IcoSphere(4, 2, 0.5, new RC.Color(0.0, 1.0, 0.0), false);
		this.icoSphereThree = new RC.IcoSphere(4, 3, 0.5, new RC.Color(0.0, 1.0, 0.0), false);
		this.icoSphereFour = new RC.IcoSphere(4, 4, 0.5, new RC.Color(0.0, 1.0, 0.0), false);
		this.icoSphereFive = new RC.IcoSphere(4, 5, 0.5, new RC.Color(0.0, 1.0, 0.0), false);
		this.icoSphereSix = new RC.IcoSphere(4, 6, 0.5, new RC.Color(0.0, 1.0, 0.0), false);

		this.icoSphereTexture = new RC.IcoSphere(4, 6, 0.5, new RC.Color(0.0, 1.0, 0.0), false);
		
		var d1Light = new RC.DirectionalLight(new RC.Color(1, 1, 1), 1.0);
		d1Light.position = new RC.Vector3(1,0,0);

		var d2Light = new RC.DirectionalLight(new RC.Color(1, 1, 1), 1.0);
		d2Light.position = new RC.Vector3(0,1,0);

		var d3Light = new RC.DirectionalLight(new RC.Color(1, 1, 1), 1.0);
		d3Light.position = new RC.Vector3(0,0,1);

		this.icoSphereOne.position = new RC.Vector3(0,0,0);
		this.icoSphereTwo.position = new RC.Vector3(8,0,0);
		this.icoSphereThree.position = new RC.Vector3(16,0,0);
		this.icoSphereFour.position = new RC.Vector3(24,0,0);
		this.icoSphereFive.position = new RC.Vector3(32,0,0);
		this.icoSphereSix.position = new RC.Vector3(40,0,0);
		this.icoSphereTexture.position = new RC.Vector3(48,0,0);

		let material = new RC.MeshPhongMaterial();
		this.icoSphereOne.material = material;
		this.icoSphereTwo.material = material;
		this.icoSphereThree.material = material;
		this.icoSphereFour.material = material;
		this.icoSphereFive.material = material;
		this.icoSphereSix.material = material;

		this.scene.add(d1Light);
		this.scene.add(d2Light);
		this.scene.add(d3Light);

		this.scene.add(this.icoSphereOne);
		this.scene.add(this.icoSphereTwo);
		this.scene.add(this.icoSphereThree);
		this.scene.add(this.icoSphereFour);
		this.scene.add(this.icoSphereFive);
		this.scene.add(this.icoSphereSix);
		this.scene.add(this.icoSphereTexture);


		this.icoSphereTexture.rotation.x += 1.4;
		this.icoSphereTexture.rotation.z += 2;
		
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
			this.icoSphereTexture.material = material;

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

		this.icoSphereOne.rotation.x += 0.01;
		this.icoSphereOne.rotation.y += 0.01;
		
		this.icoSphereTwo.rotation.x += 0.01;
		this.icoSphereTwo.rotation.y += 0.01;
		
		this.icoSphereThree.rotation.x += 0.01;
		this.icoSphereThree.rotation.y += 0.01;
		
		this.icoSphereFour.rotation.x += 0.01;
		this.icoSphereFour.rotation.y += 0.01;

		this.icoSphereFive.rotation.x += 0.01;
		this.icoSphereFive.rotation.y += 0.01;
		
		this.icoSphereSix.rotation.x += 0.01;
        this.icoSphereSix.rotation.y += 0.01;
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