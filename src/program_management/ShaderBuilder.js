/**
 * Created by Primoz on 9. 11. 2016.
 */


export class ShaderBuilder {
	constructor() {
		this._LOGTAG = "ShaderBuilder: ";

		this._templatesCache = {};

		// Regular expressions used for template tree building
		// Commend matching
		this._multiLineCommentRegex = /\/\*[^*]*(?:\*+[^*\/][^*]*)*\*\//g;
		this._singleLineCommentRegex = /\/\/.*/g;

		// Line reducing
		this._lineReduceRegex = /[^\r\n]+/g;
		this._prefixSuffixSpaceTrimRegex = /(^\s+|\s+$)/g;
		this._multipleSpaceMatch = /\s+/g;
	}

	/**
	 * Generates shader name for the given set of flags and values.
	 */
	_generateShaderName (flags, values) {
		// Sort the flags to get the correct order
		var sortedFlags = flags.sort();

		// Generate sorted list of values names
		var sortedValuesNames = Object.keys(values).sort();

		/** Create flags and values encoded shader name */
		var shaderName = "";

		// First concat the shader flags
		for (var i = 0; i < sortedFlags.length; i++) {
			shaderName += sortedFlags[i].toLowerCase();
		}

		// Append the merged value names and values
		for (var i = 0; i < sortedValuesNames.length; i++) {
			shaderName += sortedValuesNames[i] + values[sortedValuesNames[i]];
		}

		return shaderName;
	}

	/** Checks if the template tree for the given template was already built */
	hasTemplate (templateName) {
		return this._templatesCache[templateName] !== undefined
	}

	buildTemplateTree (templateName, templateSource) {

		// Warn the user if the template tree is beeing overwritten
		if (this.hasTemplate(templateName)) {
			console.log(this._LOGTAG + "Warning. Overwriting the template tree!", templateName);
			return;
		}

		// Remove multi line comments
		templateSource = templateSource.replace(this._multiLineCommentRegex , '');

		// Generate array of lines with no empty lines
		var arrayOfLines = templateSource.match(this._lineReduceRegex);

		// Create root node of the template tree
		var rootNode = new ShaderBuilder.RootNode();

		for (var i = 0; i < arrayOfLines.length; i++) {
			// Remove redundant spaces and single line comments
			var trimmedLine = arrayOfLines[i].replace(this._prefixSuffixSpaceTrimRegex, '').replace(this._multipleSpaceMatch,' ').replace(this._singleLineCommentRegex, '');

			// If there is nothing left do not bother adding the line to the tree
			if (trimmedLine.length === 0) {
				continue;
			}

			// Interpret the line of code
			try {
				rootNode.parseLine(trimmedLine);
			}
			catch (error) {
				console.error(this._LOGTAG + "Exception occurred while building the template tree (" + error + ")\n" +
					"Problematic line: " + arrayOfLines[i].replace(this._prefixSuffixSpaceTrimRegex, ''));
				return false;
			}
		}

		// Check if the commands are properly closed
		if (!rootNode.validate()) {
			console.error(this._LOGTAG + "Warning the commands are not properly closed!");
			return false;
		}

		// Store the template tree
		this._templatesCache[templateName] = {cachedShaders: {}, tree: rootNode};

		return true;
	}

	// Tries to fetch the shader. If the shader it's not build jet it tries to build it
	fetchShader (templateName, flags, values) {
		var shaderTemplate = this._templatesCache[templateName];

		// Generate flags, values unique shader name
		var shaderName = this._generateShaderName(flags, values);

		// Check if this shader was already built
		if (shaderTemplate !== undefined) {
			var cachedShaders = shaderTemplate.cachedShaders;

			// Check if the required shader is already built
			var requiredShader = cachedShaders[shaderName];

			if (requiredShader !== undefined) {
				return requiredShader;
			}
			else {
				try {
					// Try to build the shader
					var shader = shaderTemplate.tree.build(flags, values)

					// Add shader to cached shaders map
					cachedShaders[shaderName] = shader;

					return shader;
				}
				catch (error) {
					console.error(this._LOGTAG + "Exception occurred while building the shader (" + error + ")");

					return undefined;
				}
			}
		}
		else {
			console.log(this._LOGTAG + "Could not find the shader template!");
			return undefined;
		}
	}
};


