import {Matrix3} from "../../../src/math/Matrix3.js";
import {Vector2} from "../../../src/math/Vector2.js";
import {Vector3} from "../../../src/math/Vector3.js";


export class OutlierRemover{
    constructor(P, k = 8, eta = 1.0) {
        this._P = P;
        this._k = k; //num nearest neighbours
        this._eta = eta;
        this._triangulation = null;


        this._distance = function(a, b){
            return Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2);
        };

        console.log("Building KD tree...");
        this._tree = new kdTree(this._P, this._distance, ["x", "y"]);
    }


    get P(){ return this._P; }
    get k(){ return this._k; }
    set k(k){ this._k = k; }
    get eta(){ return this._eta; }
    set eta(eta){ this._eta = eta; }
    get triangualtion() { return this._triangulation; }


    remove(P = this._P){
        for(let i = 0; i < P.length; i++){
            if(i%10000 === 0) console.log("Outlier removing progress: " + i/(P.length) * 100 + "%");


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
            const lambda2 = ans.values[2];
            const lambda3 = ans.values[1];
            if(lambda3 / lambda2 > this._eta){
                console.warn("Outlier removed: " + (lambda3 / lambda2));

                /** mark removed */
                P[i].hidden_outlier = true;
            }else{
                P[i].hidden_outlier = false;
            }
        }


        /** remove */
        const newP = [];
        for(let i = 0; i < P.length; i++){
            if(P[i].hidden_outlier === false){
                newP.push(P[i]);
            }
        }


        return newP;
    }

}