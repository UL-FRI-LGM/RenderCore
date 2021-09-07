/**
 * Created by Primoz on 6.6.2016.
 */
self.importScripts('acmCubes.js');



onmessage = function(msg) {
    // Retrieve data from the message
    var size = msg.data[0];
    var positions = msg.data[1];
    var values = msg.data[2];

    var start = new Date();
    console.log("Start time:" + start.toString());

    // POSITIONS MEMORY ALLOCATION
    // Get positions byte size and alloc space on the heap
    var nPosBytes = positions.length * positions.BYTES_PER_ELEMENT;
    var posPtr = Module._malloc(nPosBytes);

    // Copy positions data to the heap
    var posHeapAlloc = new Uint8Array(Module.HEAPU8.buffer, posPtr, nPosBytes);
    posHeapAlloc.set(new Uint8Array(positions.buffer));

    // VALUES MEMORY ALLOCATION
    // Get positions byte size and alloc space on the heap
    var nValBytes = values.length * values.BYTES_PER_ELEMENT;
    var valPtr = Module._malloc(nValBytes);

    // Copy values data to the heap
    var valHeapAlloc = new Uint8Array(Module.HEAPU8.buffer, valPtr, nValBytes);
    valHeapAlloc.set(new Uint8Array(values.buffer));



    var rezPoint = Module.ccall('volumeLoading',
        'number', ['number', 'number', 'number', 'number', 'number', 'number'],
        [size.x, size.y, size.z, 0, posHeapAlloc.byteOffset, valHeapAlloc.byteOffset]);


    Module._free(posPtr);
    Module._free(valPtr);

    var rezSize = getValue(rezPoint, 'float');
    var vertices = new Float32Array(rezSize-1);
    for (var i = 0; i < rezSize; i++) {
        vertices[i] = getValue(rezPoint + (4 * (i+1)), 'float')
    }

    var end = new Date();
    console.log("Processing time: " + (end - start)/1000);
    console.log(rezSize);
    postMessage([...vertices]);
};