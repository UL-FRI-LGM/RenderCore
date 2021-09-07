/**
 * Created by Primoz on 31.5.2016.
 */

M3D.MarchingCubes = class {

    constructor () {
        this._jobQueue = [];
        this._isRunning = false;

        this._MAX_TRIANGLES = 35000000; // If this threshold is reached.. The marching cubes will be aborted.
    }

    extractMesh (meta, values, nThreads, onLoad, onProgress, onError) {
        if (!onLoad) {
            console.error("Tried to execute marching cubes without onLoad callback!");
            return;
        }
        this._jobQueue.push({meta: meta, values: values, nThreads: nThreads, onLoad: onLoad, onProgress: onProgress, onError: onError});

        if (!this._isRunning) {
            this._executeNextJob();
        }
    }

    _executeNextJob() {
        this._isRunning = true;
        var self = this;

        // Split the work among workers
        var meta = this._jobQueue[0].meta;
        var nThreads = this._jobQueue[0].nThreads;

        var errorEncountered = false;
        var triangleCounter = 0;

        var start = new Date(), stop;

        if (meta.dimensions.x * meta.dimensions.y * meta.dimensions.z < 1000000 || nThreads <= 1 || meta.dimensions.z < nThreads) {
            let worker = new Worker("../../src/marching_cubes/MarchingCubesWorker.js");

            var verticeBuffers = [];

            // When single worker is used.. When the result message comes.. immediately execute the callback and move to the next task
            worker.onmessage = function(result) {
                if (errorEncountered) {
                    // Discard messages if error was encountered
                    return;
                }
                else if (result.data instanceof ArrayBuffer) {
                    verticeBuffers.push(new Float32Array(result.data));
                }
                else if (result.data.type === "triangleCount") {
                    triangleCounter += result.data.count;

                    // Check if the triangle limit was reached
                    if (triangleCounter > self._MAX_TRIANGLES) {
                        errorEncountered = true;
                        worker.terminate();
                        if (self._jobQueue[0].onError) {
                            self._jobQueue[0].onError("Maximal number of triangles exceeded. Aborting.");
                        }

                        self._jobQueue.shift();

                        // Check if there is anything left in the queue
                        if (self._jobQueue.length !== 0) {
                            self._executeNextJob();
                        }
                        else {
                            self._isRunning = false;
                        }
                    }
                }
                else if (result.data.type === "progress") {
                    if (self._jobQueue[0].onProgress) {
                        self._jobQueue[0].onProgress(result.data.zCount / meta.dimensions.z * 100);
                    }
                }
                else if (result.data.type === "finished") {
                    console.log("Num triangles: " + triangleCounter);
                    // Last (finish) message contains length of the last buffer
                    var lastLength = result.data.lastLength;
                    var lastBuffer = verticeBuffers[verticeBuffers.length - 1];
                    var clampedBuffer = new Float32Array(lastLength);

                    // Copy element and replace last buffer with clamped buffer
                    clampedBuffer.set(lastBuffer.slice(0, lastLength));
                    verticeBuffers[verticeBuffers.length - 1] = clampedBuffer;
                    lastBuffer = null;

                    // Terminate worker once finished
                    worker.terminate();

                    // Performance measurement
                    stop = new Date();
                    var time = (stop - start) / 1000;
                    console.log("Marching cubes took: " + time + " on 1 thread.");

                    // Notify user about the results
                    self._jobQueue[0].onLoad(verticeBuffers);
                    self._jobQueue.shift();

                    // Check if there is anything left in the queue
                    if (self._jobQueue.length !== 0) {
                        self._executeNextJob();
                    }
                    else {
                        self._isRunning = false;
                    }
                }
            };

            worker.onerror = function() {
                // Terminate the worker
                worker.terminate();
                errorEncountered = true;
                // Notify the listener about the error
                if (self._jobQueue[0].onError) {
                    self._jobQueue[0].onError("Something went wrong while during Marching cubes execution.");
                }
            };

            // Start the worker task
            // Pass meta data
            worker.postMessage({dimensions: meta.dimensions, voxelDimensions: meta.voxelDimensions, isoLevel: meta.isoLevel, valuesType: this._jobQueue[0].values.constructor.name});
            // Pass data
            worker.postMessage(this._jobQueue[0].values.buffer, [this._jobQueue[0].values.buffer]);

            // Clear the values once passed to the worker
            this._jobQueue[0].values = null;
        }
        else {
            // Calculate segment sizes (work distribution)
            var remainder = meta.dimensions.z % nThreads;
            var segment = Math.trunc(meta.dimensions.z / nThreads);

            // Array for combined results finish counters
            var localResults = [];
            var localProgress = new Array(nThreads).fill(0);

            // Counts number of threads that finished
            var finishedCounter = 0;

            // Work segmentation offsets
            var offset = 0;
            var zAxisOffset = 0;

            // Error management
            var workers = [];

            for (let i = 0; i < nThreads && !errorEncountered; i++) {
                // Correctly distribute the remainder
                let size = (remainder-- > 0) ? segment + 1 : segment;
                // Padding needs to be added to correctly close the gaps between segments
                let paddedSize = (i !== nThreads - 1) ? size + 1 : size;
                let chunkSize = paddedSize * meta.dimensions.x * meta.dimensions.y;

                // Split the data (slice makes shallow copy)
                let valuesSegment = this._jobQueue[0].values.slice(offset, offset + chunkSize);

                offset += size * meta.dimensions.x * meta.dimensions.y;
                localResults.push([]);

                // Initialize and start workers
                let worker = new Worker("../../src/marching_cubes/MarchingCubesWorker.js");
                workers.push(worker);

                worker.onmessage = function (result) {
                    if (errorEncountered) {
                        // Discard messages if error was encountered
                        return;
                    }
                    else if (result.data instanceof ArrayBuffer) {
                        // New vertice batch
                        localResults[i].push(new Float32Array(result.data));
                    }
                    else if (result.data.type === "triangleCount") {
                        triangleCounter += result.data.count;

                        // Check if the triangle limit was reached
                        if (triangleCounter > self._MAX_TRIANGLES) {
                            errorEncountered = true;

                            // Terminate all workers
                            for (var j = 0; j < workers.length; j++) {
                                workers[j].terminate();
                            }

                            if (self._jobQueue[0].onError) {
                                self._jobQueue[0].onError("Maximal number of triangles exceeded. Aborting.");
                            }

                            self._jobQueue.shift();

                            // Check if there is anything left in the queue
                            if (self._jobQueue.length !== 0) {
                                self._executeNextJob();
                            }
                            else {
                                self._isRunning = false;
                            }
                        }
                    }
                    else if (result.data.type === "progress") {
                        // Worker progress update
                        if (self._jobQueue[0].onProgress) {
                            localProgress[i] = result.data.zCount / paddedSize * 100;
                            self._jobQueue[0].onProgress(localProgress.reduce((a, b) => a + b, 0) / nThreads);
                        }
                    }
                    else if (result.data.type === "finished") {
                        // Worker finished
                        // Last (finish) message contains length of the last buffer
                        var lastLength = result.data.lastLength;
                        var lastBuffer = localResults[i][localResults[i].length - 1];
                        var clampedBuffer = new Float32Array(lastLength);

                        // Copy element and replace last buffer with clamped buffer
                        clampedBuffer.set(lastBuffer.slice(0, lastLength));
                        localResults[i][localResults[i].length - 1] = clampedBuffer;
                        lastBuffer = null;

                        finishedCounter ++;

                        // Clean up
                        worker.terminate();

                        // When the last worker finishes.. return the combined result via callback
                        if (finishedCounter === nThreads) {
                            console.log("Num triangles: " + triangleCounter);
                            var combinedResult = [].concat.apply([], localResults);

                            stop = new Date();
                            var time = (stop - start) / 1000;
                            console.log("Marching cubes took: " + time + " on " + nThreads + " threads.");

                            // Notify user about the results
                            self._jobQueue[0].onLoad(combinedResult);
                            self._jobQueue.shift();

                            // Check if there is anything left in the queue
                            if (self._jobQueue.length !== 0) {
                                self._executeNextJob();
                            }
                            else {
                                self._isRunning = false;
                            }
                        }
                    }
                };

                worker.onerror = function() {
                    errorEncountered = true;
                    // Terminate all workers
                    for (var i = 0; i < workers.length; i++) {
                        workers[i].terminate();
                    }
                    // Notify the listener about the error
                    if (self._jobQueue[0].onError) {
                        self._jobQueue[0].onError("Something went wrong while during Marching cubes execution.");
                    }
                };
                
                // Pass meta data
                worker.postMessage({dimensions: {x: meta.dimensions.x, y: meta.dimensions.y, z: paddedSize, zFull: meta.dimensions.z, offset: zAxisOffset},
                            voxelDimensions: meta.voxelDimensions, isoLevel: meta.isoLevel, valuesType: this._jobQueue[0].values.constructor.name});
                // Pass data
                worker.postMessage(valuesSegment.buffer, [valuesSegment.buffer]);


                zAxisOffset += size;
            }

            // Destroy the given array to gain extra memory
            this._jobQueue[0].values = null;
        }
    }
};