ShaderBuilder.STATE_OPENED = 0;
ShaderBuilder.STATE_CLOSED = 1;

// region REGEX SECTION

// Matches all available commands (#for, #endfor, #if, #else and #fi)
ShaderBuilder.commandRegex = /#for.*|#end.*|#if.*|#else.*|#fi.*/i;

// Matches #for and #if commands
ShaderBuilder.nodeStartRegex = /#for.*|#if.*/i;

// Matches correctly formed for loop (#FOR variable IN [unsigned integer] TO [unsigned integer])
ShaderBuilder.forLoopStartRegex = /#for\s+[a-zA-Z0-9_]*\s+in\s+[a-zA-Z0-9_]*\s+to\s+[a-zA-Z0-9_]*/i;

// Matches 3 groups of for loop (variable, first u-int and second u-int
ShaderBuilder.forLoopVariableRegex = /#for\s+([a-zA-Z0-9_]+)\s+in\s+([a-zA-Z0-9_]+)\s+to\s+([a-zA-Z0-9_]+)/i;

ShaderBuilder.endforRegex = /^#end$/i;

// Matches suffix and prefix spaces
ShaderBuilder.prefixSuffixSpaceRegex = /(^\s+|\s+$)/g;

// Matches #if command
ShaderBuilder.ifRegex = /#if.*/i;

// Matches #else if command
ShaderBuilder.elseIfRegex = /#else\s+if.*/i;

// Matches #else command
ShaderBuilder.elseRegex = /^#else$/i;

// Matches #fi command
ShaderBuilder.fiRegex = /^#fi$/i;

// Matches valid condition shell
ShaderBuilder.validConditionShellRegex = /\((?:[a-zA-Z0-9!()\s_]+|&&|\|\|)+\)/i;

// Matches logical operators || and &&
ShaderBuilder.logicalOperatorsRegex = /\&\&|[|]{2}/g;

// Matcher everything but brackets
ShaderBuilder.everythingButBracketsRegex = /[^()!]+/g;

// Is a positive integer
ShaderBuilder.isPosInt = /0|[1-9][0-9]*/;

//endregion

/**
 * Abstract node class. All nodes should extend this class and implement
 * state and methods like parseLine, build and _createNewSubNode
 */
ShaderBuilder.Node = class {

	constructor () {
		this._state = ShaderBuilder.STATE_OPENED;
	};

	/**
	 * Fetches the current state of the node which can either be ShaderBuilder.STATE_OPENED when the node is still
	 * under construction or ShaderBuilder.STATE_CLOSED when the node is finished.
	 *
	 * @returns {number} Can either be ShaderBuilder.STATE_OPENED or ShaderBuilder.STATE_CLOSED
	 */
	get state () { return this._state; }

	/**
	 * Sets the current state of the node.
	 *
	 * @param {number} value Must either be ShaderBuilder.STATE_OPENED or ShaderBuilder.STATE_CLOSED
	 */
	set state (value) { this._state = value }

	/**
	 * This is an abstract function which should be extended. It specifies call for line parsing which is used when building the
	 * shader template tree.
	 *
	 * @param line {string} Line of template code
	 */
	parseLine (line) {};

	/**
	 * Creates new Node based on the specified line. If the line is ShaderBuilder command either ConditionNode or LoopNode
	 * is created or if the line is normal line of shader code a CodeNode is created.
	 *
	 * @param line Line of template code. Could either be ShaderBuilder command or shader line of code.
	 * @returns {ShaderBuilder.Node} Created ShaderBuilder node.
	 * @private
	 */
	_createNewSubNode (line) {
		if (!ShaderBuilder.commandRegex.test(line)) {
			// Create new code node
			return new ShaderBuilder.CodeNode(line);
		}
		else if (ShaderBuilder.ifRegex.test(line)) {
			// Fetch condition and cutoff
			var condition = line.substring(3).replace(ShaderBuilder.prefixSuffixSpaceRegex, '');

			if (!ShaderBuilder.validConditionShellRegex.test(condition)) {
				throw "Badly formed condition";
			}

			// Try to evaluate condition
			ShaderBuilder.ConditionNode.evaluateCondition(condition, []);

			// Create new condition node
			return new ShaderBuilder.ConditionNode(condition);
		}
		else if (ShaderBuilder.forLoopStartRegex.test(line)) {

			// Fetch for loop parameters
			var groups = ShaderBuilder.forLoopVariableRegex.exec(line);

			// Check if all of the parameters are given in the foor loop
			if (groups.length != 4) {
				throw "Badly formed command";
			}

			// Create and return a new loop node
			return new ShaderBuilder.LoopNode(groups[1], groups[2], groups[3]);
		}
		else {
			throw "Badly formed command";
		}
	}

	/**
	 * This is an abstract function which should be extended. It specifies call for shader build after the tree is formed.
	 *
	 * @param flags Flags that evaluate to true when conditions are tested.
	 * @returns {string} Combined shader code that was built based on the input
	 * @abstract
	 */
	build (flags, values) {
		return "";
	}

	validate() {
		return false;
	}
};

