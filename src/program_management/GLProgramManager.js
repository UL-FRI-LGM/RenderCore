/**
 * Created by Primoz on 25.4.2016.
 */

import {VERTEX_SHADER, FRAGMENT_SHADER} from '../constants.js';
import {ShaderBuilder} from './ShaderBuilder.js';
import {GLProgram} from './GLProgram.js';

export class GLProgramManager {

	constructor (gl) {
		this._gl = gl;
		this._shaderBuilder = new ShaderBuilder();
		this._compiledPrograms = {};
	}

	/**
	 * Checks if shader builder already contains the template with the given name
	 * @param templateName Program template name
	 * @returns {boolean} Returns true if the template exists in the shade builder
	 */
	isTemplateDownloaded(programID) {
		return this._shaderBuilder.hasTemplate(programID + VERTEX_SHADER) && this._shaderBuilder.hasTemplate(programID + FRAGMENT_SHADER);
	}

	addTemplate(programTemplateSrc) {
		/**
		 * TEMPLATE FORMAT: {id: "program name", sources: {shader_i_type: shader_i_source, ... i = [0, N]}}
		 */

		let programID = programTemplateSrc.id;
		let sources = programTemplateSrc.sources;
		let shaderTypes = Object.keys(sources);

		// Build the template tree for every shader
		for (let i = 0; i < shaderTypes.length; i++) {
			// TODO: Should we throw exception here or allow bad programs?
			this._shaderBuilder.buildTemplateTree(programID + shaderTypes[i], sources[shaderTypes[i]]);
		}
	}

	fetchProgram (programTemplate, numDLights, numPLights, numSLights) {
		const address = programTemplate.programID + "NUM_DLIGHTS" + numDLights + "NUM_PLIGHTS" + numPLights + "NUM_SLIGHTS" + numSLights;
		let compiledProgram = this._compiledPrograms[address];

		// Check if the program is already compiled
		if (compiledProgram !== undefined) {
			return compiledProgram;
		}

		// Create new program
		compiledProgram = new GLProgram(this._gl);

		// region LIGHTS INIT
		// Add number of lights (so that shader is built with correct light count)
		programTemplate.values["NUM_DLIGHTS"] = numDLights;
		programTemplate.values["NUM_PLIGHTS"] = numPLights;
		programTemplate.values["NUM_SLIGHTS"] = numSLights;

		// If there are no lights.. do not create lights array (in shader)
		if (numDLights + numPLights === 0){
			programTemplate.flags.push("NO_LIGHTS");
		}
		if (numDLights > 0) {
			programTemplate.flags.push("DLIGHTS");
		}
		if (numPLights > 0) {
			programTemplate.flags.push("PLIGHTS");
		}
		if (numSLights > 0) {
			programTemplate.flags.push("SLIGHTS");
		}
		// endregion LIGHTS INIT

		// Build shader sources
		let vertexSources = this._shaderBuilder.fetchShader(programTemplate.name + VERTEX_SHADER, programTemplate.flags, programTemplate.values);
		let fragmentSources = this._shaderBuilder.fetchShader(programTemplate.name + FRAGMENT_SHADER, programTemplate.flags, programTemplate.values);

		// Check if the shader sources are valid
		if (vertexSources === undefined || fragmentSources === undefined) {
			console.error("FAILED TO BUILD SHADER PROGRAM!");
			return undefined;
		}

		// Compile shaders
		let vertexShader = this._compileShader(vertexSources, this._gl.VERTEX_SHADER);
		let fragmentShader = this._compileShader(fragmentSources, this._gl.FRAGMENT_SHADER);

		// Attach fragment and vertex shader
		compiledProgram.attachShader(vertexShader);
		compiledProgram.attachShader(fragmentShader);

		// Program linking
		this._gl.linkProgram(compiledProgram.glProgram);

		if (!this._gl.getProgramParameter(compiledProgram.glProgram, this._gl.LINK_STATUS) ) {
			let info = this._gl.getProgramInfoLog(compiledProgram.glProgram);
			console.error("Could not compile WebGL program. \n\n" + info);
			console.log("VERTEX SHADER:\n" + vertexSources + "\n\n\n");
			console.log("FRAGMENT SHADER:\n" + fragmentSources);
		}

		// Delete shaders as they are no longer needed
		this._gl.deleteShader(vertexShader);
		this._gl.deleteShader(fragmentShader);

		// Initialize setters
		compiledProgram.attributeSetter = this._initAttributeSetter(compiledProgram.glProgram);
		compiledProgram.uniformSetter = this._initUniformSetter(compiledProgram.glProgram);

		// Mark as initialized
		compiledProgram.initialized = true;

		// Add program to the compiled programs list
		this._compiledPrograms[address] = compiledProgram;

		return compiledProgram
	}

