import * as RC from "../../../src/RenderCore.js";
import {Triangulation} from "./Triangulation.js";
import {Triangle} from "./Triangle.js";
import {Edge} from "./Edge.js";
import {Matrix3} from "../../../src/RenderCore.js";
import {DAG} from "./DAG.js";
import {DAGNode} from "./DAG.js";


export class DelaunayTriangulation2D {
    constructor(P) {
        this._P = P;
        this._triangulation = null;

        this.circumcircleMat = new Matrix3();

        this._legAddTimeSum = 0;
        this._legRemTimeSum = 0;
    }


    get P(){ return this._P; }
    get triangulation() { return this._triangulation; }


    triangulate(P = this._P){
        //P is a set of points in 2D (Vector2)


        //generate bounding triangle
        const p_0Index = this.findMaxYXIndex(P);
        const maxX = this.findMaxXABS(P);
        const maxY = this.findMaxYABS(P);
        const maxXY = Math.max(maxX, maxY);
        const aveX = this.findAverageX(P);
        const aveY = this.findAverageY(P);
        //const p_0 = this.findMaxYX(P);
        //const p_0 = P.splice(p_0Index, 1)[0]; //return and delete max YX element

        //const p_0 = new RC.Vector2(aveX, aveY + maxY);
        //const p_m1 = new RC.Vector2(aveX - maxX, aveY - maxY);
        //const p_m2 = new RC.Vector2(aveX + maxX, aveY - maxY);
        const p_0 = new RC.Vector2(3*maxXY, 0);
        const p_m1 = new RC.Vector2(0, 3*maxXY);
        const p_m2 = new RC.Vector2(-3*maxXY, -3*maxXY);
        p_0.hidden_z = 0;
        p_m1.hidden_z = 0;
        p_m2.hidden_z = 0;
        p_0.hidden_normal = new RC.Vector3(0, 0, 1);
        p_m1.hidden_normal =  new RC.Vector3(0, 0, 1);
        p_m2.hidden_normal =  new RC.Vector3(0, 0, 1);


        //permutate
        P = this.shuffle(P);

        //create triangulation
        const T = new Triangulation();

        const boundingTriangle = new Triangle(new Edge(p_0, p_m1), new Edge(p_m1, p_m2), new Edge(p_m2, p_0));
        boundingTriangle.e1.special = true;
        boundingTriangle.e2.special = true;
        boundingTriangle.e3.special = true;
        this.bound = boundingTriangle;

        T.addEdge(boundingTriangle.e1);
        T.addEdge(boundingTriangle.e2);
        T.addEdge(boundingTriangle.e3);
        T.addTriangle(boundingTriangle);/** triangle dodaj posebaj kot edge */



        T.DAG = new DAG(boundingTriangle);


        let avgTimeTriangle = 0;
        let avgTimeRemove = 0;
        let avgTimeAdd = 0;
        let avgTimeLeg = 0;


        //loop
        for(let i = 0; i < P.length; i++){
            if(i%10000 === 0) console.log("Triangulation progress: " + i/(P.length) * 100 + "%");


            //poisci trikotnik znotraj T, ki vsebuje tocko p_r
            const p_r = P[i];
            let timeTri = performance.now();
            //const triangle = T.findTriangleContainingPoint(p_r);
            const triangle = T.findTriangleContainingPointDAG(p_r);
            //const triangle = T.findTriangleContainingPoint2(p_r);
            avgTimeTriangle += (performance.now() - timeTri);


            if(triangle === null){
                //console.warn("insert of point: " + i + " failed");
                //console.warn(p_r);
                //console.warn(triangle);
                //console.warn("ignore point");
            }else if(triangle.pointFoundOnBorder === false){
                //ce lezi znotraj trikotnika
                //povezi tocko p_r z robovi trikotnika, s tem razdelimo trikotnik na 3 manjse trikotnike
                const newEdge1 = new Edge(p_r, triangle.v1);
                const newEdge2 = new Edge(p_r, triangle.v2);
                const newEdge3 = new Edge(p_r, triangle.v3);

                //remove from T//TODO priority
                ///let timeRemove = performance.now();
                ///T.removeTriangle(triangle); /** remove triangle and remove pointer to edges, leave edges*/
                ///avgTimeRemove += (performance.now() - timeRemove);

                const newTriangle1 = new Triangle(triangle.e1, newEdge2, newEdge1);
                const newTriangle2 = new Triangle(triangle.e2, newEdge3, newEdge2);
                const newTriangle3 = new Triangle(triangle.e3, newEdge1, newEdge3);


                //add to T
                let timeAdd = performance.now();
                T.addEdge(newEdge1);
                T.addEdge(newEdge2);
                T.addEdge(newEdge3);

                T.addTriangle(newTriangle1);
                T.addTriangle(newTriangle2);
                T.addTriangle(newTriangle3);
                avgTimeAdd += (performance.now() - timeAdd);


                //remove from T//TODO priority
                let timeRemove = performance.now();
                T.removeTriangle(triangle); /** remove triangle and remove pointer to edges, leave edges*/
                avgTimeRemove += (performance.now() - timeRemove);


                /** DAG */
                triangle.old = true;
                triangle.children.push(newTriangle1);
                triangle.children.push(newTriangle2);
                triangle.children.push(newTriangle3);


                /** LEGALIZE EDGES*/
                let timeLeg = performance.now();
                this.legalizeEdge(p_r, triangle.e1, T);
                this.legalizeEdge(p_r, triangle.e2, T);
                this.legalizeEdge(p_r, triangle.e3, T);
                avgTimeLeg += (performance.now() - timeLeg);

            }else{
                //ce lezi na robu
                //console.warn("point on line");
                //continue;


                //povezi tocko p_r z
                const edge_ij = triangle.pointIntersectionEdge;


                const p_k = triangle.oppositeVertexOfEdge(edge_ij);
                const p_j = triangle.prevVertexOfVertex(p_k);
                const p_i = triangle.nextVertexOfVertex(p_k);

                const edge_jk = triangle.nextEdgeOfEdge(edge_ij);
                const edge_ki = triangle.prevEdgeOfEdge(edge_ij);
                const newEdge_rk = new Edge(p_r, p_k);
                const newEdge_rj = new Edge(p_r, p_j);
                const newEdge_ri = new Edge(p_r, p_i);

                if(edge_ij.special){
                    console.error("on super edge");
                    newEdge_rj.special = true;
                    newEdge_ri.special = true;
                }

                const newTriangle_t0 = new Triangle(newEdge_rj, edge_jk, newEdge_rk);
                const newTriangle_t1 = new Triangle(newEdge_rk, edge_ki, newEdge_ri);



                let otherTriangle = null;
                let edge_lj = null;
                let edge_il = null;
                let newEdge_rl = null;
                let newTriangle_t2 = null;
                let newTriangle_t3 = null;

                if(edge_ij.special === false){
                    otherTriangle = (edge_ij.t[0] !== triangle) ? edge_ij.t[0] : edge_ij.t[1];

                    const p_l = otherTriangle.oppositeVertexOfEdge(edge_ij);

                    newEdge_rl = new Edge(p_r, p_l);
                    edge_lj = otherTriangle.prevEdgeOfEdge(edge_ij);
                    edge_il = otherTriangle.nextEdgeOfEdge(edge_ij);

                    newTriangle_t2 = new Triangle(newEdge_ri, edge_il, newEdge_rl);
                    newTriangle_t3 = new Triangle(newEdge_rl, edge_lj, newEdge_rj);
                }


                //add to triangulation T
                T.addEdge(newEdge_rk);
                T.addEdge(newEdge_rj);
                T.addEdge(newEdge_ri);
                if(edge_ij.special === false) T.addEdge(newEdge_rl);

                T.addTriangle(newTriangle_t0);
                T.addTriangle(newTriangle_t1);
                if(edge_ij.special === false) T.addTriangle(newTriangle_t2);
                if(edge_ij.special === false) T.addTriangle(newTriangle_t3);


                //remove old from triangulation T
                T.removeTriangle(triangle);
                if(edge_ij.special === false) T.removeTriangle(otherTriangle);

                T.removeEdge(edge_ij);


                /** DAG */
                triangle.old = true;
                triangle.children.push(newTriangle_t0);
                triangle.children.push(newTriangle_t1);
                if(edge_ij.special === false){
                    otherTriangle.old = true;
                    otherTriangle.children.push(newTriangle_t2);
                    otherTriangle.children.push(newTriangle_t3);
                }



                //legaliziraj
                if(edge_ij.special === false) this.legalizeEdge(p_r, edge_il, T);
                if(edge_ij.special === false) this.legalizeEdge(p_r, edge_lj, T);
                this.legalizeEdge(p_r, edge_jk, T);
                this.legalizeEdge(p_r, edge_ki, T);
            }


            /*if(i%10000 === 0)console.warn("TIME find triangle: " + avgTimeTriangle);
            if(i%10000 === 0)console.warn("TIME add: " + avgTimeAdd);
            if(i%10000 === 0)console.warn("TIME remove: " + avgTimeRemove);
            if(i%10000 === 0)console.warn("TIME legalize: " + avgTimeLeg);
            if(i%10000 === 0)console.warn("TIME legalize add: " + this._legAddTimeSum);
            if(i%10000 === 0)console.warn("TIME legalize rem: " + this._legRemTimeSum);*/
        }


        //T.extractEdgesFromDAG();
        //T.extractTrianglesFromDAG();
        //clean edges/triangles
        T.removeEdgesContainingV(p_0);
        T.removeEdgesContainingV(p_m1);
        T.removeEdgesContainingV(p_m2);
        T.removeTrianglesContainingV(p_0);
        T.removeTrianglesContainingV(p_m1);
        T.removeTrianglesContainingV(p_m2);
        /*for(let i = 0; i < T.edges.length; i++){
            if(T.edges[i].t.length !== 2) console.warn(T.edges[i].t);
        }*/

        return T;
    }

