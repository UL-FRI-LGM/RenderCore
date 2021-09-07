import * as RC from '../RenderCore.js';

export class SkyDome {
    // sphereType: 0-GeoSphere 1-IcoSphere
    constructor(texture, camera, radius = camera.far, subdivision, color = new RC.Color(1,1,1), sphereType = 0, scene) {
      this.texture = texture;
      this.camera = camera;

      this.radius = radius;
      this.color = color;

      if (sphereType == 0){
        if (typeof subdivision === undefined){
            this.subdivision = 32;
        }else{
            this.subdivision = subdivision;
        }
      }else if (sphereType == 1){
        if (typeof subdivision === undefined){
            this.subdivision = 4;
        }else{
            this.subdivision = subdivision;
        }
      }

      this.frontFaceClockwise = false;

      if (sphereType == 0){
        this.mySkyDome = new RC.GeoidSphere(this.radius, this.subdivision, this.subdivision, 0.5, this.color,);
      }else{
        this.mySkyDome = new RC.IcoSphere(this.radius, this.subdivision, 0.5, this.color, this.frontFaceClockwise);
      }

      if (typeof this.scene != undefined){
        this.scene = scene;
      }

      let material = new RC.MeshPhongMaterial();
			material.addMap(this.texture);
      this.mySkyDome.material = material;

      this.type = "SkyDome";
    }

    get GetCamera() {
      return this.camera;
    }

    get GetMySkyDome(){
      return this.mySkyDome;
    }

    get GetScene(){
      return this.scene;
    }
}