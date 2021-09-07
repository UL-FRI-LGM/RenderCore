/**
 * Created by Sebastien.
 */
import {LoadingManager} from './LoadingManager.js';

export class XHRStreamer {
    constructor (manager = new LoadingManager(),  responseType = "", chunkSize) {
        this._manager = manager;
        this._responseType = responseType;
        this._chunkSize = chunkSize;

        this._size = 0;
        this._position = 0;
        this._chunkSizeDownlaoded = 0;
    }

    load (url, onLoad, onProgress, onError, onAbort, onHeaderLoad, onLoadChunk) {
        const scope = this;


        this.get_fileSize(
            url,
            function(size){
                scope._size = size;
                //console.log("The size of " + url + " is: " + size + " bytes.");


                onHeaderLoad({size: scope._size, type: "bytes"});
                scope.get_fileData(scope, url, onLoad, onProgress, onError, onAbort, onLoadChunk);
            }
        );
    }


    get_fileSize(url, callback) {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function(ev) {
            if (this.readyState === this.DONE) {
                callback(parseInt(xhr.getResponseHeader("Content-Length")));
            }
        };

        xhr.open("HEAD", url, true);
        xhr.send();
    }

    get_fileData(scope, url, onLoad, onProgress, onError, onAbort, onLoadChunk){
        const request = new XMLHttpRequest();// readyState will be 0
        request.responseType = this._responseType;

        request.onreadystatechange = function(ev){

            if(this.readyState === this.LOADING){
                //3
            }else if(this.readyState === this.DONE){
                //4
                //The fetch operation is complete. This could mean that either the data transfer has been completed successfully or failed.
            }
        };

        request.onprogress = function(ev){
            // readyState will be 3
            onProgress(ev);
        };
        request.onload = function(ev){
            // readyState will be 4
            //The fetch operation is complete. This could mean that either the data transfer has been completed successfully or failed.

            //console.log("status change.. status: "+ request.status);

            if(this.status === 206){
                scope._position += scope._chunkSize;
                const chunkData = request.response;

                //onProgress(ev);
                //scope._chunkSizeDownlaoded += parseInt(request.getResponseHeader("Content-Length"));
                //console.log(scope._chunkSizeDownlaoded / scope._size * 100 + '%');

                if(scope._position < scope._size) {
                    onLoadChunk(chunkData);

                    //next load
                    request.open("GET", url, true);
                    request.setRequestHeader("Range", "bytes=" + scope._position + '-' + (scope._position + scope._chunkSize - 1));
                    request.send();

                    //onLoadChunk(chunkData);
                }else{
                    scope._manager.itemEnd( url );

                    onLoadChunk(chunkData);
                    onLoad(ev)
                }
            }else{
                scope._manager.itemError( url );
            }

        };
        request.onerror = function(ev){
            onError(ev);
            scope._manager.itemError( url );
        };
        request.onabort = function(ev){
            onAbort(ev);
        }

        request.open("GET", url, true);// readyState will be 1
        request.setRequestHeader("Range", "bytes=" + this._position + '-' + (this._position + this._chunkSize - 1));
        request.send();


        // Notify the LoadingManager that the item started loading from the received url
        this._manager.itemStart( url );
    }


};