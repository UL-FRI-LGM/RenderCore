export class DAG{
    constructor(rootNode) {
        this._root = rootNode;
    }


    get root(){ return this._root; }
    set root(root){ this._root = root; }
}


export class DAGNode{
    constructor(el) {
        this._el = el;
        this._old = false;
        this._children = [];
    }


    get el(){ return this._el; }
    get old() { return this._old; }
    set old(old){ this._old = old; }
    get children() { return this._children; }
}