    legalizeEdge(p_r, edge_ij, T){
        /** boundary edges are always legal, they must be preserved */
        if(edge_ij.special) return;


        //check if legal edge
        const tri0 = edge_ij.oppositeTriangle(p_r);
        const tri1 = edge_ij.attachedTriangle(p_r);
        const p_rOpposite = tri0.oppositeVertexOfEdge(edge_ij);


        /** inner edge of the quadrilateral with one boundary point is always illegal */
        let bound = false;
        /*if(edge_ij.hasVertex(this.bound.v1) || edge_ij.hasVertex(this.bound.v2) || edge_ij.hasVertex(this.bound.v3)){
            if(tri0.nextEdgeOfEdge(edge_ij).special === false && tri0.prevEdgeOfEdge(edge_ij).special === false && tri1.nextEdgeOfEdge(edge_ij).special === false && tri1.prevEdgeOfEdge(edge_ij).special === false){
                bound = true;
            }
        }*/


        const A = tri0.v1;
        const B = tri0.v2;
        const C = tri0.v3;
        const D = p_r;


        const AxDx = (A.x - D.x);
        const BxDx = (B.x - D.x);
        const CxDx = (C.x - D.x);

        const AyDy = (A.y - D.y);
        const ByDy = (B.y - D.y);
        const CyDy = (C.y - D.y);
        this.circumcircleMat.set(AxDx, BxDx, CxDx, AyDy, ByDy, CyDy, AxDx*AxDx + AyDy*AyDy, BxDx*BxDx + ByDy*ByDy, CxDx*CxDx + CyDy*CyDy);


        //When A, B and C are sorted in a counterclockwise order, this determinant is positive if and only if D lies inside the circumcircle.
        if(bound || this.circumcircleMat.determinant() > 0){
            /**const t0 = edge_ij.t[0];
            const t1 = edge_ij.t[1];
            t0.old = true;
            t1.old = true;**/

            /** REMOVE triangle from T, and from edges T, leaves edges of T alone */
            /**const legRemTime = performance.now();
            T.removeTriangle(tri0);
            T.removeTriangle(tri1);
            T.removeEdge(edge_ij);
            this._legRemTimeSum += performance.now() - legRemTime;**/

            /** FLIP EDGE */
            const newEdge = new Edge(p_r, p_rOpposite);
            const newTriangle0 = new Triangle(newEdge, tri0.prevEdgeOfEdge(edge_ij), tri1.nextEdgeOfEdge(edge_ij));
            const newTriangle1 = new Triangle(newEdge, tri1.prevEdgeOfEdge(edge_ij), tri0.nextEdgeOfEdge(edge_ij));


            /** DAG */
            const t0 = edge_ij.t[0];
            const t1 = edge_ij.t[1];
            t0.old = true;
            t1.old = true;
            t0.children.push(newTriangle0, newTriangle1);
            t1.children.push(newTriangle0, newTriangle1);


            /** ADD */
            const legAddTime = performance.now();
            T.addEdge(newEdge);
            T.addTriangle(newTriangle0);
            T.addTriangle(newTriangle1);
            this._legAddTimeSum += performance.now() - legAddTime;


            /** REMOVE triangle from T, and from edges T, leaves edges of T alone */
            const legRemTime = performance.now();
            T.removeTriangle(tri0);
            T.removeTriangle(tri1);
            T.removeEdge(edge_ij);
            this._legRemTimeSum += performance.now() - legRemTime;


            //recursive
            this.legalizeEdge(p_r, newTriangle1.e3, T);
            this.legalizeEdge(p_r, newTriangle0.e2, T);
        }
    }