	/**
	 * Initializes attribute setter based on the compiled shaders
	 * @private
	 */
	_initAttributeSetter (program) {
		var attributeSetter = {};

		// Self reference is needed in setter scope
		var self = this;

		var n = this._gl.getProgramParameter(program, this._gl.ACTIVE_ATTRIBUTES);

		for (var i = 0; i < n; i++) {
			// Retrieve attribute name
			const info = this._gl.getActiveAttrib(program, i);
			const location = self._gl.getAttribLocation(program, info.name);

			let gl = this._gl;
			let t = info.type;
			let type;
			if (t == gl.INT || t == gl.INT_VEC2 || t == gl.INT_VEC3 || t == gl.GL_INT_VEC4) {
				type = gl.INT;
			} else if (t == gl.UNSIGNED_INT, t == gl.UNSIGNED_INT_VEC2 || t == gl.UNSIGNED_INT_VEC3 || t == gl.UNSIGNED_INT_VEC4) {
				type = gl.UNSIGNED_INT;
			} else {
				type = gl.FLOAT;
			}

			// Create attribute setter function
			attributeSetter[info.name] = {};
			attributeSetter[info.name]['set'] = function (buffer, item_size, instanced = false, divisor = 0,
                                                          utype = 0, unormalized = false) {
				// Caller can use utype and unormalized to pass the actual array type and
				// int/uint to float normalization flag.
				// Alternatively, one could check buffer.array.constructor.name but this is not
				// a good place for string comparisons etc. Normalize flag could still not be deduced.
				// Best place to put those would probably be BufferAttribute.
				if (utype == 0)
					utype = type;
				if(item_size <= 4){
					self._gl.enableVertexAttribArray(location);
					self._gl.bindBuffer(self._gl.ARRAY_BUFFER, buffer);
					if (type == self._gl.FLOAT){
						self._gl.vertexAttribPointer(location, item_size, utype, unormalized, 0, 0);
					}else{
						self._gl.vertexAttribIPointer(location, item_size, utype, 0, 0);
					}
					if(instanced) {
						self._gl.vertexAttribDivisor(location, divisor);
					}else{
						self._gl.vertexAttribDivisor(location, 0);
					}
				}else{
					self._gl.bindBuffer(self._gl.ARRAY_BUFFER, buffer);

					for(let i = 0; i < item_size/4; i++){
						self._gl.enableVertexAttribArray(location + i);
						if (type == self._gl.FLOAT){
							self._gl.vertexAttribPointer(location + i, 4, utype, unormalized, 4*16, i*16);
						}else{
							self._gl.vertexAttribIPointer(location + i, 4, utype, 4*16, i*16);
						}
						if(instanced) {
							self._gl.vertexAttribDivisor(location + i, divisor);
						}else{
							self._gl.vertexAttribDivisor(location + i, 0);
						}
					}

				}
			};

			// Create attribute pointer freeing function
			attributeSetter[info.name]['free'] = function () {
				self._gl.disableVertexAttribArray(location);
			};
		}

		return attributeSetter;
	}