/**
 * Creates new RootNode. This node should be used as root of the tree of the nodes.
 */
ShaderBuilder.RootNode = class extends ShaderBuilder.Node {

	constructor () {
		super();
		this._subNodes = [];
	}

	/**
	 * Parses the line specified in the input. Based on the line and current sub nodes it creates new sub node o forwards
	 * the line to the last node (OPENED).
	 *
	 * @param line Line of template code
	 */
	parseLine (line) {
		if (this._subNodes.length > 0) {
			// Fetch last node
			var lastNode = this._subNodes[this._subNodes.length - 1];

			/**
			 This is written in expanded form for easier debugging.
			 */
			if (lastNode instanceof ShaderBuilder.CodeNode) {
				// Last node is type of CodeNode

				// Check if the next statement is command
				if (ShaderBuilder.commandRegex.test(line)) {
					if (ShaderBuilder.nodeStartRegex.test(line)) {
						// If the current line is a node start command, create appropriate node
						this._subNodes.push(this._createNewSubNode(line));
					}
					else {
						// Unexpected command
						throw "Unexpected Command";
					}
				}
				else {
					// Normal line of shader code
					lastNode.parseLine(line);
				}
			}
			else {
				// Pass the line of code to the current last node if opened. If not create a new node
				if (lastNode.state === ShaderBuilder.STATE_OPENED) {
					lastNode.parseLine(line);
				}
				else {
					this._subNodes.push(this._createNewSubNode(line));
				}
			}
		}
		else {
			this._subNodes.push(this._createNewSubNode(line));
		}
	}

	/**
	 * Combines all of the sub nodes recursive output based on the specified flags in the input.
	 *
	 * @param flags Flags that evaluate to true when conditions are tested.
	 * @returns {string} Combined shader code that was built based on the input
	 */
	build (flags, values) {
		var shaderCode = "";

		// Recurse into all sub nodes
		for (var i = 0; i < this._subNodes.length; i++) {
			shaderCode += this._subNodes[i].build(flags, values);
		}

		// Remove last new line
		if (shaderCode.substring(shaderCode.length - 1) === '\n') {
			shaderCode = shaderCode.slice(0, -1);
		}

		// Replace all of the values that match the macro
		for (var valueName in values) {
			if (values.hasOwnProperty(valueName)) {
				var reg = new RegExp("##" + valueName, 'g');

				shaderCode = shaderCode.replace(reg, values[valueName]);
			}
		}

		return shaderCode;
	}

	/**
	 * Checks if all of the nodes and their sub-nodes are closed
	 * @returns {boolean} True if the structure is valid
	 */
	validate() {
		for (var i = 0; i < this._subNodes.length; i++) {
			if (!this._subNodes[i].validate()) {
				return false;
			}
		}

		return true;
	}
};

/**
 * Code Node is used for the shader code blocks that have no # commands in them (actual shader code)
 */
