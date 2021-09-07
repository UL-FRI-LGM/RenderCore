export class KDTree {
    constructor(points, depth){
        this._points = points;
        this._depth = depth;





        this.build(points, depth);
    }


    get points(){ return this._points; }
    set points(points){ this._points = points; }
    get depth(){ return this._depth; }
    set depth(depth){ this._depth = depth; }


    build(points, depth){
        if (!points || points.length === 0) return;


        const node = {};


        // alternate between the axis
        const axis = depth % points[0].length;


        // sort point array
        points.sort((a, b) => a[axis] - b[axis]);


        // median
        const median = Math.floor(points.length / 2);


        // build and return node
        node.location = points[median];
        node.left = new KDTree(points.slice(0, median), depth + 1);
        node.right = new KDTree(points.slice(median + 1), depth + 1);

        return node;
    }
}