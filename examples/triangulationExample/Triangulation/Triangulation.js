import {Vector2} from "../../../src/math/Vector2.js";
import {Vector3} from "../../../src/math/Vector3.js";


export class Triangulation {
    constructor() {
        this._vertices = [];
        this._edges = [];
        this._triangles = [];

        this._DAG = null;
    }


    get edges(){ return this._edges; }
    //set edges(edges) { this._edges = edges; }
    get triangles(){ return this._triangles; }
    //set triangles(triangles){ this._triangles = triangles; }

    get DAG(){ return this._DAG; }
    set DAG(DAG){ this._DAG = DAG; }


    addEdge(edge){
        this._edges.push(edge);
    }
    removeEdge(edge){
        /*
        let statusOK = false;

        for(let i = 0; i < this._edges.length; i++){
            if(this._edges[i] === edge){
                this._edges.splice(i, 1);

                statusOK = true;
                break;
            }
        }

        if(!statusOK)console.error("Edge not deleted!");
        */
        edge.old = true;
    }
    removeEdgesContainingV(v){
        for(let i = 0; i < this._edges.length; i++){
            if(this._edges[i].v1 === v || this._edges[i].v2 === v){
                /*this._edges.splice(i, 1);

                i--;*/
                this._edges[i].old = true;
            }
        }
    }
    removeTrianglesContainingV(v){
        for(let i = 0; i < this._triangles.length; i++){
            if(this._triangles[i].v1 === v || this._triangles[i].v2 === v || this._triangles[i].v3 === v){
                /*this._triangles.splice(i, 1);

                i--;*/
                this._triangles[i].old = true;
            }
        }
    }
    addTriangle(triangle){
        this._triangles.push(triangle);
    }
    removeTriangle(triangle){
        /*
        //find triangle
        let statusOK = false;

        for(let i = 0; i < this._triangles.length; i++){
            if(this._triangles[i] === triangle){ //zbrise ce ej isti objekt (ce je isti pointer)
                //remove from triangle array
                const deletedTri = this._triangles.splice(i, 1)[0];

                //remove pointers from edges to this triangle
                deletedTri.e1.removeTriangle(deletedTri);
                deletedTri.e2.removeTriangle(deletedTri);
                deletedTri.e3.removeTriangle(deletedTri);

                statusOK = true;
                break;
            }
        }

        if(!statusOK)console.error("Triangle not deleted!");
        */
        triangle.old = true;
        triangle.e1.removeTriangle(triangle);
        triangle.e2.removeTriangle(triangle);
        triangle.e3.removeTriangle(triangle);
    }

