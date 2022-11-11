/**
 * Created by primoz on 14.5.2016.
 */

import {LoadingManager} from './LoadingManager.js';
import {XHRLoader} from './XHRLoader.js';

export class ShaderLoader {

	static sAllPrograms = new Set();

	/**
	 * Creates new ShaderLoader object with the given LoadingManager. If the LoadingManager is not defined..
	 * Default manager is used.
	 * @param xhrManager
	 * @param urls
	 */
	constructor(xhrManager = new LoadingManager(), urls = []) {
		this._xhrLoader = new XHRLoader(xhrManager);

		// Array of URL-s whose version should be retrieved
		this._pending_urls = [];
		this._programs = {};
		this._executor = this.executor;


		// Queue for execution scheduling
		this._queue = [];

		// Tells if the executor is currently running
		this._inProgress = false;
	}


	/**
	 * Adds the given urls to the searched urls list.
	 * @param urls Adding urls via REST parameter
	 */
	addUrls(...urls) {
		// Unique merge arrays
		for (var i = 0; i < urls.length; i++) {
			if (urls[i].slice(-1) !== "/") {
				urls[i] += "/"
			}
		}

		this._pending_urls = [...new Set([].concat(this._pending_urls, urls))];
	};


	/**
	 * Fetches program list from the pending urls. Program list is a json object referencing all of the programs in the
	 * url directory.
	 * This call is executed on the loader executor to synchronize the calls.
	 * @param {function} [onLoad] Called when all of the program lists finish loading. Program names are passed as argument
	 * @param {function} [onProgress] Called for every loaded program, indicates the progress status
	 * @param {function} [onError] Called whenever XHR loader encounters an error while loading the sources
	 * */
	loadProgramList (onLoad, onProgress, onError) {
		// Used for passing the scope to executable
		var scope = this;

		var executable = function (doneCallback) {
			const numUrls = scope._pending_urls.length;
			var numLoaded = 0;

			for (var i = 0; i < numUrls; i++) {
				const url = scope._pending_urls[i];


				// On Load callbacks
				var onLoadProgramList = function (data) {
					var programs = JSON.parse(data);

					// Add parsed programs to the programs list
					var name;
					for (name in programs) {
						var program = scope._programs[name];

						// Check if this is the first occurrence of this program
						if (program === undefined) {
							program = programs[name];
							scope._programs[name] = program;
						}

						// Add url to program template
						if (program.urls === undefined) {
							program.urls = [url];
						}
						else {
							program.urls.push(url);
						}
					}

					numLoaded ++;

					// Check if the onProgress callback was given
					if (onProgress !== undefined) {
						// Notify the user about the progress (returns number of the loaded program lists)
						var progressEvent = new ProgressEvent("ProgramListLoaded", {lengthComputable: true, loaded: numLoaded, total: numUrls});
						onProgress(progressEvent);
					}

					// Check if everything is finished
					if (numUrls === numLoaded) {
						// Check if the onLoad callback was given
						if (onLoad !== undefined) {
							onLoad(scope._programs);
						}

						doneCallback();
					}
				};

				var onErrorProgramList = function (event) {
					numLoaded ++;

					// Check if the onError callback was locally passed
					if (onError !== undefined) {
						onError(event);
					}

					// Check if the onProgress callback was given
					if (onProgress !== undefined) {
						// Notify the user about the progress (returns number of the loaded program lists)
						var progressEvent = new ProgressEvent("ProgramListLoaded", {lengthComputable: true, loaded: numLoaded, total: numUrls});
						onProgress(progressEvent);
					}

					// Check if everything is finished
					if (numUrls === numLoaded) {
						// Check if the onLoad callback was given
						if (onLoad !== undefined) {
							onLoad(scope._programs);
						}

						doneCallback();
					}
				};

				// Initiate loading
				scope._xhrLoader.load(url + "programs.json", onLoadProgramList, undefined, onErrorProgramList);
			}

			// Clear pending urls
			scope._pending_urls = [];
		};

		// Schedule executable
		this._executor(executable);
	}

