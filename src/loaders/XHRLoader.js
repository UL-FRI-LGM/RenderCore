/**
 * Created by Primoz on 17.3.2016.
 * Source: Three.js
 */

import {LoadingManager} from './LoadingManager.js';
import {Cache} from './Cache.js';

export class XHRLoader {

	/**
	 * @param manager   LoadingManager that will act as the loader observer
	 * @constructor     Creates new XHRLoader object. If the manager is undefined the default LoadingManager will be used.
	 * @name XHRLoader
	 */
	constructor (manager = new LoadingManager, responseType = "") {
		this.manager = manager;
		this.responseType = responseType;
	}

	/**
	 * Starts downloading the item from url via the XMLHttpRequest. Additional notification functions may be passed (onLoad, onProgress, onError).
	 * @param url           Source url used as the request address
	 * @param onLoad        Function that will be called when the loading finishes (data as parameter)
	 * @param onProgress    Function that will pass through the XMLHttpRequest progress
	 * @param onError       Function that will be called on loading error
	 * @returns {XMLHttpRequest}
	 */
	load (url, onLoad, onProgress, onError) {
		if ( this.path !== undefined ) url = this.path + url;

		// Store scope for nested functions
		var scope = this;

		// Try to fetch cached file
		var cached = Cache.get( url );

		// If the requested files is cached the result is immediately returned as onLoad parameter or load function
		// result if onLoad is not defined.
		if ( cached !== undefined ) {
			if ( onLoad ) {
				setTimeout( function () {
					onLoad( cached );
				}, 0 );
			}
			return cached;
		}

		// Form the GET request
		var request = new XMLHttpRequest();
		request.overrideMimeType( 'text/plain' );
		request.responseType = this.responseType;
		request.open( 'GET', url, true );

		request.addEventListener( 'load', function ( event ) {
			// Fetch the request response
			var response = event.target.response;

			// Map the url to response in Cache object
			Cache.add( url, response );

			// Determine if the request was successfully executed and notify the observers
			if ( this.status === 200 || this.status === 0 ) {
				if ( onLoad ) onLoad( response );
				scope.manager.itemEnd( url );
			}
			else {
				if ( onError ) onError( event );
				scope.manager.itemError( url );
			}

		}, false );

		// Pass through XMLHttpRequest onProgress listener
		if ( onProgress !== undefined ) {
			request.addEventListener( 'progress', function ( event ) {
				onProgress( event );
			}, false );
		}

		// Pass through XMLHttpRequest onError listener
		request.addEventListener( 'error', function ( event ) {
			if ( onError ) onError( event );
			scope.manager.itemError( url );
		}, false );

		// Check if any extra arguments were set
		if ( this.responseType !== undefined ) request.responseType = this.responseType;
		if ( this.withCredentials !== undefined ) request.withCredentials = this.withCredentials;

		// Send the request
		request.send( null );

		// Notify the LoadingManager that the item started loading from the received url
		scope.manager.itemStart( url );

		return request;
	}

	/**
	 * This should be called to set the request path (url) in advance
	 * @param path  Request path
	 */
	setPath (path) {
		this.path = path;
	}

	/**
	 * Defines the response type e.g. json, blob, text ...
	 * @param responseType  Type of the response
	 */
	setResponseType (responseType) {
		this.responseType = responseType;
	}

	/**
	 * Is a Boolean that indicates weather or not Access-Control requests should be made using credentials
	 * @param withCredentials   Should credentials be used
	 */
	setWithCredentials (withCredentials) {
		this.withCredentials = withCredentials;
	}

	extractUrlBase (url) {
		var parts = url.split( '/' );

		if ( parts.length === 1 ) return './';

		parts.pop();

		return parts.join( '/' ) + '/';
	}
};