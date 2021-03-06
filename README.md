# RenderCore
A lightweight deffered rendering WebGL 2.0 framework in JavaScript.


## Basic example

### [Rendering a triangle](https://ul-fri-lgm.github.io/RenderCore/examples/triangleExample/triangleExample.html)
The example code below show a simple way how to set up a scene for rendering a triangle.

```js
const canvas = new RC.Canvas(document.body);

const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
renderer.addShaderLoaderUrls(shaderLocation);

const scene = new RC.Scene();
const camera = new RC.OrthographicCamera(-1, 1, 1, -1, 0, 10);

const geometry = new RC.Geometry({vertices: new RC.Float32Attribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3)});
const material = new RC.MeshBasicMaterial();
const object = new RC.Mesh(geometry, material);
scene.add(object);
```

### [Rendering basic shapes](https://ul-fri-lgm.github.io/RenderCore/examples/basicShapes/basicShapes.html)
The example shows some of the shapes awailable in the framework, how to create, color, and render them.

```js
//mesh (point)
const pointGeometry = new RC.Geometry({vertices: new RC.Float32Attribute([0, 0, 0], 3)});
const point = new RC.Point(pointGeometry);
point.material.pointSize = 64.0;
...

//mesh (line)
const lineGeometry = new RC.Geometry({vertices: new RC.Float32Attribute([-1, -1, 0, 1, 1, 0], 3)});
const line = new RC.Line(lineGeometry);
...

//mesh (triangle)
const triangleGeometry = new RC.Geometry({vertices: new RC.Float32Attribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3)});
const triangle = new RC.Mesh(triangleGeometry);
triangle.material.side = RC.FRONT_AND_BACK_SIDE;
...

//circle
const circle = new RC.Circle();
...

//quad
const quad = new RC.Quad({x: -1, y: 1}, {x: 1, y: -1});
quad.material.side = RC.FRONT_AND_BACK_SIDE;
...

//cube
const cube = new RC.Cube(1.0, new RC.Color());
...
```

### [Rendering textured OBJ model](https://ul-fri-lgm.github.io/RenderCore/examples/texturedCube/texturedCube.html)
The example shows how to load an OBJ model and render it with a texture.

### [Ambient and directional lights and keyboard actions](https://ul-fri-lgm.github.io/RenderCore/examples/directionalLight/directionalLight.html)
The example demonstrates how to use ambient and directional light. The example also shows how to link keyboard interaction.

```js
...
// Initialize lights and add them to the scene
aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 0.1);
scene.add(aLight);

dLight = new RC.DirectionalLight(new RC.Color("#FF0000"), 1.0);
dLight.position = new RC.Vector3(1.0, 0.39, 0.7);
scene.add(dLight);
...
```

### [Light casters](https://ul-fri-lgm.github.io/RenderCore/examples/lightCasters/lightCasters.html)
This example demonstrates how to use different types lights.

```js
const aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 0.1);
scene.add(aLight);

const dLight = new RC.DirectionalLight(new RC.Color("#FF0000"), 0.5);
dLight.rotation = new RC.Euler(-1.3, -1.2, 0.0);
scene.add(dLight);

const pLight = new RC.PointLight(new RC.Color("#0000FF"), 0.5);
pLight.position = new RC.Vector3(0.0, 1.0, 1.0);
scene.add(pLight);

const sLight = new RC.SpotLight(new RC.Color("#FFFFFF"), 0.5);
sLight.position = new RC.Vector3(0.0, 1.5, 0.0);
sLight.rotation = new RC.Euler(-Math.PI/2, 0.0, 0.0);
scene.add(sLight);
```

### [Multipass rendering](https://ul-fri-lgm.github.io/RenderCore/examples/multiPassRendering/multiPassRendering.html)
The example demonstrates how to use ambient and directional light. The example also shows how to link keyboard interaction.

```js
...
// Initialise scenes first
this.initScenes();

// Initialize render Queue
this.renderQueue = this.initRenderQueue();

...
// Example of RenderQueue initialization function
initRenderQueue() {
  // Create first pass
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

  // Create second pass
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

  // Create a RenderQueue and add both render passes to it
  let renderQueue = new RC.RenderQueue(this.renderer);
  renderQueue.pushRenderPass(this.firstPass);
  renderQueue.pushRenderPass(this.secondPass);

  return renderQueue;
}
```

### [Picking](https://ul-fri-lgm.github.io/RenderCore/examples/pickingExample/pickingExample.html)
Here we demonstrates a technique to get a unique identifier of a clicked rendered object.

```js
const canvas = new RC.Canvas(document.body);

const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
renderer.addShaderLoaderUrls(shaderLocation);
const renderQueue = new RC.RenderQueue(renderer);

const scene = new RC.Scene();
const camera = new RC.PerspectiveCamera(75, canvas.width/canvas.height, 0.125, 128);

const picker = new RC.PickerFX(
    renderer, 
    {scene: scene, camera: camera},
    {},
    new RC.FX.output("color_picker")
);
renderQueue.pushRenderQueue(picker);

const MainPass = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.BASIC,
    // Initialize function
    (textureMap, additionalData) => { },
    // Preprocess function
    (textureMap, additionalData) => { return { scene: scene, camera: camera }; },
    // PostprocesWs function
    (textureMap, additionalData) => { },
    // Target
    RC.RenderPass.SCREEN,
    // Viewport
    { width: canvas.width, height: canvas.height },
    // Bind depth texture to this ID
    "depth_main",
    // Outputs
    [{id: "color_main", textureConfig: RC.RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG}]
);
renderQueue.pushRenderPass(MainPass);
```


