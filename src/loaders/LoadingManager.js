/**
 * Created by Primoz on 17.3.2016.
 * Source: Three.js
 */

/**
 * Class representing an observer for Loaders. It's instance may be used to monitor multiple loaders.
 * @param {function} onLoad Will be called when the Loader X notifies that the item I finished loading
 * @param {function} onProgress Will be called when the Loader X sends progress notification during the loading of item I.
 * @param {function} onError Will be called when the Loader X encounters an error during the loading.
 * @constructor Stores reference to functions passed to constructor and defines loader notification functions
 * @name LoadingManager
 *
 */

export class LoadingManager {

	constructor(onLoad, onProgress, onError) {
		// Store scope for nested functions
		var scope = this;

		var isLoading = false, itemsLoaded = 0, itemsTotal = 0;

		this.onStart = undefined;

		// Locally store given callback functions
		this.onLoad = onLoad;
		this.onProgress = onProgress;
		this.onError = onError;

		// Loaders should call this function to notify the observer that item started loading
		// This function may be called multiple times by same or different loader
		this.itemStart = function (url) {

			itemsTotal++;

			if (isLoading === false && scope.onStart !== undefined) {
				scope.onStart(url, itemsLoaded, itemsTotal);
			}

			isLoading = true;
		};

		// Loaders should call this function to notify the observer that item finished loading
		// This function should be called by the same loader that started the loading
		this.itemEnd = function (url) {
			itemsLoaded++;

			if (scope.onProgress !== undefined) {
				scope.onProgress(url, itemsLoaded, itemsTotal);
			}

			if (itemsLoaded === itemsTotal) {
				isLoading = false;

				if (scope.onLoad !== undefined) {
					scope.onLoad(url, itemsLoaded, itemsTotal);
				}
			}
		};

		// Loaders should call this function to notify the observer that an error occurred during the loading
		this.itemError = function (url) {
			if (scope.onError !== undefined) {
				scope.onError(url);
			}
		};
	}
};