import {LoadingManager} from './LoadingManager.js';
import {XHRLoader} from './XHRLoader.js';

export class RAWLoader {
	constructor (manager = new LoadingManager()) {
		this._manager = (manager !== undefined) ? manager : new LoadingManager();
		this._url = undefined;
	}

	load (url, onLoad, onProgress, onError) {

		let loader = new XHRLoader(this._manager, "arraybuffer");
		let scope = this;

		//loader.setPath(this._path);
		loader.load(
			url,
			function (data) { //XHR poslje ze tak stream v spremenljivki data
				scope._url = url;

				//console.log(data);
				//console.log(data.length);

				//let parsedData = scope.parse(data); //slow
				let parsedData = scope.parse2(data); //changed XHRLoader to binary (arraybuffer)
				onLoad(parsedData);
			},
			onProgress,
			onError
		);
	}

	//FUNC
	parse(data){
		let dataBuffer = this._stringToBuffer(data); //string

		let parsedData;
		let urlLowerCase = this._url.toLowerCase();

		if(urlLowerCase.includes("uint8")) {
			parsedData = new Uint8Array(dataBuffer);
		}else if(urlLowerCase.includes("uint16")){
			parsedData = new Uint16Array(dataBuffer);
		}else if(urlLowerCase.includes("int8")){
			parsedData = new Int8Array(dataBuffer);
		}else if(urlLowerCase.includes("int16")){
			parsedData = new Int16Array(dataBuffer);
		}else if(urlLowerCase.includes("float32")){
			parsedData = new Float32Array(dataBuffer);
		}else if(urlLowerCase.includes("float64")){
			parsedData = new Float64Array(dataBuffer);
		}else{
			parsedData = null;
		}


		return parsedData;
	}

	parse2(data){
		let dataBuffer = data; //arraybuffer

		let parsedData;
		let urlLowerCase = this._url.toLowerCase();

		if(urlLowerCase.includes("uint8")) {
			parsedData = new Uint8Array(dataBuffer);
		}else if(urlLowerCase.includes("uint16")){
			parsedData = new Uint16Array(dataBuffer);
		}else if(urlLowerCase.includes("int8")){
			parsedData = new Int8Array(dataBuffer);
		}else if(urlLowerCase.includes("int16")){
			parsedData = new Int16Array(dataBuffer);
		}else if(urlLowerCase.includes("float32")){
			parsedData = new Float32Array(dataBuffer);
		}else if(urlLowerCase.includes("float64")){
			parsedData = new Float64Array(dataBuffer);
		}else{
			parsedData = null;
		}


		return parsedData;
	}

	_stringToBuffer(dataString) {
		//let dataSplit = dataString.split("");
		//console.log(dataSplit);
		let buffer = new ArrayBuffer(dataString.length);


		for (let i = 0; i < dataString.length; i++){
			//dataSplit[i] = dataSplit[i].charCodeAt(0);
			buffer[i] = dataString.charCodeAt(i); //same as: buffer[i] = data[i].charCodeAt(0);
		}
		return buffer;
	}
};