### [Instancing](https://ul-fri-lgm.github.io/RenderCore/examples/instancingExample/instancingExample.html)
This example show how to draw a lot of models with same set of vertex data. 

```js
const geometry = new RC.Geometry();
geometry.vertices = new RC.Float32Attribute(cubeVertices, 3);
geometry.vertices.divisor = 0;
geometry.computeVertexNormals();
geometry.normals.divisor = 0;

geometry.MMat = new RC.Float32Attribute(instances.reduce((acc, x) => {acc.push(...x.matrix.elements); return acc;}, new Array()), 16);
geometry.MMat.divisor = 1;
geometry.MMat.drawType = RC.BufferAttribute.DRAW_TYPE.DYNAMIC;

const material = new RC.MeshBasicMaterial();
cubeMaterial.emissive.set(0.0, 0.0, 0.0);

const object = new RC.Mesh(geometry, material);
object.position.set(0.0, 0.0, 0.0);
object.scale.set(0.1, 0.1, 0.1);
object.instanced = true;
object.instanceCount = instances.length;

scene.add(cubeObject);
```

### [Instancing translation](https://ul-fri-lgm.github.io/RenderCore/examples/instancingTranslationExample/instancingTranslationExample.html)
This example show how to draw a lot of models with same set of vertex data. 

```js
const spriteGeometry = new RC.SpriteGeometry({baseGeometry: spriteBaseGeometry});
spriteGeometry.vertices.divisor = 0;
spriteGeometry.normals.divisor = 0;

spriteGeometry.translation = new RC.Float32Attribute(spriteTranslations.reduce((acc, x) => {acc.push(...x.toArray()); return acc;}, new Array()), 4);
spriteGeometry.translation.divisor = 1;
spriteGeometry.translation.drawType = RC.BufferAttribute.DRAW_TYPE.DYNAMIC;

const spriteMaterial = new RC.SpriteBasicMaterial({baseGeometry: spriteBaseGeometry, color: new RC.Color(Math.random(), Math.random(), Math.random()), spriteSize: [8, 8], drawCircles: true});
spriteMaterial.emissive.set(0.0, 0.0, 0.0);

const spriteObject = new RC.Sprite({geometry: spriteGeometry, material: spriteMaterial});
spriteObject.position.set(0.0, 0.0, 0.0);
spriteObject.scale.set(0.1, 0.1, 0.1);
spriteObject.instancedTranslation = true;
spriteObject.instanceCount = spriteInstances.length;

scene.add(spriteObject);
```


## External sources
Framework contains some functionalities adopted from [Three.js](https://github.com/mrdoob/three.js/) 3D library.

The list of such functionalities is as follows:
* [src](./src)
  * [loaders/](./src/loaders)
    * [Cache.js](./src/loaders/Cache.js)
    * [ImageLoader.js](./src/loaders/ImageLoader.js)
    * [LoadingManager.js](./src/loaders/LoadingManager.js)
    * [ObjLoader.js](./src/loaders/ObjLoader.js)
    * [XHRLoader.js](./src/loaders/XHRLoader.js)
  * [math/](./src/math)
    * [interpolants/](./src/math/interpolants)
      * [CubicInterpolant.js](./src/math/interpolants/CubicInterpolant.js)
      * [DiscreteInterpolant.js](./src/math/interpolants/DiscreteInterpolant.js)
      * [LinearInterpolant.js](./src/math/interpolants/LinearInterpolant.js)
      * [QuaternionLinearInterpolant.js](./src/math/interpolants/QuaternionLinearInterpolant.js)
    * [Box2.js](./src/math/Box2.js)
    * [Box3.js](./src/math/Box3.js)
    * [Color.js](./src/math/Color.js)
    * [Cylindrical.js](./src/math/Cylindrical.js)
    * [Euler.js](./src/math/Euler.js)
    * [Frustum.js](./src/math/Frustum.js)
    * [Interpolant.js](./src/math/Interpolant.js)
    * [Line3.js](./src/math/Line3.js)
    * [Math.js](./src/math/Math.js)
    * [Matrix3.js](./src/math/Matrix3.js)
    * [Matrix4.js](./src/math/Matrix4.js)
    * [Plane.js](./src/math/Plane.js)
    * [Quaternion.js](./src/math/Quaternion.js)
    * [Ray.js](./src/math/Ray.js)
    * [Sphere.js](./src/math/Sphere.js)
    * [Spherical.js](./src/math/Spherical.js)
    * [SphericalHarmonics3.js](./src/math/SphericalHarmonics3.js)
    * [Triangle.js](./src/math/Triangle.js)
    * [Vector2.js](./src/math/Vector2.js)
    * [Vector3.js](./src/math/Vector3.js)
    * [Vector4.js](./src/math/Vector4.js)