	/**
	 * Initializes uniform setter based on the compiled shaders
	 * @private
	 */
	_initUniformSetter (program) {
		var uniformSetter = {};

		// Self reference is needed in setter scope
		var self = this;

		var n = this._gl.getProgramParameter(program, this._gl.ACTIVE_UNIFORMS);

		// Used for validation if all of the uniforms are set
		uniformSetter.__validation = {
			uniforms: {},

			reset() {
				// Marks all of the uniforms as not set
				for (let uniformName in this.uniforms) {
					if (this.uniforms.hasOwnProperty(uniformName)) {
						this.uniforms[uniformName] = false;
					}
				}
			},

			validate() {
				let notSet = [];

				// Generates list of uniforms that are not set
				for (let uniformName in this.uniforms) {
					if (this.uniforms.hasOwnProperty(uniformName) && !this.uniforms[uniformName]) {
						notSet.push(uniformName);
					}
				}

				return notSet;
			}
		};

		for (let i = 0; i < n; i++) {
			// Fetch uniform info and location
			const info = self._gl.getActiveUniform(program, i);
			const location = self._gl.getUniformLocation(program, info.name);

			uniformSetter[info.name] = {};

			// Add uniform to validation checker
			uniformSetter.__validation.uniforms[info.name] = false;

			switch (info.type) {
				case self._gl.FLOAT:

					if (info.size > 1) {
						// Array
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform1fv(location, value);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					else {
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform1f(location, value);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					break;

				case self._gl.FLOAT_VEC2:

					if (info.size > 1) {
						// Array
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform2fv(location, value);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					else {
						// Single value
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform2f(location, value[0], value[1]);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}

					break;

				case self._gl.FLOAT_VEC3:
					if (info.size > 1) {
						// Array
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform3fv(location, value);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					else {
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform3f(location, value[0], value[1], value[2]);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					break;

				case self._gl.FLOAT_VEC4:
					if (info.size > 1) {
						// Array
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform4fv(location, value);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					else {
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform4f(location, value[0], value[1], value[2], value[3]);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					break;

				case self._gl.FLOAT_MAT3:
					uniformSetter[info.name]['set'] = function (value) {
						self._gl.uniformMatrix3fv(location, false, value);
						uniformSetter.__validation.uniforms[info.name] = true;
					};
					break;
				case self._gl.FLOAT_MAT4:
					uniformSetter[info.name]['set'] = function (value) {
						self._gl.uniformMatrix4fv(location, false, value);
						uniformSetter.__validation.uniforms[info.name] = true;
					};
					break;

				case self._gl.INT:
					if (info.size > 1) {
						// Array
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform1iv(location, value);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					else {
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform1i(location, value);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					break;

				case self._gl.UNSIGNED_INT:
					if (info.size > 1) {
						// Array
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform1uiv(location, value);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					else {
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform1ui(location, value);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					break;

				case self._gl.INT_VEC2:
					if (info.size > 1) {
						// Array
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform2iv(location, value);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					else {
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform2i(location, value[0], value[1]);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					break;
				case self._gl.INT_VEC3:
					if (info.size > 1) {
						// Array
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform3iv(location, value);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					else {
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform3i(location, value[0], value[1], value[2]);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					break;
				case self._gl.INT_VEC4:
					if (info.size > 1) {
						// Array
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform4iv(location, value);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					else {
						uniformSetter[info.name]['set'] = function (value) {
							self._gl.uniform4i(location, value[0], value[1], value[2], value[3]);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
					}
					break;
				case self._gl.BOOL:
					uniformSetter[info.name]['set'] = function (value) {
						self._gl.uniform1f(location, value);
						uniformSetter.__validation.uniforms[info.name] = true;
					};
					break;
				case self._gl.SAMPLER_2D:
				case self._gl.INT_SAMPLER_2D:
				case self._gl.UNSIGNED_INT_SAMPLER_2D:
					uniformSetter[info.name]['set'] = function (texture, index) {
						self._gl.activeTexture(self._gl.TEXTURE0 + index);
						self._gl.bindTexture(self._gl.TEXTURE_2D, texture);
						self._gl.uniform1i(location, index);
						uniformSetter.__validation.uniforms[info.name] = true;
					};
					break;
				case self._gl.SAMPLER_CUBE:
						uniformSetter[info.name]['set'] = function (texture, index) {
							self._gl.activeTexture(self._gl.TEXTURE0 + index);
							self._gl.bindTexture(self._gl.TEXTURE_CUBE_MAP, texture);
							self._gl.uniform1i(location, index);
							uniformSetter.__validation.uniforms[info.name] = true;
						};
						break;
				default:
					console.error("UNKNOWN");
					break;
			}
		}

		return uniformSetter;
	}

	/**
	 * Compiles the given GLSL shader source. In case of an error the debug log is written to console.
	 * @param {string} source GLSL Shader Source
	 * @param type Shader type (VERTEX_SHADER or FRAGMENT_SHADER
	 * @returns {WebGLShader} Compiled GLSL Shader
	 * @private
	 */
	_compileShader (source, type) {
		var shader = this._gl.createShader(type);

		this._gl.shaderSource(shader, source);
		this._gl.compileShader(shader);

		// Compile info
		var status = this._gl.getShaderParameter(shader, this._gl.COMPILE_STATUS);

		if (!status) {
			console.error(this._gl.getShaderInfoLog(shader));
		}

		if (this._gl.getShaderInfoLog(shader) !== '') {
			console.warn( 'WebGLShader: _gl.getShaderInfoLog()', type === this._gl.VERTEX_SHADER ? 'vertex' : 'fragment', this._gl.getShaderInfoLog(shader));
		}

		return shader;
	}

	/**
	 * Fetches cached WebGL program made in previous fetches or new WebGL program if it's the first time this program is being fetched.
	 * @param {string} programId Unique program identificator used for cached programs dictionary addressing.
	 * @returns {GLProgram} Cached program if it exists in the CachedPrograms dictionary, otherwise new gl program that will be cached
	 * @private
	 */
	_getCachedProgram (programId) {
		var program = this._compiledPrograms[programId];

		// If no previous entry exists.. Compile new program
		if (program === undefined) {
			program = new GLProgram(this._gl);

			// Cache program
			this._compiledPrograms[programId] = program;
		}

		return program
	}
};