import * as RC from '../../src/RenderCore.js'


export default class MeshCore{
    constructor(shaderPath = "./src/shaders"){
        window.app = this;
        this._canvas = new RC.Canvas(undefined, "rc-canvas-mesh");

        this._camera = new RC.PerspectiveCamera(75, this._canvas.width/this._canvas.height, 0.0625, 8192);
        this._camera.position = new RC.Vector3(0, 0, 8);
        this._camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));

        this._scene = new RC.Scene();
        this._scene.name = "Mesh";
        this._populateScene(this._scene);

        this._renderer = new RC.MeshRenderer(this._canvas, RC.WEBGL2, {antialias: true, stencil: true});
        this._renderer.clearColor = "#ffffffff";
        this._renderer.addShaderLoaderUrls(shaderPath);
    }


    get canvas(){
        return this._canvas;
    }
    get camera(){
        return this._camera;
    }
    get scene(){
        return this._scene;
    }
    get renderer(){
        return this._renderer;
    }


    _populateScene(scene){
        //OPTIONAL LIGHTS
        let aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 0.1);
        let dLight = new RC.DirectionalLight(new RC.Color("#FFFFFF"), 1);
        let pLight = new RC.PointLight(new RC.Color("#FFFFFF"), 1);

        dLight.position = new RC.Vector3(-32, 64, 0);
        pLight.position = new RC.Vector3(0, 4, 0);

        scene.add(aLight);
        scene.add(dLight);
        scene.add(pLight);


        //cube
        //NON-INDEXED: 6sides, 2 tris per side, 3 vertices per tri, 3 components(x, y, z)
        let cube_n_position = new Float32Array(6 * 2 * 3 * 3);
        cube_n_position[0  ] = -1; cube_n_position[1  ] = -1; cube_n_position[2  ] = +1; //vertex 0 //front
        cube_n_position[3  ] = +1; cube_n_position[4  ] = -1; cube_n_position[5  ] = +1; //vertex 1
        cube_n_position[6  ] = -1; cube_n_position[7  ] = +1; cube_n_position[8  ] = +1; //vertex 2

        cube_n_position[9  ] = -1; cube_n_position[10 ] = +1; cube_n_position[11 ] = +1; //vertex 2
        cube_n_position[12 ] = +1; cube_n_position[13 ] = -1; cube_n_position[14 ] = +1; //vertex 1
        cube_n_position[15 ] = +1; cube_n_position[16 ] = +1; cube_n_position[17 ] = +1; //vertex 3


        cube_n_position[18 ] = +1; cube_n_position[19 ] = -1; cube_n_position[20 ] = +1; //vertex 1 //right
        cube_n_position[21 ] = +1; cube_n_position[22 ] = -1; cube_n_position[23 ] = -1; //vertex 5
        cube_n_position[24 ] = +1; cube_n_position[25 ] = +1; cube_n_position[26 ] = +1; //vertex 3

        cube_n_position[27 ] = +1; cube_n_position[28 ] = +1; cube_n_position[29 ] = +1; //vertex 3
        cube_n_position[30 ] = +1; cube_n_position[31 ] = -1; cube_n_position[32 ] = -1; //vertex 5
        cube_n_position[33 ] = +1; cube_n_position[34 ] = +1; cube_n_position[35 ] = -1; //vertex 7


        cube_n_position[36 ] = +1; cube_n_position[37 ] = -1; cube_n_position[38 ] = -1; //vertex 5 //back
        cube_n_position[39 ] = -1; cube_n_position[40 ] = -1; cube_n_position[41 ] = -1; //vertex 4
        cube_n_position[42 ] = +1; cube_n_position[43 ] = +1; cube_n_position[44 ] = -1; //vertex 7

        cube_n_position[45 ] = +1; cube_n_position[46 ] = +1; cube_n_position[47 ] = -1; //vertex 7
        cube_n_position[48 ] = -1; cube_n_position[49 ] = -1; cube_n_position[50 ] = -1; //vertex 4
        cube_n_position[51 ] = -1; cube_n_position[52 ] = +1; cube_n_position[53 ] = -1; //vertex 6


        cube_n_position[54 ] = -1; cube_n_position[55 ] = -1; cube_n_position[56 ] = -1; //vertex 4 //left
        cube_n_position[57 ] = -1; cube_n_position[58 ] = -1; cube_n_position[59 ] = +1; //vertex 0
        cube_n_position[60 ] = -1; cube_n_position[61 ] = +1; cube_n_position[62 ] = -1; //vertex 6

        cube_n_position[63 ] = -1; cube_n_position[64 ] = +1; cube_n_position[65 ] = -1; //vertex 6
        cube_n_position[66 ] = -1; cube_n_position[67 ] = -1; cube_n_position[68 ] = +1; //vertex 0
        cube_n_position[69 ] = -1; cube_n_position[70 ] = +1; cube_n_position[71 ] = +1; //vertex 2


        cube_n_position[72 ] = -1; cube_n_position[73 ] = +1; cube_n_position[74 ] = +1; //vertex 2 //up
        cube_n_position[75 ] = +1; cube_n_position[76 ] = +1; cube_n_position[77 ] = +1; //vertex 3
        cube_n_position[78 ] = -1; cube_n_position[79 ] = +1; cube_n_position[80 ] = -1; //vertex 6

        cube_n_position[81 ] = -1; cube_n_position[82 ] = +1; cube_n_position[83 ] = -1; //vertex 6
        cube_n_position[84 ] = +1; cube_n_position[85 ] = +1; cube_n_position[86 ] = +1; //vertex 3
        cube_n_position[87 ] = +1; cube_n_position[88 ] = +1; cube_n_position[89 ] = -1; //vertex 7


        cube_n_position[90 ] = -1; cube_n_position[91 ] = -1; cube_n_position[92 ] = -1; //vertex 4 //down
        cube_n_position[93 ] = +1; cube_n_position[94 ] = -1; cube_n_position[95 ] = -1; //vertex 5
        cube_n_position[96 ] = -1; cube_n_position[97 ] = -1; cube_n_position[98 ] = +1; //vertex 0

        cube_n_position[99 ] = -1; cube_n_position[100] = -1; cube_n_position[101] = +1; //vertex 0
        cube_n_position[102] = +1; cube_n_position[103] = -1; cube_n_position[104] = -1; //vertex 5
        cube_n_position[105] = +1; cube_n_position[106] = -1; cube_n_position[107] = +1; //vertex 1

        let cube_n_geometry = new RC.Geometry(); // Add position of vertices
        cube_n_geometry.vertices = new RC.BufferAttribute(cube_n_position, 3); // Check if normals are specified. Otherwise calculate them
        cube_n_geometry.computeVertexNormals();
        //cube_geometry.drawWireframe = true;

        let cube_n_material = new RC.MeshPhongMaterial();
        cube_n_material.color = new RC.Color(0x110044);
        cube_n_material.side = RC.FRONT_AND_BACK_SIDE;

        let cube_n_object = new RC.Mesh(cube_n_geometry, cube_n_material); //let object = new RC.Cube(2, "#330022");
        cube_n_object.position = new RC.Vector3(0, 0, 0);


        //cube
        //INDEXED: 8 vertices for a cube, 3 components(x, y, z)
        let cube_position = new Float32Array(8 * 3);
        let cube_normal = new Float32Array(8 * 3);
        let cube_index = [];
        cube_position[0 ] = -1; cube_position[1 ] = -1; cube_position[2 ] = +1; //vertex 0
        cube_position[3 ] = +1; cube_position[4 ] = -1; cube_position[5 ] = +1; //vertex 1
        cube_position[6 ] = +1; cube_position[7 ] = +1; cube_position[8 ] = +1; //vertex 2
        cube_position[9 ] = -1; cube_position[10] = +1; cube_position[11] = +1; //vertex 3
        cube_position[12] = -1; cube_position[13] = -1; cube_position[14] = -1; //vertex 4
        cube_position[15] = +1; cube_position[16] = -1; cube_position[17] = -1; //vertex 5
        cube_position[18] = +1; cube_position[19] = +1; cube_position[20] = -1; //vertex 6
        cube_position[21] = -1; cube_position[22] = +1; cube_position[23] = -1; //vertex 7

        cube_normal[0 ] = -1; cube_normal[1 ] = -1; cube_normal[2 ] = +1; //vertex 0
        cube_normal[3 ] = +1; cube_normal[4 ] = -1; cube_normal[5 ] = +1; //vertex 1
        cube_normal[6 ] = +1; cube_normal[7 ] = +1; cube_normal[8 ] = +1; //vertex 2
        cube_normal[9 ] = -1; cube_normal[10] = +1; cube_normal[11] = +1; //vertex 3
        cube_normal[12] = -1; cube_normal[13] = -1; cube_normal[14] = -1; //vertex 4
        cube_normal[15] = +1; cube_normal[16] = -1; cube_normal[17] = -1; //vertex 5
        cube_normal[18] = +1; cube_normal[19] = +1; cube_normal[20] = -1; //vertex 6
        cube_normal[21] = -1; cube_normal[22] = +1; cube_normal[23] = -1; //vertex 7

        cube_index.push(0, 1, 2, 0, 2, 3); //front
        cube_index.push(1, 5, 6, 1, 6, 2); //right
        cube_index.push(5, 4, 7, 5, 7, 6); //back
        cube_index.push(4, 0, 3, 4, 3, 7); //left
        cube_index.push(3, 2, 6, 3, 6, 7); //up
        cube_index.push(4, 5, 1, 4, 1, 0); //down


        for(let i = 0; i < 100; i++){
            let cube_i_geometry = new RC.Geometry(); // Add position of vertices
            cube_i_geometry.vertices = new RC.BufferAttribute(cube_position, 3); //index
            cube_i_geometry.indices = new RC.BufferAttribute(new Uint32Array(cube_index), 1); // Check if normals are specified. Otherwise calculate them
            //cube_i_geometry.computeVertexNormals();
            cube_i_geometry.normals = new RC.BufferAttribute(cube_normal, 3);


            let cube_i_object = new RC.Mesh(cube_n_geometry, new RC.MeshPhongMaterial()); //let object = new RC.Cube(2, "#330022");
            cube_i_object.position.set(Math.random()*100-50, Math.random()*100-50, Math.random()*100-50);
            cube_i_object.position.multiplyScalar(0.5);
            cube_i_object.scale.set(Math.random()*4, Math.random()*4, Math.random()*4);


            scene.add(cube_i_object);
        }

        const pl_cube = new RC.Mesh(cube_n_geometry);
        pl_cube.color = pLight.color;
        pLight.add(pl_cube);

        const dl_cube = new RC.Mesh(cube_n_geometry);
        dl_cube.color = dLight.color;
        dLight.add(new RC.Mesh(dl_cube));
        


        //PLANE
        const plane = new RC.Quad({x: -1024, y: 1024}, {x: 1024, y: -1024}, new RC.MeshPhongMaterial(), undefined);
        plane.material.color =  new RC.Color(0xcc1111);
        plane.material.lights = true;
        plane.material.side = RC.FRONT_AND_BACK_SIDE;
        plane.material.shadingType = RC.SmoothShading;
        plane.material.transparent = false;
        plane.material.opacity = 0.5;
        plane.translateY(-4);
        plane.rotateX(-Math.PI/2);
        scene.add(plane);

    }
}
