import * as RC from '../../src/RenderCore.js'

class App {

	constructor(canvas) {
		window.RC = RC;
		window.App = this;

		window.addEventListener("resize", () => {this.resize();}, false);

		this.canvas = canvas;

		const cnv = new RC.Canvas();
		cnv.canvasDOM = canvas;

		this.renderer = new RC.MeshRenderer(cnv, RC.WEBGL2, {antialias: true});
		this.renderer.clearColor = '#336699ff';
		this.renderer.addShaderLoaderUrls('../../src/shaders');

		this.initScenes();

		this.renderQueue = this.initRenderQueue();

		this.resize();
		window.requestAnimationFrame(() => {this.update()});
	}

	initScenes() {
		this.firstScene = new RC.Scene();

		this.light = new RC.DirectionalLight(new RC.Color(0.9, 0.6, 0.3), 1.0);
		this.light.position = new RC.Vector3(1,0,0);

		this.cube = new RC.Cube(1, new RC.Color(1.0, 1.0, 1.0));
		this.cube.material = new RC.MeshPhongMaterial();
		this.cube.material.color = new RC.Color(0xff22ff);
		this.firstScene.add(this.light);
		this.firstScene.add(this.cube);

		this.firstCamera = new RC.PerspectiveCamera(75, this.canvas.width/this.canvas.height, 0.1, 1000.0);
		this.firstCamera.position = new RC.Vector3(0, 0, 8);


		this.secondScene = new RC.Scene();

		this.secondLight = new RC.DirectionalLight(new RC.Color(0.9, 0.6, 0.3), 1.0);
		this.secondLight.position = new RC.Vector3(1,0,0);

		this.quad = new RC.Quad(new RC.Vector2(-2.0, -2.0), new RC.Vector2(2.0, 2.0), new RC.MeshBasicMaterial(), undefined, true);
		// this.quad.translateX(5.0);
		// this.secondScene.add(this.secondLight);
		this.secondScene.add(this.quad);

		// this.secondCamera = new RC.PerspectiveCamera(75, this.canvas.width/this.canvas.height, 0.1, 1000.0);
		this.secondCamera = new RC.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
		this.secondCamera.position = new RC.Vector3(0, 0, 8);
	}

	initRenderQueue() {
		this.firstPass = new RC.RenderPass(
			RC.RenderPass.BASIC,
			(textureMap, additionalData) => {},
			(textureMap, additionalData) => {
				return {scene: this.firstScene, camera: this.firstCamera};
			},
			(textureMap, additionalData) => {},
			RC.RenderPass.TEXTURE,
			{width: 512, height: 512},
			"depthTexture",
			[{
				id: "color",
				textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG
			}]
		);

		this.secondPass = new RC.RenderPass(
			RC.RenderPass.BASIC,
			(textureMap, additionalData) => {
				this.quad.material.clearMaps();
				this.quad.material.addMap(textureMap.color);
			},
			(textureMap, additionalData) => {
				return {scene: this.secondScene, camera: this.secondCamera};
			},
			(textureMap, additionalData) => {},
			RC.RenderPass.SCREEN,
			{width: this.canvas.width, height: this.canvas.height}
		);

		let renderQueue = new RC.RenderQueue(this.renderer);
		renderQueue.pushRenderPass(this.firstPass);
		renderQueue.pushRenderPass(this.secondPass);

		return renderQueue;
	}

	update() {
		this.light._position.x = (this.light._position.x + 10 + 0.05) % 20 - 10;
		this.light._position.y = (this.light._position.y + 10 + 0.05) % 20 - 10;
		this.light._position.z = (this.light._position.z + 10 + 0.05) % 20 - 10;
		this.light.updateMatrix();

		this.secondLight._position.x = (this.secondLight._position.x + 10 + 0.05) % 20 - 10;
		this.secondLight._position.y = (this.secondLight._position.y + 10 + 0.05) % 20 - 10;
		this.secondLight._position.z = (this.secondLight._position.z + 10 + 0.05) % 20 - 10;
		this.secondLight.updateMatrix();

		this.cube.rotateX(0.01);
		this.cube.rotateY(0.005);

		this.quad.rotateZ(0.02);

		this.render();
		window.requestAnimationFrame(() => {this.update()});
	}

	render() {
		this.renderQueue.render();
		// this.renderer.render(this.firstScene, this.firstCamera);
		// this.renderer.render(this.secondScene, this.secondCamera);
	}

	resize() {
		// Make the canvas the same size
		this.canvas.width  = window.innerWidth;
		this.canvas.height = window.innerHeight;

		this.secondPass.viewport = {width: this.canvas.width, height: this.canvas.height};

		// Update camera aspect ratio and renderer viewport
		this.firstCamera.aspect = this.canvas.width / this.canvas.height;
		this.secondCamera.aspect = this.canvas.width / this.canvas.height;
		this.renderer.updateViewport(this.canvas.width, this.canvas.height);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.querySelector('canvas');
	const app = window.app = new App(canvas);
});