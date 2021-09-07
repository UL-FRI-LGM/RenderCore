/**
 * Created by Primoz on 17.3.2016.
 * Source: Three.js
 */

/**
 * This is a global object that can be used for caching the loaded files. Caching is disabled by default, but it is
 * advised to enable it when loading the same file multiple times during a single session.
 */
export var Cache = {
	enabled: false,
	files: {},

	add: function ( key, file ) {
		if ( this.enabled === false ) return;

		this.files[ key ] = file;
	},

	get: function ( key ) {
		if ( this.enabled === false ) return;

		return this.files[ key ];
	},

	remove: function ( key ) {
		delete this.files[ key ];
	},

	clear: function () {
		this.files = {};
	}
};