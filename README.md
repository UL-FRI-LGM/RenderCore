# RenderCore
A lightweight deffered rendering WebGL 2.0 framework in JavaScript.


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