    findMaxXABS(P){
        let maxX = Math.abs(P[0].x);

        for(let i = 0; i < P.length; i++){
            const value = Math.abs(P[i].x);

            if(value > maxX){
                maxX = value;
            }
        }


        return maxX;
    }
    findAverageX(P){
        let sum = 0;

        for(let i = 0; i < P.length; i++){
            sum += P[i].x;
        }


        return sum/P.length;
    }
    findAverageY(P){
        let sum = 0;

        for(let i = 0; i < P.length; i++){
            sum += P[i].y;
        }


        return sum/P.length;
    }
    findMaxYABS(P){
        let maxY = Math.abs(P[0].y);

        for(let i = 0; i < P.length; i++){
            const value = Math.abs(P[i].y);

            if(value > maxY){
                maxY = value;
            }
        }


        return maxY;
    }
    findMaxYX(P){
        let maxYX = P[0];

        for(let i = 0; i < P.length; i++){
            if(P[i].y > maxYX.y){
                maxYX = P[i];
            }else if(P[i].y === maxYX.y){
                if(P[i].x > maxYX.x){
                    maxYX = P[i];
                }
            }
        }


        return maxYX;
    }
    findMaxYXIndex(P){
        let index = 0;
        let maxYX = P[index];

        for(let i = 0; i < P.length; i++){
            if(P[i].y > maxYX.y){
                maxYX = P[i];
                index = i;
            }else if(P[i].y === maxYX.y){
                if(P[i].x > maxYX.x){
                    maxYX = P[i];
                    index = i;
                }
            }
        }


        return index;
    }

    shuffle(array) {

        let currentIndex = array.length;
        let temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;

    }
}