	/**
	 * Asynchronously loads the shader sources for the requested program template. If there are any urls pending
	 * for the program list fetch, it quietly tries to fetch the lists.
	 * @param {string} program Name of the program template.
	 * @param {function} [onLoad] Called when all of the shader sources finish loading. Loaded program sources are passed as argument.
	 * @param {function} [onProgress] Called for every loaded shader source, indicates the progress status
	 * @param {function} [onError] Called whenever XHR loader encounters an error while loading the sources
	 */
	loadProgramSources (program, onLoad, onProgress, onError) {

		// Update program lists if there are any pending urls
		if (this._pending_urls.length > 0) {
			this.loadProgramList();
		}

		// Used for passing the scope to executable
		var scope = this;

		var executable = function (doneCallback) {

			const progTemplate = scope._programs[program];

			// Check if this program is not mapped
			if (progTemplate === undefined) {
				onError();
				doneCallback();
				return;
			}

			// Shader list
			var shaders = progTemplate.shaders;
			var shaderTypes = Object.keys(shaders);

			// Used for progress indicator
			var numLoaded = 0;
			const numShaders = shaderTypes.length;

			// Shaders sources are loaded into this object
			var programTemplate = {};
			programTemplate.sources = {};


			for (var i = 0; i < shaderTypes.length; i++) {
				const shaderType = shaderTypes[i];

				var onLoadShader = function (source) {
					numLoaded ++;
					ShaderLoader.sAllPrograms.add(program);

					// Check if the onProgress callback was given
					if (onProgress !== undefined) {
						// Notify the user about the progress (returns number of the loaded program lists)
						var progressEvent = new ProgressEvent("ShaderSourceLoaded", {lengthComputable: true, loaded: numLoaded, total: numShaders});
						onProgress(progressEvent);
					}

					// Attach sources to the template
					programTemplate.id = program;
					programTemplate.sources[shaderType] = source;

					// Check if everything is finished
					if (numLoaded === numShaders) {
						// Check if the onLoad callback was given
						if (onLoad !== undefined) {
							onLoad(programTemplate);
						}

						// Notify executor
						doneCallback();
					}
				};

				var onErrorShader = function (event) {
					numLoaded ++;

					// Check if the onProgress callback was given
					if (onProgress !== undefined) {
						// Notify the user about the progress (returns number of the loaded program lists)
						var progressEvent = new ProgressEvent("ShaderSourceLoaded", {lengthComputable: true, loaded: numLoaded, total: numShaders});
						onProgress(progressEvent);
					}

					if (onError !== undefined) {
						onError(event);
					}

					// Check if everything is finished
					if (numLoaded === numShaders) {
						// Check if the onLoad callback was given
						if (onLoad !== undefined) {
							onLoad(programSources);
						}

						// Notify executor
						doneCallback();
					}
				};

				// Path to shader
				const fullPath = progTemplate.urls[0] + shaders[shaderType];

				scope._xhrLoader.load(fullPath, onLoadShader, undefined, onErrorShader);
			}
		};

		// Schedule executable
		this._executor(executable);
	};


	/**
	 * Asynchronously loads shader sources of multiple programs for the requested program templates. Programs are loaded
	 * via loadProgramSources function.
	 * @param programs List of program templates names
	 * @param onLoad Called when all of the programs sources finish loading. Loaded program sources are passed as argument.
	 * @param onProgress Called for every loaded program, indicates the progress status
	 * @param onError Called whenever XHR loader encounters an error while loading the sources
	 */
	loadMultipleProgramSources (programs, onLoad, onProgress, onError) {

		var numLoaded = 0;
		const numPrograms = programs.length;

		var programsSources = [];

		var onLoadProgram = function (sources) {
			numLoaded ++;

			// Add sources to return list
			programsSources.push(sources);

			// Check if the onProgress callback was given
			if (onProgress !== undefined) {
				// Notify the user about the progress (returns number of the loaded program lists)
				var progressEvent = new ProgressEvent("ProgramSourcesLoaded", {lengthComputable: true, loaded: numLoaded, total: numPrograms});
				onProgress(progressEvent);
			}

			// Check if finished
			if (onLoad !== undefined && numLoaded === numPrograms) {
				onLoad(programsSources);
			}
		};

		var onErrorProgram = function (event) {
			numLoaded ++;

			// Check if the onProgress callback was given
			if (onProgress !== undefined) {
				// Notify the user about the progress (returns number of the loaded program lists)
				var progressEvent = new ProgressEvent("ProgramSourcesLoaded", {lengthComputable: true, loaded: numLoaded, total: numPrograms});
				onProgress(progressEvent);
			}

			if (onError != null) {
				onError(event);
			}

			// Check if finished
			if (onLoad !== undefined && numLoaded === numPrograms) {
				onLoad(programsSources);
			}
		};

		for (var i = 0; i < numPrograms; i++) {
			this.loadProgramSources(programs[i], onLoadProgram, undefined, onErrorProgram);
		}
	}

	/**
	 * Returns names of available programs
	 */
	get programList() { return Object.keys(this._programs); }

	/**
	 * Resolve an iterable list of program names and return a list of copies
	 * of program entries. This can be used for extraction of a subset of shaders
	 * for packaging, most likely called with ShaderLoader.sAllPrograms as argument.
	 * One might want to delete urls property of each element.
	*/
	resolvePrograms (name_list) {
		let prog_list = [];
		for (let name of name_list) {
			prog_list.push(structuredClone(this._programs[name]));
		}
		return prog_list;
	}

	// In-order executor
	executor (executable, ...args) {
		const scope = this;

		// Schedule new executable
		this._queue.push({exec: executable, args: args});

		// If the executor is currently not running. Start it.
		if (this._inProgress === false) {
			this._inProgress = true;

			var finishedCallback = function () {
				// Check if anything is left in the queue
				if (scope._queue.length > 0) {
					var runnable = scope._queue.shift();
					runnable.exec(finishedCallback, runnable.args);
				}
				else {
					scope._inProgress = false;
				}
			};

			// Start executing
			finishedCallback();
		}

	}
};