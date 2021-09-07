export class Edge{
    constructor(v1, v2){
        this._v1 = v1;
        this._v2 = v2;

        this._t = [];
        /**this._t.push(null, null);*/

        this._special = false;
        this._old = false;
    }


    get v1() { return this._v1; }
    get v2() { return this._v2; }
    set v1(v1) { this._v1 = v1; }
    set v2(v2) { this._v2 = v2; }

    get t() { return this._t; }

    get special() { return this._special; }
    set special(special) { this._special = special; }

    get old() { return this._old; }
    set old(old){ this._old = old; }


    equals(e){
        const bool1 = this._v1.equals(e.v1) && this._v2.equals(e.v2);
        const bool2 = this._v1.equals(e.v2) && this._v2.equals(e.v1);

        return ( bool1 || bool2 );
    }

    removeTriangle(triangle){
        //find triangle
        let statusOK = false;

        for(let i = 0; i < this._t.length; i++){
            if(this._t[i] === triangle){ //zbrises ce je isti objekt (ce je isti pointer)

                //remove from triangle array
                this._t.splice(i, 1);

                statusOK = true;
                break;
            }
        }
        /**if(this._t[0] === triangle){
            this._t[0] = null;
            statusOK = true;
        }else if(this._t[1] === triangle){
            this._t[1] = null;
            statusOK = true;
        }else{
            console.error("!!");
        }*/

        if(!statusOK)console.error("Triangle not deleted!");
    }

    hasVertex(v){
        return (this._v1 === v || this._v2 === v);
    }
    attachedTriangle(v){
        if(this._t[0]._v1 === v || this._t[0]._v2 === v || this._t[0]._v3 === v){
            return this._t[0];
        }else if(this._t[1]._v1 === v || this._t[1]._v2 === v || this._t[1]._v3 === v){
            return this._t[1];
        }else{
            console.warn("!!");
            return null;
        }
    }
    oppositeTriangle(v){
        if(this._t[0]._v1 === v || this._t[0]._v2 === v || this._t[0]._v3 === v){
            return this._t[1];
        }else if(this._t[1]._v1 === v || this._t[1]._v2 === v || this._t[1]._v3 === v){
            return this._t[0];
        }else{
            console.warn("!!");
            return null;
        }
    }
}