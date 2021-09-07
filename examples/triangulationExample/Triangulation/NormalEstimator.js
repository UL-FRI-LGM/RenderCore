import {Matrix3} from "../../../src/math/Matrix3.js";
import {Vector2} from "../../../src/math/Vector2.js";
import {Vector3} from "../../../src/math/Vector3.js";


export class NormalEstimator{
    constructor(P, k = 8) {
        this._P = P;
        this._k = k; //num nearest neighbours
        this._triangulation = null;


        this._distance = function(a, b){
            return Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2);
        };

        console.log("Building KD tree...");
        this._tree = new kdTree(this._P, this._distance, ["x", "y"]);


        this._pointGraph = null;
    }


    get P(){ return this._P; }
    get k(){ return this._k; }
    set k(k){ this._k = k; }
    get triangulation() { return this._triangulation; }


    estimate(P = this._P){



        for(let i = 0; i < P.length; i++){
            if(i%10000 === 0) console.log("Normal estimation progress: " + i/(P.length) * 100 + "%");


            const p = P[i];
            let p_i_p_sub = new Vector3();
            const knn = this._tree.nearest(p, this._k);
            const C = new Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0);


            for(let k = 0; k < knn.length; k++){
                const p_i = knn[k][0];
                p_i_p_sub.subVectors(p_i, p);


                const d_ixx = p_i_p_sub.x * p_i_p_sub.x;
                const d_ixy = p_i_p_sub.x * p_i_p_sub.y;
                const d_ixz = p_i_p_sub.x * p_i_p_sub.z;

                const d_iyy = p_i_p_sub.y * p_i_p_sub.y;
                const d_iyz = p_i_p_sub.y * p_i_p_sub.z;

                const d_izz = p_i_p_sub.z * p_i_p_sub.z;


                var te = C.elements;

                te[ 0 ] += d_ixx; te[ 1 ] += d_ixy; te[ 2 ] += d_ixz;
                te[ 3 ] += d_ixy; te[ 4 ] += d_iyy; te[ 5 ] += d_iyz;
                te[ 6 ] += d_ixz; te[ 7 ] += d_iyz; te[ 8 ] += d_izz;
            }


            const H = [[C.elements[0], C.elements[1], C.elements[2]], [C.elements[3], C.elements[4], C.elements[5]], [C.elements[6], C.elements[7], C.elements[8]]];
            const ans = math.eigs(H); // returns {values: [E1,E2...sorted], vectors: [v1,v2.... corresponding vectors]}

            //index 0: eigen vector with smallest corresponding eigenvalue
            P[i].hidden_normal = new Vector3(ans.vectors[0][0], ans.vectors[0][1], ans.vectors[0][2]);
            P[i].hidden_normal.normalize();


            /** flip */
            let average = new Vector3();
            for(let k = 0; k < knn.length; k++){
                average.add(knn[k][0]);
            }
            average.multiplyScalar(1/knn.length);

            if(P[i].hidden_normal.dot(average) < 0){
                P[i].hidden_normal.multiplyScalar(-1);
            }


        }
    }
}
class MST{
    constructor(rootNode) {
        this._root = rootNode;
    }


    get root(){ return this._root; }
    set root(root){ this._root = root; }
}
class MSTNode{
    constructor(el) {
        this._el = el;
        this._children = [];
    }


    get el(){ return this._el; }
    get children() { return this._children; }
}