ShaderBuilder.CodeNode = class extends ShaderBuilder.Node {

	/**
	 * Creates ne Code Node
	 * @param line First line of shader code for this CodeNode
	 */
	constructor (line) {
		super();
		this._code = line + "\n";
		// Code node should always be closed since it does not contain any sub nodes
		this._state = ShaderBuilder.STATE_CLOSED;
	}

	/**
	 * Appends the given line to the code string
	 * @param line Line of shader code
	 */
	parseLine (line) {
		this._code += line + "\n";
	}

	build (flags, values) {
		return this._code;
	}

	/**
	 * Code node is always considered to be closed
	 * @returns {boolean} Always true
	 */
	validate() {
		return true;
	}
};

ShaderBuilder.ConditionNode = class extends ShaderBuilder.Node {

	constructor (condition) {
		super();

		this._if_condition = condition;
		this._if_subNodes = [];

		this._elseif_conditions = [];
		this._elseif_subNodesList = [];

		this._else_subNodes = null;
	}

	/**
	 * Evaluates the given condition by setting the specified flags to true and others to false. Throws BadlyFormedCondition
	 * if the condition is badly formed.
	 * @param condition String condition
	 * @param flags Flags that will be set to true
	 * @returns {Object} Evaluation result
	 */
	static evaluateCondition (condition, flags) {
		// Remove all spaces
		condition = condition.replace(/\s/g, '');

		// SET GIVEN FLAGS TO TRUE
		if (flags.length > 0) {
			var trueFlagsStr = "";
			var falseFlagsStr = "";

			// Create condition check
			for (var i = 0; i < flags.length; i++) {
				trueFlagsStr += flags[i];
				falseFlagsStr += "!" + flags[i];

				if (i !== flags.length - 1) {
					trueFlagsStr += "|";
					falseFlagsStr += "|";
				}
			}

			// Order is important
			condition = condition.replace(new RegExp(falseFlagsStr, 'gi'), "false");
			condition = condition.replace(new RegExp(trueFlagsStr, 'gi'), "true");
		}

		// SET REMAINING FLAGS TO FALSE

		// Fetch condition values and operators sequence
		var condValues = condition.split(ShaderBuilder.logicalOperatorsRegex);
		var condOperators = condition.match(ShaderBuilder.logicalOperatorsRegex);

		// Match returns null if no match
		if (condOperators == null) {
			condOperators = [];
		}

		// Check if number of operators and values match
		if (condValues.length === 0 || condOperators.length !== condValues.length - 1) {
			throw "BadlyFormedCondition";
		}

		// Replace unset flags
		for (var i = 0; i < condValues.length; i++) {
			var value = condValues[i].match(ShaderBuilder.everythingButBracketsRegex)[0].replace(ShaderBuilder.prefixSuffixSpaceRegex, '');

			// If the value is not true
			if (value !== 'true') {
				condValues[i] = condValues[i].replace(ShaderBuilder.everythingButBracketsRegex, 'false');
			}
		}

		// Merge the condition
		condition = condValues[0];

		for (var i = 0; i < condOperators.length; i++) {
			condition += condOperators[i] + condValues[i + 1];
		}

		try {
			return eval(condition);
		}
		catch (e) {
			throw "BadlyFormedCondition";
		}
	};

	// Returns sub-nodes that are part of current condition that is opened
	_fetchSubNodes () {
		if (this._else_subNodes !== null) {
			return this._else_subNodes;
		}
		else if (this._elseif_conditions.length !== 0) {
			return this._elseif_subNodesList[this._elseif_subNodesList.length - 1];
		}
		else {
			return this._if_subNodes;
		}
	}

	parseLine (line) {

		// Fetch the last condition sub-nodes
		var subNodes = this._fetchSubNodes();

		if (subNodes.length > 0) {
			// Fetch last node
			var lastNode = subNodes[subNodes.length - 1];

			// If the last node is opened forward the line
			if (lastNode.state === ShaderBuilder.STATE_OPENED) {
				lastNode.parseLine(line);
			}
			else {
				// Check if the given line is a command
				if (ShaderBuilder.commandRegex.test(line)) {

					// Check if the command is node open command
					if (ShaderBuilder.nodeStartRegex.test(line)) {
						subNodes.push(this._createNewSubNode(line));
					}
					// Check if the command is else if command
					else if (ShaderBuilder.elseIfRegex.test(line)) {
						// If the else sub nodes are already defined this is an illegal else if
						if (this._else_subNodes !== null) {
							throw "UnexpectedElseIfCondition"
						}

						// Fetch condition and trim spaces
						var condition = line.substring(8).replace(ShaderBuilder.prefixSuffixSpaceRegex, '');

						// Check if the condition is correctly enclosed
						if (!ShaderBuilder.validConditionShellRegex.test(condition)) {
							throw "BadlyFormedCondition";
						}

						// Try to evaluate condition
						ShaderBuilder.ConditionNode.evaluateCondition(condition, []);

						// Add new else if
						this._elseif_conditions.push(condition);
						this._elseif_subNodesList.push([]);
					}
					// Check if the command is else command
					else if (ShaderBuilder.elseRegex.test(line)) {
						// Else command
						this._else_subNodes = [];
					}
					// If the finish command is passed and the last node is closed
					else if (ShaderBuilder.fiRegex.test(line) && lastNode._state === ShaderBuilder.STATE_CLOSED) {
						this._state = ShaderBuilder.STATE_CLOSED;
					}
					else {
						throw "UnexpectedBlockClosure";
					}
				}
				else if (lastNode instanceof ShaderBuilder.CodeNode) {
					// If the last node is code node and the line is not a command add current line to CodeNode
					lastNode.parseLine(line);
				}
				else {
					// Create new code node
					subNodes.push(this._createNewSubNode(line));
				}
			}
		}
		else {
			// If the finish command is passed close the Condition Node
			if (ShaderBuilder.fiRegex.test(line)) {
				this._state = ShaderBuilder.STATE_CLOSED;
			}
			else {
				subNodes.push(this._createNewSubNode(line));
			}
		}
	}

	/**
	 * Returns shader code from the first condition that evaluates true for the given flags
	 * @param flags Flags that should take the value true
	 * @returns {string} Shader code
	 */
	build (flags, values) {
		var extractionSubNodes = null;
		var shaderCode = "";

		// Check if the if condition results in true
		if (ShaderBuilder.ConditionNode.evaluateCondition(this._if_condition, flags)) {
			extractionSubNodes = this._if_subNodes;
		}
		else {
			// Check if any else if condition results in true
			for (var i = 0; i < this._elseif_conditions.length; i++) {
				if (ShaderBuilder.ConditionNode.evaluateCondition(this._elseif_conditions[i], flags)) {
					extractionSubNodes = this._elseif_subNodesList[i];
					break;
				}
			}

			// If none of the previous conditions evaluated to true, check for else
			if (extractionSubNodes === null && this._else_subNodes !== null) {
				extractionSubNodes = this._else_subNodes;
			}

			// Check if no condition evaluates to true
			if (extractionSubNodes === null) {
				return ""
			}
		}

		// Recurse in sub nodes whose condition evaluated to true
		for (var i = 0; i < extractionSubNodes.length; i++) {
			shaderCode += extractionSubNodes[i].build(flags, values);
		}


		return shaderCode;
	}

	/**
	 * Checks if all of the nodes and their sub-nodes are closed
	 * @returns {boolean} True if the structure is valid
	 */
	validate() {
		// If the condition node is not closed do not bother looking at subNodes
		if (this._state !== ShaderBuilder.STATE_CLOSED) {
			return false;
		}

		// Check if sub_nodes
		for (var i = 0; i < this._if_subNodes.length; i++) {
			if (!this._if_subNodes[i].validate()) {
				return false;
			}
		}

		// Check sub_nodes of all else if-s
		for (var i = 0; i < this._elseif_subNodesList.length; i++) {
			var sub_nodes = this._elseif_subNodesList[i];

			for (var j = 0; j < sub_nodes.length; j++) {
				if (!sub_nodes[j].validate()) {
					return false;
				}
			}
		}

		// Check else subnodes if defined
		if (this._else_subNodes !== null) {
			for (var i = 0; i < this._else_subNodes.length; i++) {
				if (!this._else_subNodes[i].validate()) {
					return false;
				}
			}
		}

		return true;
	}
};

