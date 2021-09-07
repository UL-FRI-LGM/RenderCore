import * as RC from '../RenderCore.js'
import {Float32Attribute, Uint32Attribute} from '../core/BufferAttribute.js';

export class SkyBox extends RC.Object3D {
    constructor(textureArray, camera, scale = camera.far, color = new RC.Color(1,1,1), scene) {
      super(RC.Object3D);
      this.textureArray = textureArray;
      this.camera = camera; //new RC.PerspectiveCamera(75, this.canvas.width/this.canvas.height, 0.1, 1000.0);

      var scale = scale;
      this.color = color;

      if (typeof this.scene != undefined){
        this.scene = scene;
      }

      // Get 6 quads
      this.quadUp = new RC.Quad(new RC.Vector2(-scale, -scale), new RC.Vector2(scale, scale), new RC.MeshBasicMaterial());
      this.quadDown = new RC.Quad(new RC.Vector2(-scale, -scale), new RC.Vector2(scale, scale), new RC.MeshBasicMaterial());
      this.quadLeft = new RC.Quad(new RC.Vector2(-scale, -scale), new RC.Vector2(scale, scale), new RC.MeshBasicMaterial());
      this.quadRight = new RC.Quad(new RC.Vector2(-scale, -scale), new RC.Vector2(scale, scale), new RC.MeshBasicMaterial());
      this.quadFront = new RC.Quad(new RC.Vector2(-scale, -scale), new RC.Vector2(scale, scale), new RC.MeshBasicMaterial());
      this.quadBack = new RC.Quad(new RC.Vector2(-scale, -scale), new RC.Vector2(scale, scale), new RC.MeshBasicMaterial());

      //Upper Face
      this.quadUp.geometry.vertices = Float32Attribute(
        [
          -scale, scale, 0, // spodnji desni kot RDEČA
          scale, scale, scale*2, // zgornji levi kot MODRA
          -scale, scale, scale*2, // zgornji desni kot VIJOLČNA
          scale, scale, 0 // spodnji levi kot ZELENA
        ], 3
      );

      //Lower Face
      this.quadDown.geometry.vertices = Float32Attribute(
        [
          scale, -scale, 0, // spodnji desni kot ORANŽNA
          -scale, -scale, scale*2, // zgornji levi kot ZELENA-crta
          scale, -scale, scale*2, // zgornji desni kot RDECA-crta
          -scale, -scale, 0 // spodnji levi kot RUMENA
        ], 3
      );

      //Left Face
      this.quadLeft.geometry.vertices = Float32Attribute(
        [
          -scale, scale, scale*2, // zgornji levi kot VIJOLČNA
          -scale, -scale, 0, // spodnji desni kot RUMENA
          -scale, -scale, scale*2, // zgornji desni kot ZELENA-crta
          -scale, scale, 0 // spodnji levi kot RDEČA
        ], 3
      );
      this.quadLeft.geometry.indices = Uint32Attribute([0, 1, 3, 0, 2, 1], 1);
      this.quadLeft.geometry.uv = Float32Attribute(
        [
          0, 1,
          1, 0,
          0, 0,
          1, 1
        ], 2
      );

      //Right Face
      this.quadRight.geometry.vertices = Float32Attribute(
        [
          scale, scale, 0, // spodnji desni kot ZELENA
          scale, -scale, scale*2, // zgornji levi kot RDECA-crta
          scale, -scale, 0, // spodnji levi kot ORANŽNA
          scale, scale, scale*2 // zgornji desni kot MODRA
        ], 3
      );
      this.quadRight.geometry.indices = Uint32Attribute([0, 1, 3, 0, 2, 1], 1);
      this.quadRight.geometry.uv = Float32Attribute(
        [
          0, 1,
          1, 0,
          0, 0,
          1, 1
        ], 2
      );

      //Front Face
      this.quadFront.geometry.vertices = Float32Attribute(
        [
          scale, -scale, scale*2, // zgornji levi kot RDECA-crta
          -scale, scale, scale*2, // spodnji desni kot VIJOLČNA
          scale, scale, scale*2, // spodnji levi kot MODRA
          -scale, -scale, scale*2 // zgornji desni kot ZELENA-crta
        ], 3
      );

      //Back Face
      this.quadBack.geometry.vertices = Float32Attribute(
        [
          -scale, -scale, 0, // spodnji desni kot RUMENA
          scale, scale, 0, // zgornji levi kot ZELENA
          -scale, scale, 0, // zgornji desni kot RDECA
          scale, -scale, 0 // spodnji levi kot ORANŽNA
        ], 3
      );

      if(textureArray.length == 1){
        this.quadUp.material.addMap(this.textureArray[0]);
        this.quadDown.material.addMap(this.textureArray[0]);
        this.quadLeft.material.addMap(this.textureArray[0]);
        this.quadRight.material.addMap(this.textureArray[0]);
        this.quadFront.material.addMap(this.textureArray[0]);
        this.quadBack.material.addMap(this.textureArray[0]);
      }else if (textureArray.length == 6){
        this.quadUp.material.addMap(this.textureArray[4]);
        this.quadDown.material.addMap(this.textureArray[1]);
        this.quadLeft.material.addMap(this.textureArray[0]);
        this.quadRight.material.addMap(this.textureArray[3]);
        this.quadFront.material.addMap(this.textureArray[2]);
        this.quadBack.material.addMap(this.textureArray[5]);
      }

      this.skyBox = [];
      this.skyBox.push(this.quadUp);
      this.skyBox.push(this.quadDown);
      this.skyBox.push(this.quadLeft);
      this.skyBox.push(this.quadRight);
      this.skyBox.push(this.quadFront);
      this.skyBox.push(this.quadBack);

      this.type = "SkyBox";
    }

    get GetCamera() {
      return this.camera;
    }

    get GetMySkyBox(){
      return this.skyBox;
    }

    get GetScene(){
      return this.scene;
    }
}