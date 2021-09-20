import * as RC from '../../src/RenderCore.js'
import {Float32Attribute} from "../../src/RenderCore.js";
import {Vector3} from "../../src/RenderCore.js";


const ANIAMTION_TYPE = {CATMULL_ROM: "cr", BEZIER: "b"}; 


export default class MeshCore{
    constructor(shaderPath = "./src/shaders", onFinish){
        window.app = this;
        this._canvas = new RC.Canvas(undefined, "rc-canvas-mesh");

        this._camera = new RC.PerspectiveCamera(75, this._canvas.width/this._canvas.height, 0.0625, 8192);
        this._camera.position = new RC.Vector3(0, 0, 8);
        this._camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));

        this._OBJECTS = {};
        this._ANIMDATA = {};
        this._ANIMATION_PARAMETERS = {type: ANIAMTION_TYPE.CATMULL_ROM, alpha: 0.5, tau: 0.5, timeStep: 0.0625};
        this._ANIMATIONS_TABLE = {};
        this._ANIMATION_OBJECT = new RC.Group();
        this._ANIMATION_OBJECT.add(new RC.Mesh(new RC.Geometry(), new RC.MeshBasicMaterial()));
        this._ANIMATION_OBJECT.add(new RC.Mesh(new RC.Geometry(), new RC.MeshBasicMaterial()));
        this._ANIMATION_OBJECT.add(new RC.Mesh(new RC.Geometry(), new RC.MeshBasicMaterial()));

        this._scene = new RC.Scene();
        this._scene.name = "MeshScene";
        this._scene.add(this._ANIMATION_OBJECT);
        this._populateScene(this._scene, this._OBJECTS, this._ANIMDATA, onFinish);

        this._renderer = new RC.MeshRenderer(this._canvas, RC.WEBGL2, {antialias: false, stencil: true});
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


    _populateScene(scene, objects, animData, onFinish){
        //OPTIONAL LIGHTS
        let aLight = new RC.AmbientLight(new RC.Color("#aa0040"), 0.1);
        let dLight = new RC.DirectionalLight(new RC.Color("#FFFFFF"), 0.4);
        let pLight = new RC.PointLight(new RC.Color("#FFFFFF"), 1);
        pLight.position = new RC.Vector3(0, 4, 0);

        scene.add(aLight);
        scene.add(dLight);
        scene.add(pLight);



        //GEO
        this.loadResources(scene, objects, animData, this, onFinish);
   

    }


    loadResources(scene, objects, animData, super_ref, onFinish){
        const LoadingManager = new RC.LoadingManager(
            function(){
                console.log("OBJ frames load complete.");
                super_ref.run(objects, animData, super_ref, onFinish);
            },
            function(){
                //loadingProgressBar.setAttribute("style", "width: " + percent.toFixed(2) + "%");
            },
            function(){
                console.log("OBJ frames load error.");
            }
        );


        const filePrefix = "frame_";
        const OBJLoader = new RC.ObjLoader(LoadingManager);

        for(let i = 1; i <= 10; i++){
            OBJLoader.load(
                "models/3rd Homework - data/" + filePrefix + ('0' + i).slice(-2) + ".obj",
                function (data) {
                    console.log("OBJ load complete.");
    

                    const grp = new RC.Group();

                    for(let p = 0; p < data.length; p++){
                        data[p].material = new RC.MeshPhongMaterial();
                        grp.add(data[p]);
                    }

                    //scene.add(grp);
                    objects[filePrefix + ('0' + i).slice(-2)] = grp;
                },
                function (xhr){
                    //console.log("OBJ " + (xhr.loaded / xhr.total * 100) + "% loaded.");
                },
                function (err){
                    console.error("OBJ load error.");
                }
            );
        }


        const OXHRLoader = new RC.XHRLoader(LoadingManager);
        const filePrefix2 = "input_";

        for(let i = 0; i <= 3; i++){
            OXHRLoader.load(
                "models/3rd Homework - data/" + filePrefix2 + ('0' + i).slice(-2) + ".txt",
                function (data) {
                    console.log("XHR load complete.");
    

                    console.log(data);
                    const rows = data.split('\n');
                    const keyframeNames = [];
                    const times = [];
                    for(let row = 0; row < rows.length; row++){
                        const insert = rows[row].split(' ');

                        keyframeNames.push(insert[0].split('.')[0]);
                        times.push(insert[1]);
                    }

                    animData[filePrefix2 + ('0' + i).slice(-2)] = {keyframeNames: keyframeNames, times: times};
                },
                function (xhr){
                    //console.log("OBJ " + (xhr.loaded / xhr.total * 100) + "% loaded.");
                },
                function (err){
                    console.error("XHR load error.");
                }
            );
        }
    }

    run(objects, animData, super_ref, onFinish){
        const animationNames = Object.keys(animData);
        const ANIMATED_BUNDLE = {};

        const tau = super_ref._ANIMATION_PARAMETERS.tau; //tension
        const alpha = super_ref._ANIMATION_PARAMETERS.alpha; //type
        const timeStep = super_ref._ANIMATION_PARAMETERS.timeStep;

        //FOR EACH VERTEX, INTERPOLATE
        const frames = Object.keys(objects);
        const groupObject = objects[frames[0]];
        const meshes = groupObject.children;


        for(let a = 0; a < animationNames.length; a++){//FOR EACH ANIMATION
            const animationName = animationNames[a];
            const animationKeyframeNames = animData[animationName].keyframeNames; 
            const animationTimes = animData[animationName].times; 
            const nAnimationKeyframes = animationKeyframeNames.length;
            const nSegments = nAnimationKeyframes-1;

            ANIMATED_BUNDLE[animationName] = {};


            for(let m = 0; m < meshes.length; m++){//FOR EACH MESH
                const mesh = meshes[m];
                const geometry = mesh.geometry;
                const vertices = geometry.vertices;

                ANIMATED_BUNDLE[animationName][m] = {};


                for(let v = 0; v < vertices.array.length; v+=vertices.itemSize){//FOR EACH VERTEX


                    if(super_ref._ANIMATION_PARAMETERS.type === ANIAMTION_TYPE.CATMULL_ROM){
                        //p0,p1,p2,p3
                        for(let s = 0; s <= nSegments-1; s++){//FOR EACH SEGMENT
                            const keyframeName_nm1 = (s == 0) ? animationKeyframeNames[s] : animationKeyframeNames[s-1];
                            const keyframeName_n = animationKeyframeNames[s];
                            const keyframeName_np1 = animationKeyframeNames[s+1];
                            const keyframeName_np2 = (s == nSegments-1) ? animationKeyframeNames[s+1] : animationKeyframeNames[s+2];

                            const keyframeTime_nm1 = (s == 0) ? animationTimes[s] : animationTimes[s-1];
                            const keyframeTime = parseFloat(animationTimes[s]);
                            const keyframeTime_np1 = parseFloat(animationTimes[s+1]);
                            const keyframeTime_np2 = (s == nSegments-1) ? animationTimes[s+1] : animationTimes[s+2];


                            const group_nm1 = objects[keyframeName_nm1];
                            const group_n = objects[keyframeName_n];
                            const group_np1 = objects[keyframeName_np1];
                            const group_np2 = objects[keyframeName_np2];

                            const meshes_nm1 = group_nm1.children;
                            const meshes_n = group_n.children;
                            const meshes_np1 = group_np1.children;
                            const meshes_np2 = group_np2.children;


                            const geometry_nm1 = meshes_nm1[m].geometry;
                            const geometry_n = meshes_n[m].geometry;
                            const geometry_np1 = meshes_np1[m].geometry;
                            const geometry_np2 = meshes_np2[m].geometry;
            
                            const vertices_nm1 = geometry_nm1.vertices;
                            const vertices_n = geometry_n.vertices;
                            const vertices_np1 = geometry_np1.vertices;
                            const vertices_np2 = geometry_np2.vertices;


                            const p0 = new Vector3(vertices_nm1.array[v], vertices_nm1.array[v+1], vertices_nm1.array[v+2]);
                            const p1 = new Vector3(vertices_n.array[v], vertices_n.array[v+1], vertices_n.array[v+2]);
                            const p2 = new Vector3(vertices_np1.array[v], vertices_np1.array[v+1], vertices_np1.array[v+2]);
                            const p3 = new Vector3(vertices_np2.array[v], vertices_np2.array[v+1], vertices_np2.array[v+2]);

                            const abcd = super_ref.get_abcd(p0, p1, p2, p3, tau, alpha);


                            //FIRST IN SEGMENT
                            if(ANIMATED_BUNDLE[animationName][m][keyframeTime] === undefined) ANIMATED_BUNDLE[animationName][m][keyframeTime] = new Array();
                            ANIMATED_BUNDLE[animationName][m][keyframeTime].push(vertices_n.array[v], vertices_n.array[v+1], vertices_n.array[v+2]);
                            //MIDDLE IN SEGMENT
                            for(let t = timeStep; t < 1; t+= timeStep){//FILL SEGMENT WITH VALUES
                                const newVertex = super_ref.get_Vertex(abcd.a, abcd.b, abcd.c, abcd.d, t);
            
                                const timeStamp = keyframeTime + t*(keyframeTime_np1-keyframeTime);

                                if(ANIMATED_BUNDLE[animationName][m][timeStamp] === undefined) ANIMATED_BUNDLE[animationName][m][timeStamp] = new Array();
                                ANIMATED_BUNDLE[animationName][m][timeStamp].push(newVertex.x, newVertex.y, newVertex.z);
                            }
                            //LAST IN CHAIN
                            if(s === nSegments-1){
                                if(ANIMATED_BUNDLE[animationName][m][keyframeTime_np1] === undefined) ANIMATED_BUNDLE[animationName][m][keyframeTime_np1] = new Array();
                                ANIMATED_BUNDLE[animationName][m][keyframeTime_np1].push(vertices_np1.array[v], vertices_np1.array[v+1], vertices_np1.array[v+2]);
                            }
                        }
                    }else if(super_ref._ANIMATION_PARAMETERS.type === ANIAMTION_TYPE.BEZIER){

                        //Bezier
                        const K = new Array();
                        for(let k = 0; k < nAnimationKeyframes; k++){//FOR EACH KNOT/KEYFRAME
                            const keyframeName_n = animationKeyframeNames[k];
                            const group_n = objects[keyframeName_n];
                            const meshes_n = group_n.children;
                            const geometry_n = meshes_n[m].geometry;
                            const vertices_n = geometry_n.vertices;
                            const p1 = new Vector3(vertices_n.array[v], vertices_n.array[v+1], vertices_n.array[v+2]);

                            K.push(p1);
                        }
                        const p1p2 = super_ref.compute_BezierControlPoints(K);


                        //p0,p1,p2,p3
                        for(let s = 0; s < nSegments; s++){//FOR EACH SEGMENT
                            const keyframeName_s = animationKeyframeNames[s];
                            const keyframeName_sp1 = animationKeyframeNames[s+1];

                            const keyframeTime_s = parseFloat(animationTimes[s]);
                            const keyframeTime_sp1 = parseFloat(animationTimes[s+1]);


                            const group_s = objects[keyframeName_s];
                            const group_sp1 = objects[keyframeName_sp1];

                            const meshes_s = group_s.children;
                            const meshes_sp1 = group_sp1.children;


                            const geometry_s = meshes_s[m].geometry;
                            const geometry_sp1 = meshes_sp1[m].geometry;
            
                            const vertices_s = geometry_s.vertices;
                            const vertices_sp1 = geometry_sp1.vertices;


                            const K0 = new Vector3(vertices_s.array[v], vertices_s.array[v+1], vertices_s.array[v+2]);
                            const P10 = p1p2.p1[s].clone();
                            const P20 = p1p2.p2[s].clone();
                            const K1 = new Vector3(vertices_sp1.array[v], vertices_sp1.array[v+1], vertices_sp1.array[v+2]);

    
                            const A = math.matrix([[K0.x, P10.x, P20.x, K1.x], [K0.y, P10.y, P20.y, K1.y], [K0.z, P10.z, P20.z, K1.z]]);
                            const B = math.matrix([[-1, 3, -3, 1], [3, -6, 3, 0], [-3, 3, 0, 0], [1, 0, 0, 0]]);
                            const C = math.multiply(A, B);
                            

                            //FIRST IN SEGMENT
                            if(ANIMATED_BUNDLE[animationName][m][keyframeTime_s] === undefined) ANIMATED_BUNDLE[animationName][m][keyframeTime_s] = new Array();
                            ANIMATED_BUNDLE[animationName][m][keyframeTime_s].push(vertices_s.array[v], vertices_s.array[v+1], vertices_s.array[v+2]);
                            //MIDDLE IN SEGMENT
                            for(let t = timeStep; t < 1; t+= timeStep){//FILL SEGMENT WITH VALUES
                                const tVec = math.matrix([[t*t*t], [t*t], [t], [1]]);
                                const res = math.multiply(C, tVec).toArray();

                                const newVertex = new Vector3(res[0][0], res[1][0], res[2][0]);
            
                                const timeStamp = keyframeTime_s + t*(keyframeTime_sp1-keyframeTime_s);
                                

                                if(ANIMATED_BUNDLE[animationName][m][timeStamp] === undefined) ANIMATED_BUNDLE[animationName][m][timeStamp] = new Array();
                                ANIMATED_BUNDLE[animationName][m][timeStamp].push(newVertex.x, newVertex.y, newVertex.z);
                            }
                            //LAST IN CHAIN
                            if(s === nSegments-1){
                                if(ANIMATED_BUNDLE[animationName][m][keyframeTime_sp1] === undefined) ANIMATED_BUNDLE[animationName][m][keyframeTime_sp1] = new Array();
                                ANIMATED_BUNDLE[animationName][m][keyframeTime_sp1].push(vertices_sp1.array[v], vertices_sp1.array[v+1], vertices_sp1.array[v+2]);
                            }
                        }
                    }else{
                        console.warn("Unknown animation type!")
                    }
                }
            }
        }


        const animations = Object.keys(ANIMATED_BUNDLE);
        const majorGroup = new RC.Group();
        const animationsTable = {};
        for(let a = 0; a < animations.length; a++){
            const animation = animations[a];
        
            const animationTable = {};
            const meshes = Object.keys(ANIMATED_BUNDLE[animation]);
            for(let m = 0; m < meshes.length; m++){
                

                const times = Object.keys(ANIMATED_BUNDLE[animation][meshes[m]]);
                times.sort(function(a, b){return parseFloat(a) - parseFloat(b)});


                for(let t = 0; t < times.length; t++){
                    const vertexArray = ANIMATED_BUNDLE[animation][meshes[m]][times[t]];

                    const newGeometry = new RC.Geometry();
                    newGeometry.vertices = new RC.BufferAttribute(new Float32Array(vertexArray), 3);
                    const newMesh = new RC.Mesh();
                    newMesh.geometry = newGeometry;

                    const group = times[t];
                    if(animationTable[group] === undefined) animationTable[group] = new RC.Group();
                    animationTable[group].add(newMesh);
                }

            }

            animationsTable[animation] = animationTable;
        }
        

        this._ANIMATIONS_TABLE = animationsTable;
        onFinish(this._ANIMATIONS_TABLE);
    }

    get_abcd(p0, p1, p2, p3, tau, alpha){
        //const p0 = new Vector3();
        //const p1 = new Vector3();
        //const p2 = new Vector3();
        //const p3 = new Vector3();

        //by definition
        const t0 = 0.0;
        const t1 = t0 + Math.pow(p0.distanceTo(p1), alpha);
        const t2 = t1 + Math.pow(p1.distanceTo(p2), alpha);
        const t3 = t2 + Math.pow(p2.distanceTo(p3), alpha);

        const tt = (1.0 - tau) * (t2 - t1);
        const part11 = p1.clone().sub(p0).divideScalar(t1 - t0);
        const part12 = p2.clone().sub(p0).divideScalar(t2 - t0);
        const part13 = p2.clone().sub(p1).divideScalar(t2 - t1);
        const part21 = p2.clone().sub(p1).divideScalar(t2 - t1);
        const part22 = p3.clone().sub(p1).divideScalar(t3 - t1);
        const part23 = p3.clone().sub(p2).divideScalar(t3 - t2);
        const m1 = part11.clone().sub(part12).add(part13).multiplyScalar(tt);
        const m2 = part21.clone().sub(part22).add(part23).multiplyScalar(tt);

        //V2
        /*const t01 = Math.pow(p0.distanceTo(p1), alpha);
        const t12 = Math.pow(p1.distanceTo(p2), alpha);
        const t23 = Math.pow(p2.distanceTo(p3), alpha);
        const tt0 = (1.0 - tau);
        const p2_m_p1 = p2.clone().sub(p1);
        const p1_m_p0 = p1.clone().sub(p0);
        const p2_m_p0 = p2.clone().sub(p0);
        const p3_m_p2 = p3.clone().sub(p2);
        const p3_m_p1 = p3.clone().sub(p1);
        const B1 = p1_m_p0.clone().divideScalar(t01);
        const C1 = p2_m_p0.clone().divideScalar(t01+t12);
        const B2 = p3_m_p2.clone().divideScalar(t23);
        const C2 = p3_m_p1.clone().divideScalar(t12+t23);
        const S1 = B1.clone().sub(C1);
        const S2 = B2.clone().sub(C2);
        const m1 = p2_m_p1.clone().add(S1.multiplyScalar(t12)).multiplyScalar(tt0);
        const m2 = p2_m_p1.clone().add(S2.multiplyScalar(t12)).multiplyScalar(tt0);*/

        const a = p1.clone().sub(p2).multiplyScalar(2.0).add(m1).add(m2);
        const b = p1.clone().sub(p2).multiplyScalar(-3.0).sub(m1).sub(m1).sub(m2);
        const c = m1.clone();
        const d = p1.clone();

        return {a: a, b: b, c: c, d: d};
    }
    get_Vertex(a, b, c, d, t){
        const aPoint = a.clone().multiplyScalar(t*t*t);
        const bPoint = b.clone().multiplyScalar(t*t);
        const cPoint = c.clone().multiplyScalar(t);
        const dPoint = d.clone();

        const newPoint = aPoint.clone().add(bPoint).add(cPoint).add(dPoint);

        return newPoint;
    }

    compute_BezierControlPoints(K){
        const n = K.length-1;

        const p1 = new Array();
        const p2 = new Array();

        const a = new Array();
        const b = new Array();
        const c = new Array();
        const d = new Array();

        //FIRST SEGMENT
        a[0] = new RC.Vector3(0, 0, 0);
        b[0] = new RC.Vector3(2, 2, 2);
        c[0] = new RC.Vector3(1, 1, 1);
        d[0] = K[0].clone().add(K[1].clone().multiplyScalar(2));

        //MIDDLE SEGMENTS
        for(let i = 1; i < n-1; i++){
            a[i] = new RC.Vector3(1, 1, 1);
            b[i] = new RC.Vector3(4, 4, 4);
            c[i] = new RC.Vector3(1, 1, 1);
            d[i] = K[i].clone().multiplyScalar(4).add(K[i+1].clone().multiplyScalar(2));
        }

        //LAST SEGMENT
        a[n-1] = new RC.Vector3(2, 2, 2);
        b[n-1] = new RC.Vector3(4, 4, 4);
        c[n-1] = new RC.Vector3(1, 1, 1);
        d[n-1] = K[n-1].clone().multiplyScalar(8).add(K[n]);

        //Ax=b
        for(let i = 1; i < n; i++){
            const w = a[i].clone().divide(b[i-1]);
            
            b[i] = b[i].clone().sub(c[i-1].clone().multiply(w));
            d[i] = d[i].clone().sub(d[i-1].clone().multiply(w));
        }

        p1[n-1] = d[n-1].clone().divide(b[n-1]);
        for(let i = n-2; i >= 0; i--){
            p1[i] = d[i].clone().sub(c[i].clone().multiply(p1[i+1])).divide(b[i]);
        }

        for(let i = 0; i < n-1; i++){
            p2[i] = K[i+1].clone().multiplyScalar(2).sub(p1[i+1]);
        }
        p2[n-1] = K[n].clone().add(p1[n-1]).multiplyScalar(0.5);

        return {p1: p1, p2: p2}
    }

    lerpGeometry(g1, g2, t){
        const newArray = [];

        for(let i = 0; i < g1.vertices.array.length; i++){
            newArray[i] = RC._Math.lerp(g1.vertices.array[i], g2.vertices.array[i], t);
        }


        const newGeometry = new RC.Geometry();
        newGeometry.vertices = new RC.BufferAttribute(new Float32Array(newArray), 3);

        return newGeometry;
    }
}
