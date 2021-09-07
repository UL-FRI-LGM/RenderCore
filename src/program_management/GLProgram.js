/**
 * Created by Ziga on 18.4.2016
 */

export class GLProgram {

	constructor (gl) {
		this._gl = gl;
		this._program = this._gl.createProgram();

		this._initialized = false;

		this._attributeSetter = null;
		this._uniformSetter = null;
	}

	/**
	 * Attaches the compiled shader to the WebGL program
	 * @param {WebGLShader} shader Compiled WebGL shader
	 */
	attachShader (shader) {
		this._gl.attachShader(this._program, shader);
	}

	// Getters
	get glProgram () { return this._program; }
	get initialized () { return this._initialized; }
	get attributeSetter () { return this._attributeSetter; }
	get uniformSetter () { return this._uniformSetter; }

	// Setters
	set initialized (value) { this._initialized = value; }
	set uniformSetter (uniformSetter) { this._uniformSetter = uniformSetter; }
	set attributeSetter (attributeSetter) { this._attributeSetter = attributeSetter; }

	/**
	 * Tells GL to use this program
	 */
	use() { this._gl.useProgram(this._program); }
};