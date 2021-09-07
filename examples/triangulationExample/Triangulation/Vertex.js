export class Vertex{
    constructor(point) {
        this._x = point.x;
        this._y = point.y;

        this._edges = []; //many
        this._triangles = []; //many
    }


    get x(){ return this._x; }
    get y(){ return this._y; }


    equals(v){
        return (this._x === v.x && this._y === v.y);
    }
}