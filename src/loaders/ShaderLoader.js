/**
 * Created by primoz on 14.5.2016.
 */

import {LoadingManager} from './LoadingManager.js';
import {XHRLoader} from './XHRLoader.js';

export class ShaderLoader {

	static sAllPrograms = new Set();

	// The shader library, programs whose sources are held in memory rather than fetched,
	// registered with addLibrary(). Every ShaderLoader takes these programs into its table
	// ahead of the ones from its urls. sLibraryVersion counts the calls, so that a loader
	// made before a call picks up its programs on its next use.
	static sLibraryPrograms = {};
	static sLibrarySources = {};
	static sLibraryVersion = 0;

	/**
	 * Registers a shader library with every ShaderLoader, those made before the call too.
	 * A program of the library is loaded from memory, with no request, and its sources are
	 * available within the loadProgramSources() call that asks for it.
	 * @param programs Program table in the shape of shaders/programs.json:
	 *        name -> {description, shaders: {vertex: path, fragment: path}}
	 * @param sources Map from those paths to the shader sources
	 */
	static addLibrary(programs, sources) {
		Object.assign(ShaderLoader.sLibrarySources, sources);
		for (const name in programs) {
			if (ShaderLoader.sLibraryPrograms[name] === undefined)
				ShaderLoader.sLibraryPrograms[name] = programs[name];
		}
		ShaderLoader.sLibraryVersion++;
	}

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

		// Names of the programs in this._programs that came from the shader library
		this._libraryNames = new Set();
		this._libraryVersion = -1;
		this._mergeLibrary();


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
	 * Takes the programs of the shader library that are not in the table yet into it, if
	 * addLibrary() was called since the last merge. A program already in the table, from
	 * the library or from a url, keeps its entry.
	 */
	_mergeLibrary() {
		if (this._libraryVersion === ShaderLoader.sLibraryVersion)
			return;
		this._libraryVersion = ShaderLoader.sLibraryVersion;

		for (const name in ShaderLoader.sLibraryPrograms) {
			if (this._programs[name] === undefined) {
				this._programs[name] = structuredClone(ShaderLoader.sLibraryPrograms[name]);
				this._libraryNames.add(name);
			}
		}
	}


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
	 * Loads the shader sources for the requested program template. A program of the shader library is
	 * loaded from memory, and the callbacks are called before this function returns unless an earlier
	 * load is still in progress. Any other program is loaded asynchronously from its url. If the program
	 * is not in the table and there are urls pending for the program list fetch, it quietly tries to
	 * fetch the lists first.
	 * @param {string} program Name of the program template.
	 * @param {function} [onLoad] Called when all of the shader sources finish loading. Loaded program sources are passed as argument.
	 * @param {function} [onProgress] Called for every loaded shader source, indicates the progress status
	 * @param {function} [onError] Called whenever XHR loader encounters an error while loading the sources
	 */
	loadProgramSources (program, onLoad, onProgress, onError) {

		this._mergeLibrary();

		// Update program lists if the program is not known and there are any pending urls
		if (this._programs[program] === undefined && this._pending_urls.length > 0) {
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

			// A program of the shader library, with every source in memory
			if (scope._libraryNames.has(program) &&
				shaderTypes.every(type => ShaderLoader.sLibrarySources[shaders[type]] !== undefined)) {
				ShaderLoader.sAllPrograms.add(program);

				programTemplate.id = program;
				for (const shaderType of shaderTypes) {
					programTemplate.sources[shaderType] = ShaderLoader.sLibrarySources[shaders[shaderType]];
				}

				if (onProgress !== undefined) {
					var progressEvent = new ProgressEvent("ShaderSourceLoaded", {lengthComputable: true, loaded: numShaders, total: numShaders});
					onProgress(progressEvent);
				}
				if (onLoad !== undefined) {
					onLoad(programTemplate);
				}

				// Notify executor
				doneCallback();
				return;
			}

			// A library program with a source missing, and no url to fall back on
			if (progTemplate.urls === undefined) {
				if (onError !== undefined) {
					onError();
				}
				doneCallback();
				return;
			}

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
	get programList() { this._mergeLibrary(); return Object.keys(this._programs); }

	/**
	 * Resolve an iterable list of program names and return a list of copies
	 * of program entries. This can be used for extraction of a subset of shaders
	 * for packaging, most likely called with ShaderLoader.sAllPrograms as argument.
	 * One might want to delete urls property of each element.
	*/
	resolvePrograms (name_list, delete_urls=true) {
		this._mergeLibrary();
		let prog_list = {};
		for (let name of name_list) {
			let details = structuredClone(this._programs[name]);
			if (delete_urls)
				delete details.urls;
			prog_list[name] = details;
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