ShaderBuilder.LoopNode = class extends ShaderBuilder.Node {
	constructor (macro, from, to) {
		super();
		this._macro = macro;
		this._from = from;
		this._to = to;

		this._subNodes = [];
	}

	parseLine (line) {
		if (this._subNodes.length > 0) {
			// Fetch the last node
			var lastNode = this._subNodes[this._subNodes.length - 1];

			/**
			 This is written in expanded form for easier debugging.
			 */
			if (lastNode instanceof ShaderBuilder.CodeNode) {
				// Last node is type of CodeNode

				// Check if the next statement is a command
				if (ShaderBuilder.commandRegex.test(line)) {
					if (ShaderBuilder.nodeStartRegex.test(line)) {
						// If the current line is a node start command, create appropriate node
						this._subNodes.push(this._createNewSubNode(line));
					}
					else if (ShaderBuilder.endforRegex.test(line)) {
						// If the for loop end command was given set state to closed
						this._state = ShaderBuilder.STATE_CLOSED;
					}
					else {
						// Unexpected command
						throw "Unexpected Command";
					}
				}
				else {
					// Normal line of shader code
					lastNode.parseLine(line);
				}
			}
			else {
				if (lastNode.state === ShaderBuilder.STATE_OPENED) {
					// Pass the line of code to the current last node if opened. If not create a new node
					lastNode.parseLine(line);
				}
				else if (ShaderBuilder.endforRegex.test(line)) {
					// If the for loop end command was given set state to closed
					this._state = ShaderBuilder.STATE_CLOSED;
				}
				else {
					// Try to create a new node
					this._subNodes.push(this._createNewSubNode(line));
				}
			}
		}
		else {
			if (ShaderBuilder.endforRegex.test(line)) {
				// If the finish command is passed close the Loop Node
				this._state = ShaderBuilder.STATE_CLOSED;
			}
			else {
				// Node list is empty.. Try to create a new sub-node
				this._subNodes.push(this._createNewSubNode(line));
			}
		}
	}

	build (flags, values) {

		// FETCH FOR LOOP PARAMETERS
		var fromInt;
		var toInt;

		// Fetch from value
		if (ShaderBuilder.isPosInt.test(this._from)) {
			fromInt = parseInt(this._from, 10);
		}
		else {
			if (values[this._from] !== undefined) {
				fromInt = values[this._from];
			}
			else {
				throw "For loop parameter [" + this._from + "] not specified."
			}
		}

		// Fetch TO value
		if (ShaderBuilder.isPosInt.test(this._to)) {
			toInt = parseInt(this._to, 10);
		}
		else {
			if (values[this._to] !== undefined) {
				toInt = values[this._to];
			}
			else {
				throw "For loop parameter [" + this._to + "] not specified."
			}
		}

		// Check if the parameters are of integer type
		if (!Number.isInteger(fromInt) || !Number.isInteger(toInt) || fromInt < 0 || toInt < 0) {
			throw "Invalid for loop parameters."
		}

		// FETCH SHADER CODE
		var shaderCode = "";

		// Recurse into all sub nodes
		for (var i = 0; i < this._subNodes.length; i++) {
			shaderCode += this._subNodes[i].build(flags, values);
		}

		// Unwind the for loop and combine the shader code
		var combinedShaderCode = "";
		// Create regex that matches ##variable
		var reg = new RegExp("##" + this._macro, 'g');;

		// Check if incrementing od decrementing for is needed
		if (fromInt < toInt) {
			for (var i = fromInt; i < toInt; i++) {
				combinedShaderCode += shaderCode.replace(reg, i);
			}
		}
		else {
			for (var i = fromInt; i > toInt; i--) {
				combinedShaderCode += shaderCode.replace(reg, i);
			}
		}

		return combinedShaderCode;
	}

	/**
	 * Checks if all of the nodes and their sub-nodes are closed
	 * @returns {boolean} True if the structure is valid
	 */
	validate() {
		// If this state is not closed. Do not bother looking at subnodes
		if (this._state !== ShaderBuilder.STATE_CLOSED) {
			return false;
		}

		// Check if all of the sub-nodes are closed
		for (var i = 0; i < this._subNodes.length; i++) {
			if (!this._subNodes[i].validate()) {
				return false;
			}
		}

		return true;
	}
};
