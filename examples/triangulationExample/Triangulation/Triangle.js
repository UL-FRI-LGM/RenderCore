import {Edge} from "./Edge.js";


export class Triangle{
    constructor(e1, e2, e3) {
        this._v1 = null;
        this._v2 = null;
        this._v3 = null;

        this._e1 = e1;
        this._e2 = e2;
        this._e3 = e3;

        this._e1.t.push(this);
        this._e2.t.push(this);
        this._e3.t.push(this);
        /**if(this._e1.t[0] === null){
            this._e1.t[0] = this;
        }else if(this._e1.t[1] === null){
            this._e1.t[1] = this;
        }else{
            console.error("init !!");
            console.error(this._e1.t);
            console.error("----");
        }
        if(this._e2.t[0] === null){
            this._e2.t[0] = this;
        }else if(this._e2.t[1] === null){
            this._e2.t[1] = this;
        }else{
            console.error("init !!");
            console.error(this._e2.t);
            console.error("----");
        }
        if(this._e3.t[0] === null){
            this._e3.t[0] = this;
        }else if(this._e3.t[1] === null){
            this._e3.t[1] = this;
        }else{
            console.error("init !!");
            console.error(this._e3.t);
            console.error("----");
        }**/

        //orientation
        //this._v1 = ((this._e1.v1 === this._e3.v1) ? this._e1.v1 : this._e1.v2);
        this._v1 = ((this._e1.v1 === this._e3.v2) ? this._e1.v1 : (this._e1.v1 === this._e3.v1) ? this._e1.v1 : this._e1.v2);
        this._v2 = ((this._e2.v1 === this._e1.v2) ? this._e2.v1 : (this._e2.v1 === this._e1.v1) ? this._e2.v1 : this._e2.v2);
        this._v3 = ((this._e3.v1 === this._e2.v2) ? this._e3.v1 : (this._e3.v1 === this._e2.v1) ? this._e3.v1 : this._e3.v2);


        this._pointFoundOnBorder = false;
        this._pointIntersectionEdge = null;

        //DAG
        this._old = false;
        this._children = [];
    }


    get v1() { return this._v1; }
    get v2() { return this._v2; }
    get v3() { return this._v3; }

    get e1() { return this._e1; }
    get e2() { return this._e2; }
    get e3() { return this._e3; }

    get pointFoundOnBorder(){ return this._pointFoundOnBorder; }
    set pointFoundOnBorder(pointFoundOnBorder){ this._pointFoundOnBorder = pointFoundOnBorder; }
    get pointIntersectionEdge(){ return this._pointIntersectionEdge; }
    set pointIntersectionEdge(pointIntersectionEdge){ this._pointIntersectionEdge = pointIntersectionEdge; }

    get old() { return this._old; }
    set old(old){ this._old = old; }
    get children() { return this._children; }


    equals(t){
        const bool1 = this._e1.equals(t.e1) && this._e2.equals(t.e2) && this._e3.equals(t.e3);
        const bool2 = this._e1.equals(t.e1) && this._e2.equals(t.e3) && this._e3.equals(t.e2);

        const bool3 = this._e1.equals(t.e2) && this._e2.equals(t.e3) && this._e3.equals(t.e1);
        const bool4 = this._e1.equals(t.e2) && this._e2.equals(t.e1) && this._e3.equals(t.e3);

        const bool5 = this._e1.equals(t.e3) && this._e2.equals(t.e1) && this._e3.equals(t.e2);
        const bool6 = this._e1.equals(t.e3) && this._e2.equals(t.e2) && this._e3.equals(t.e1);

        return ( bool1 || bool2 || bool3 || bool4 || bool5 || bool6 );
    }


    nextVertexOfVertex(v){
        if(this._v1 === v){
            return this._v2;
        }else if(this._v2 === v){
            return this._v3;
        }else if (this._v3 === v){
            return this._v1;
        }else{
            console.warn("!!");
            return null;
        }
    }
    prevVertexOfVertex(v){
        if(this._v1 === v){
            return this._v3;
        }else if(this._v2 === v){
            return this._v1;
        }else if (this._v3 === v){
            return this._v2;
        }else{
            console.warn("!!");
            return null;
        }
    }
    nextEdgeOfEdge(e){
        if(this._e1 === e){
            return this._e2;
        }else if(this._e2 === e){
            return this._e3;
        }else if (this._e3 === e){
            return this._e1;
        }else{
            console.warn("!!");
            return null;
        }
    }
    prevEdgeOfEdge(e){
        if(this._e1 === e){
            return this._e3;
        }else if(this._e2 === e){
            return this._e1;
        }else if (this._e3 === e){
            return this._e2;
        }else{
            console.warn("!!");
            return null;
        }
    }
    oppositeVertexOfEdge(e){
        if(!(this._e1 === e || this._e2 === e || this._e3 === e)) console.warn("!!");

        if(this._v1 !== e.v1 && this._v1 !== e.v2){
            return this._v1;
        }else if(this._v2 !== e.v1 && this._v2 !== e.v2){
            return this._v2;
        }else if(this._v3 !== e.v1 && this._v3 !== e.v2){
            return this._v3;
        }else{
            console.warn("!!");
            return null;
        }
    }
}