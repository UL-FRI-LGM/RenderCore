import {_Math} from '../math/Math.js';


export class RenderArray{
    constructor(){
        // Unique identifier
        this._uuid = _Math.generateUUID();
        this._renderArray = [];
        this._renderArrayLength = this._renderArray.length;
    }


    //SET/GET
    get uuid(){ return this._uuid; }
    get renderArray(){ return this._renderArray; }
    get length(){ return this._renderArray.length; }


    //FUNC
    push(object){
        return this._renderArray.push(object);
    }
    pop(){
        return this._renderArray.pop();
    }

    add(object, index){
        this.addlast(object);
    }
    addlast(object){
        return this._renderArray.push(object);
    }
    remove(object, index){
        this.removeLast(object);
    }
    removeLast(){
        return this._renderArray.pop();
    }

    clear(){
        this._renderArray = new Array();
    }
    get(index){
        return this._renderArray[index];
    }

    //TODO: sort only first k elements
    sort(sortFunction){
        this._renderArray.sort(sortFunction);
    }
}