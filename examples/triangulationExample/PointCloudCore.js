/** IMPORTS */
import * as RC from '../../src/RenderCore.js';
import {Matrix3} from "../../src/RenderCore.js";
import {DelaunayTriangulation2D} from "./Triangulation/DelaunayTriangulation2D.js";
import {Vector2} from "../../src/RenderCore.js";
import {NormalEstimator} from "./Triangulation/NormalEstimator.js";
import {OutlierRemover} from "./Triangulation/OutlierRemover.js";


export default class PointCloudCore{
    constructor(shaderPath = "./src/shaders"){
        this._canvas = new RC.Canvas(undefined, "rc-canvas-pc");

        this._camera = new RC.PerspectiveCamera(75, this._canvas.canvas.width/this._canvas.canvas.height, 0.1, 1000);
        this._camera.position = new RC.Vector3(0, 0, 8);
        this._camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));

        this._scene = new RC.Scene();
        this._scene.name = "PC";
        //this._populateScene(this._scene);

        this._renderer = new RC.MeshRenderer(this._canvas.canvas, RC.WEBGL2, {antialias: false});
        this._renderer.clearColor = "#000000ff";
        this._renderer.addShaderLoaderUrls(shaderPath);

        this._textFile = null;

        this.bound = null;
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
    get textFile(){
        return this._textFile;
    }
    set textFile(textFile){
        this._textFile = textFile;
    }


    _populateScene(scene){
        let pLightFirst = new RC.PointLight(new RC.Color("#AAAAAA"), 1, 10);
        let pLightSecond = new RC.PointLight(new RC.Color("#AAAAAA"), 1, 10);
        let pLightThird = new RC.PointLight(new RC.Color("#AA22AA"), 1, 10);
        let pLightForth = new RC.PointLight(new RC.Color("#AA22AA"), 1, 10);
        let pLightFifth = new RC.PointLight(new RC.Color("#AAAAAA"), 1, 10);
        let pLightSixth = new RC.PointLight(new RC.Color("#AAAAAA"), 1, 10);
        let dLight = new RC.DirectionalLight(new RC.Color("#AAAAAA"), 1.0);

        pLightFirst.position = new RC.Vector3(100, 0, 0);
        pLightSecond.position = new RC.Vector3(-100, 0, 0);
        pLightThird.position = new RC.Vector3(0, 100, 0);
        pLightForth.position = new RC.Vector3(0, -100, 0);
        pLightFifth.position = new RC.Vector3(0, 0, 100);
        pLightSixth.position = new RC.Vector3(0, 0, -100);

        const pLightContainer = new RC.Group();
        pLightContainer.name = "pLightContainer";

        pLightContainer.add(pLightFirst);
        pLightContainer.add(pLightSecond);
        pLightContainer.add(pLightThird);
        pLightContainer.add(pLightForth);
        //pLightContainer.add(pLightFifth);
        //pLightContainer.add(pLightSixth);
        scene.add(pLightContainer);
        scene.add(dLight);



        //const rawPoints = [];
        //const rawColors = [];
        let vec3Points = [];


        const scope = this;
        this.used = false;


        let LAS = new RC.LASLoader(new RC.LoadingManager(), "arraybuffer", true, 1*1024*1024*512);
        LAS.load(
            //url
            "models/point cloud/tile042.las",
            //[RC.LASLoader.PDRFormat2.Keys.X, RC.LASLoader.PDRFormat2.Keys.Y, RC.LASLoader.PDRFormat2.Keys.Z, RC.LASLoader.PDRFormat2.Keys.RED, RC.LASLoader.PDRFormat2.Keys.GREEN, RC.LASLoader.PDRFormat2.Keys.BLUE],
            [RC.LASLoader.PDRFormat1.Keys.X, RC.LASLoader.PDRFormat1.Keys.Y, RC.LASLoader.PDRFormat1.Keys.Z],
            //on load complete
            function(data){
                console.log("LAS load complete.");
            },
            //on progress
            function(xhr){
                //console.log("LAS " + (xhr.loaded / xhr.total * 100) + "% loaded.");
                console.log("LAS " + ((LAS.LASLoaded + xhr.loaded) / LAS.LASSize * 100) + "% loaded.");
            },
            //on error
            function(err){
                console.error("LAS load error.");
            },
            //on abort
            function(){
                console.error("LAS load abort.");
            },
            //on header load
            function(data){
                console.log("The size of LAS is: " + data.size + " " + data.type + ".");
            },
            //on chunk load
            function(data){
                console.log(data);
                console.log(scope.used);


                if(scope.used === false) {

                    for(let i = 0; i < data.X.length; i++){
                        if(i === 0)console.log(i + ": " + data.X[i] + "::"+(data.Y[i])+"::"+(data.Z[i]));
                        if(i === data.X.length-1)console.log(i + ": " + data.X[i] + "::"+(data.Y[i])+"::"+(data.Z[i]));


                        //rawPoints.push(data.X[i], data.Y[i], data.Z[i]);
                        //rawColors.push(1.0, 1.0, 1.0, 1.0);

                        vec3Points.push(new RC.Vector3(data.X[i], data.Y[i], data.Z[i]));


                        //colors[i*4 + 0] = data.PDRs.RED[i];
                        //colors[i*4 + 1] = data.PDRs.GREEN[i];
                        //colors[i*4 + 2] = data.PDRs.BLUE[i];
                        //colors[i*4 + 3] = 1.0;
                    }


                    /** preprocess */
                    const scaleF= 0.1;
                    let selectedPoints = [];
                    const start = 1000000;
                    const num = vec3Points.length/20;

                    for(let i = 0; i < num; i++){
                        selectedPoints[i] = vec3Points[start+i];
                    }
                    //clear
                    vec3Points = [];

                    const averageVec3 = scope.findAverageVec3(selectedPoints);
                    scope.transformPointCloud(selectedPoints, averageVec3, new RC.Vector3(1, 1, 1));



                    /** normal estimation */
                    //const ne = new NormalEstimator(selectedPoints, 8);
                    //ne.estimate();

                    /** outlier removal */
                    //const or = new OutlierRemover(selectedPoints, 8,1.0);
                    //selectedPoints = or.remove();



                    /** draw points */
                    const points = [];
                    for(let i = 0; i < selectedPoints.length; i++){
                        points.push(selectedPoints[i].x, selectedPoints[i].y, selectedPoints[i].z);
                    }
                    const geometry = new RC.Geometry();
                    geometry.vertices = RC.Float32Attribute(points, 3);
                    //geometry.vertColor = RC.Float32Attribute(colors, 4);


                    const material = new RC.MeshBasicMaterial();
                    material.color.setRGB(1.0, 0.0, 0.0);
                    material.usePoints = true;
                    material.lights = false;
                    material.drawCircles = true;
                    material.pointSize = 32;


                    const pointGroup = new RC.Point(geometry, material);
                    pointGroup.scale.setScalar(scaleF);
                    //pointGroup.translate(new RC.Vector3(-points[0]*scaleF, -points[1]*scaleF, -points[2]*scaleF));
                    scene.add(pointGroup);




                    /** triangulation */
                    const triangulationPoints = [];
                    for(let i = 0; i < selectedPoints.length; i++){
                        const point = new Vector2(selectedPoints[i].x, selectedPoints[i].y);
                        point.hidden_z = selectedPoints[i].z;
                        point.hidden_normal = selectedPoints[i].hidden_normal;

                        triangulationPoints.push(point);
                    }
                    const DT = new DelaunayTriangulation2D(triangulationPoints);
                    const triangulation = DT.triangulate();


                    /** draw lines */
                    const lineSeg = [];
                    for(let i = 0; i < triangulation.edges.length; i++){
                        if(triangulation.edges[i].old) continue;

                        lineSeg.push(triangulation.edges[i].v1.x, triangulation.edges[i].v1.y, triangulation.edges[i].v1.hidden_z);
                        lineSeg.push(triangulation.edges[i].v2.x, triangulation.edges[i].v2.y, triangulation.edges[i].v2.hidden_z);
                    }


                    const lineGeometry = new RC.Geometry();
                    lineGeometry.vertices = RC.Float32Attribute(lineSeg, 3);


                    const lineMaterial = new RC.MeshBasicMaterial();
                    lineMaterial.color.set(0.25);
                    lineMaterial.lights = false;


                    const lines = new RC.Line(lineGeometry, lineMaterial);
                    lines.renderingPrimitive = RC.LINES;
                    lines.scale.setScalar(scaleF);
                    //lines.translate(new RC.Vector3(-points[0]*scaleF, -points[1]*scaleF, -points[2]*scaleF));
                    scene.add(lines);


                    /** draw border lines */
                    /*const lineSeg2 = [];
                    for(let i = 0; i < triangulation.edges.length; i++){
                        if(triangulation.edges[i].special === false) continue;

                        lineSeg2.push(triangulation.edges[i].v1.x, triangulation.edges[i].v1.y, 0);
                        lineSeg2.push(triangulation.edges[i].v2.x, triangulation.edges[i].v2.y, 0);
                    }


                    const lineGeometry2 = new RC.Geometry();
                    lineGeometry2.vertices = RC.Float32Attribute(lineSeg2, 3);


                    const lineMaterial2 = new RC.MeshBasicMaterial();
                    lineMaterial2.color.setRGB(0.0, 0.0, 1.0);
                    lineMaterial2.lights = false;


                    const lines2 = new RC.Line(lineGeometry2, lineMaterial2);
                    lines2.renderingPrimitive = RC.LINES;
                    lines2.scale.setScalar(scaleF);
                    //lines2.translate(new RC.Vector3(-points[0]*scaleF, -points[1]*scaleF, -points[2]*scaleF));
                    scene.add(lines2);*/


                    /** draw triangles */
                    const trianglesPoints = [];
                    const triangleNormals = [];
                    for(let i = 0; i < triangulation.triangles.length; i++){
                        if(triangulation.triangles[i].old) continue;

                        trianglesPoints.push(triangulation.triangles[i].v1.x, triangulation.triangles[i].v1.y, triangulation.triangles[i].v1.hidden_z);
                        trianglesPoints.push(triangulation.triangles[i].v2.x, triangulation.triangles[i].v2.y, triangulation.triangles[i].v2.hidden_z);
                        trianglesPoints.push(triangulation.triangles[i].v3.x, triangulation.triangles[i].v3.y, triangulation.triangles[i].v3.hidden_z);

                        if(triangulation.triangles[i].v1.hidden_normal !== undefined) {
                            triangleNormals.push(triangulation.triangles[i].v1.hidden_normal.x, triangulation.triangles[i].v1.hidden_normal.y, triangulation.triangles[i].v1.hidden_normal.z);
                            triangleNormals.push(triangulation.triangles[i].v2.hidden_normal.x, triangulation.triangles[i].v2.hidden_normal.y, triangulation.triangles[i].v2.hidden_normal.z);
                            triangleNormals.push(triangulation.triangles[i].v3.hidden_normal.x, triangulation.triangles[i].v3.hidden_normal.y, triangulation.triangles[i].v3.hidden_normal.z);
                        }
                    }


                    const triangleGeometry = new RC.Geometry();
                    triangleGeometry.vertices = RC.Float32Attribute(trianglesPoints, 3);
                    //triangleGeometry.normals = RC.Float32Attribute(triangleNormals, 3); //normals v1
                    triangleGeometry.computeVertexNormals(); //normals v2



                    const triangleMaterial = new RC.MeshPhongMaterial();
                    triangleMaterial.color.setRGB(0.75, 0.75, 0.75);
                    triangleMaterial.lights = true;
                    triangleMaterial.shadingType = RC.FlatShading;


                    const triangles = new RC.Mesh(triangleGeometry, triangleMaterial);
                    triangles.scale.setScalar(scaleF);
                    //lines.translate(new RC.Vector3(-points[0]*scaleF, -points[1]*scaleF, -points[2]*scaleF));
                    scene.add(triangles);


                    /** draw normals */
                    const normalChannel = new RC.VertexNormal({
                        geometry: RC.VertexNormal.assembleGeometry(triangles),
                        material: RC.VertexNormal.assembleMaterial({geometry: triangles.geometry, color: new RC.Color(1.0, 1.0, 1.0)})
                    });
                    //normalChannel.renderingPrimitive = RC.LINES;
                    //normalChannel.material = new RC.MeshBasicMaterial();
                    normalChannel.material.lights = false;
                    normalChannel.material.color.setRGB(1.0, 1.0, 1.0);
                    normalChannel.material.transparent = true;
                    normalChannel.material.opacity = 0.25;
                    triangles.add(normalChannel);



                    /** OBJ export */
                    /*let objText = "";

                    for(let t = 0, i = 0; t < triangulation.triangles.length; t++){
                        if(triangulation.triangles[t].old) continue;

                        objText += "v " + triangulation.triangles[t].v1.x + " " + triangulation.triangles[t].v1.y + " " + triangulation.triangles[t].v1.hidden_z + "\n";
                        objText += "v " + triangulation.triangles[t].v2.x + " " + triangulation.triangles[t].v2.y + " " + triangulation.triangles[t].v2.hidden_z + "\n";
                        objText += "v " + triangulation.triangles[t].v3.x + " " + triangulation.triangles[t].v3.y + " " + triangulation.triangles[t].v3.hidden_z + "\n";

                        objText += "nv " + triangulation.triangles[t].v1.hidden_normal.x + " " + triangulation.triangles[t].v1.hidden_normal.y + " " + triangulation.triangles[t].v1.hidden_normal.z + "\n";
                        objText += "nv " + triangulation.triangles[t].v2.hidden_normal.x + " " + triangulation.triangles[t].v2.hidden_normal.y + " " + triangulation.triangles[t].v2.hidden_normal.z + "\n";
                        objText += "nv " + triangulation.triangles[t].v3.hidden_normal.x + " " + triangulation.triangles[t].v3.hidden_normal.y + " " + triangulation.triangles[t].v3.hidden_normal.z + "\n";

                        objText += "f " + (i*3+1) + "//" + (i*3+1) + " " + (i*3+2) + "//" + (i*3+3) + " " + (i*3+3) + "//" + (i*3+3) + "\n";
                        i++;
                    }*/


                    //scope._exportOBJ(objText);
                    scope.used = true;

                }
            }
        );
    }

    _exportOBJ(text){
        this.download(text, "TriangulationExample.obj", "text/plain")
    }

    // Function to download data to a file
    download(data, filename, type) {
        var file = new Blob([data], {type: type});
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

    findAverageVec3(P){
        let sum = new RC.Vector3(0, 0, 0);

        for(let i = 0; i < P.length; i++){
            sum.add(P[i]);
        }


        return sum.multiplyScalar(1/P.length);
    }

    transformPointCloud(P, translate, scale){
        for(let i = 0; i < P.length; i++){
            P[i].sub(translate);
            P[i].multiply(scale);
        }
    }

}