    findTriangleContainingPointDAG(point){
        const root = this._DAG.root;

        return this._findTriangleContainingPointDAG_R(point, root);
    }
    _findTriangleContainingPointDAG_R(point, triangle){
        if(!triangle.old){
            return this.pointInTriangle(point, triangle);
        }else{
            for(let i = 0; i < triangle.children.length; i++){
                if(this.pointInTriangle(point, triangle.children[i]) !== null){

                    return this._findTriangleContainingPointDAG_R(point, triangle.children[i]);
                }
            }


            return null;
        }
    }
    pointInTriangle(point, triangle){
        const AC = new Vector2();
        const AB = new Vector2();
        const AP = new Vector2();
        const P = point;


        if(this.sign(triangle.v1, triangle.v2, triangle.v3) < 0) console.warn("wrong orientation: " + this.sign(triangle.v1, triangle.v2, triangle.v3));

        //barycentric coordinates
        const A = triangle.v1;/** volatile orientation: order of edge vertices!!!???????????????????????????????????? */
        const B = triangle.v2;
        const C = triangle.v3;


        // Compute vectors
        AC.subVectors(C, A);
        AB.subVectors(B, A);
        AP.subVectors(P, A);

        // Compute dot products
        const dot00 = AC.dot(AC);
        const dot01 = AC.dot(AB);
        const dot02 = AC.dot(AP);
        const dot11 = AB.dot(AB);
        const dot12 = AB.dot(AP);

        // Compute barycentric coordinates
        const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
        const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

        // Check if point is in triangle
        if((u > 0) && (v > 0) && (u + v < 1)){
            triangle.pointFoundOnBorder = false;
            return triangle;
        }else if(u === 0 && 0 <= v && v <= 1){
            triangle.pointFoundOnBorder = true;
            triangle.pointIntersectionEdge = triangle.e1;
            //console.warn("A");
            return triangle;
        }else if(0 <= u && u <= 1 && v === 0){
            triangle.pointFoundOnBorder = true;
            triangle.pointIntersectionEdge = triangle.e3;
            //console.warn("B");
            return triangle;
        }else if(u + v === 1){
            triangle.pointFoundOnBorder = true;
            triangle.pointIntersectionEdge = triangle.e2;
            //console.warn("C");
            return triangle;
        }


        return null;
    }
    findTriangleContainingPoint(point){
        const AC = new Vector2();
        const AB = new Vector2();
        const AP = new Vector2();
        const P = point;

        let uv = [];
        let asstris = [];
        let counter = 0;
        let ind = null;
        for(let i = 0; i < this._triangles.length; i++){
            if(this.sign(this._triangles[i].v1,this._triangles[i].v2, this._triangles[i].v3) < 0) console.warn("wrong orientation: " + this.sign(this._triangles[i].v1,this._triangles[i].v2, this._triangles[i].v3));

            //barycentric coordinates
            const A = this._triangles[i].v1;/** volatile orientation: order of edge vertices!!!???????????????????????????????????? */
            const B = this._triangles[i].v2;
            const C = this._triangles[i].v3;


            // Compute vectors
            AC.subVectors(C, A);
            AB.subVectors(B, A);
            AP.subVectors(P, A);

            // Compute dot products
            const dot00 = AC.dot(AC);
            const dot01 = AC.dot(AB);
            const dot02 = AC.dot(AP);
            const dot11 = AB.dot(AB);
            const dot12 = AB.dot(AP);

            // Compute barycentric coordinates
            const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
            const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
            const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

            // Check if point is in triangle
            if((u > 0) && (v > 0) && (u + v < 1)){
                this._triangles[i].pointFoundOnBorder = false;//TODO CHECK kaj je s tem blo     //ckeheck ko je an tocki tocka
                return this._triangles[i];



                counter++;
                ind = i;
                uv.push(u+ "::" + v);
                asstris.push(this._triangles[i]);
            }else if(u === 0 && 0 <= v && v <= 1){
                this._triangles[i].pointFoundOnBorder = true;

                //console.error("u v - 1: " + u + "::" + v);
                this._triangles[i].pointIntersectionEdge = this._triangles[i].e3;

                return this._triangles[i];
            }else if(0 <= u && u <= 1 && v === 0){
                this._triangles[i].pointFoundOnBorder = true;

                //console.error("u v - 2: " + u + "::" + v);
                //console.error(v === 0);
                this._triangles[i].pointIntersectionEdge = this._triangles[i].e2;

                return this._triangles[i];
            }else if(u + v === 1){
                this._triangles[i].pointFoundOnBorder = true;

                //console.error("u v - 3: " + u + "::" + v);
                //console.error(u+v);
                this._triangles[i].pointIntersectionEdge = this._triangles[i].e1;

                return this._triangles[i];
            }

        }


        if(counter > 1) {
            console.warn("TTTT: " + counter);
            console.warn(point);
            console.warn(asstris);
            console.warn(uv);
        }
        if(ind !== null) return this._triangles[ind];


        return null;
    }


    findTriangleContainingPoint2(point){
        let index = null;
        let counter = 0;


        for(let i = 0; i < this._triangles.length; i++){
            if(this.sign(this._triangles[i].v1,this._triangles[i].v2, this._triangles[i].v3) < 0) console.warn("wrong orientation");

            let found = this.PointInTriangle(point, this._triangles[i].v1,this._triangles[i].v2, this._triangles[i].v3);


            if(found){
                index = i;
                counter++;
            }
        }

        if(counter > 1) {
            console.warn("TTTT: " + counter);
            console.warn(point);
        }
        if(index !== null) return this._triangles[index];
        return null;
    }

    sign (p1, p2, p3) {
        return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    }

    PointInTriangle (pt, v1, v2, v3) {
        let d1, d2, d3;
        let has_neg, has_pos;

        d1 = this.sign(pt, v1, v2);
        d2 = this.sign(pt, v2, v3);
        d3 = this.sign(pt, v3, v1);

        has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);

        return !(has_neg && has_pos);
    }


    extractEdgesFromDAG(){
        const root = this._DAG.root;

        this._edges = [];
        this._extractEdgesFromDAG_R(root);
    }
    _extractEdgesFromDAG_R(triangle){
        if(!triangle.old){
            this._edges.push(triangle.e1, triangle.e2, triangle.e3);
        }else{
            for(let i = 0; i < triangle.children.length; i++){
                this._extractEdgesFromDAG_R(triangle.children[i]);
            }
        }
    }

    extractTrianglesFromDAG(){
        const root = this._DAG.root;

        this._triangles = [];
        this._extractTrianglesFromDAG_R(root);
    }
    _extractTrianglesFromDAG_R(triangle){
        if(!triangle.old){
            //this._triangles.push(triangle);
        }else{
            for(let i = 0; i < triangle.children.length; i++){
                this._extractTrianglesFromDAG_R(triangle.children[i]);
            }
        }
    }
}