import * as RC from '../../../src/RenderCore.js'

class App {

	constructor(canvas) {
		window.RC = RC;
		window.App = this;

		window.addEventListener("resize", () => {this.resize();}, false);

		this.canvas = canvas;

		this.scene = new RC.Scene();

        this.camera = new RC.PerspectiveCamera(75, this.canvas.width/this.canvas.height, 0.1, 1000.0);
        this.camera.position = new RC.Vector3(0,0,2.5);
        
		this.renderer = new RC.MeshRenderer(this.canvas, RC.WEBGL2, {antialias: true});
		this.renderer.clearColor = '#336699ff';
		this.renderer.addShaderLoaderUrls('../../../src/shaders');

		this.count = 0;
		this.textureArray = [];
		this.tex_str_arr = ["skybox_nx.jpg", "skybox_ny.jpg", "skybox_nz.jpg", "skybox_px.jpg", "skybox_py.jpg", "skybox_pz.jpg"];
		this.tex_str_arr2 = ["skybox2_nx.jpg", "skybox2_ny.jpg", "skybox2_nz.jpg", "skybox2_px.jpg", "skybox2_py.jpg", "skybox2_pz.jpg"];

		this.loadResources();
		this.resize();
	}

	loadResources() {
		this.manager = new RC.LoadingManager();
		this.textureLoader = new RC.ImageLoader(this.manager);


		for(var i = 0; i < 6; i++){
			var stringPath = "../../common/textures/SkyCube2/" + this.tex_str_arr2[i];

			this.textureLoader.load(stringPath, (image) => {
				this.textureArray.push(new RC.Texture(image, RC.Texture.ClampToEdgeWrapping, RC.Texture.ClampToEdgeWrapping,
					RC.Texture.LinearFilter, RC.Texture.LinearFilter,
					RC.Texture.RGBA, RC.Texture.RGBA, RC.Texture.UNSIGNED_BYTE));
				
					this.staticCount();
			});
		}
	}

	staticCount() {
		this.count ++;
		if(this.count == 6){
			this.instanceOfSkyBox = new RC.SkyBox(this.textureArray, this.camera, 2, new RC.Color(1,1,1), undefined);

			for(var i = 0; i < this.instanceOfSkyBox.GetMySkyBox.length; i++){
				this.scene.add(this.instanceOfSkyBox.GetMySkyBox[i]);
			}
			window.requestAnimationFrame(() => {this.render()});
		}
	}

	render() {
		this.renderer.render(this.scene, this.camera);
		window.requestAnimationFrame(() => {this.render()});

		keyboardTranslation.reset();
		keyboardRotation.reset();
		keyboardInput.update();

		this.camera.rotateX(keyboardRotation.x * 0.03);
		this.camera.rotateY(keyboardRotation.y * 0.03);
		this.camera.rotateZ(keyboardRotation.z * 0.03);

		this.camera.translateX(keyboardTranslation.x * 0.02);
        this.camera.translateY(keyboardTranslation.y * 0.02);
        this.camera.translateZ(keyboardTranslation.z * 0.02);
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