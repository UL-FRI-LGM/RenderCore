/**
 * Created by Matevz on 14.6.2022
 * Based on Cache.js by Primoz
 */

/**
 * This is a global object that can be used for caching of Images.
 * Useful when it is known that the same image might be requested at the
 * same time, potentially from different GL contexts / MeshRenderers.
 * To be used along with a TextureCache on the level of individual MeshRenderer.
 */

export var ImageCache =
{
	cached: new Map,     // cached images
	incoming: new Map,   // incoming URLs, when set contains an array of callbacks
	verbose: false,

	// callback takes 3 arguments: url, image, delayed
	// Note: on error image returned will be null. This will also get cached.

	deliver: function (url, callback)
	{
		if (this.verbose) console.log("ImageCache deliver", this.cacheid, url);

		let img = this.cached.get(url);
		if (img !== undefined) {
			if (this.verbose) console.log("ImageCache HAS", url);
			callback(url, img, false);
			return;
		}
		let arr = this.incoming.get(url);
		if (arr !== undefined) {
			if (this.verbose) console.log("ImageCache EXPECTING", url);
			arr.push(callback);
			return;
		}

		if (this.verbose) console.log("ImageCache does NOT HAVE -- requesting", url);
		this.incoming.set(url, [ callback ]);

		let image = new Image();
		let pthis = this;
		image.onload  = () => { this.image_loaded(url, image); };
		image.onerror = () => { this.image_loaded(url, null); }
		image.src = url;
	},

	image_loaded: function (url, image)
	{
		if (image) {
			if (this.verbose) console.log("ImageCache image_loaded success", url);
		} else {
			console.error("ImageCache image_loaded error loading", url);
		}
		this.cached.set(url, image);

		// Notify all registered callacks.
		let array = this.incoming.get(url);
		for (let i = 0; i < array.length; ++i) {
		   array[i](url, image, true);
		}
		this.incoming.delete(url);
	},

	remove: function (url) {
		this.cached.delete(url);
	},

	clear: function () {
		this.cached.clear();
	}
};


export class TextureCache
{
	constructor() {
		this.tex_cache = new Map;
		this.tex_precache = new Map;
		this.verbose = false;
	}

	// Besides url, all other args are lambdas and all of them are only called
	// when Image loading succeeds.
	// - callback takes 1 arguments: texture
	// - image_to_texture takes 1 argument: image and returns texture
	// - when_delayed takes no arguments.
	// When deliver is called multiple times with the same url while the initial
	// Image processing is still ongoing, the latter image_to_texture and
	// when_delay are not stored -- they are assumed to be the same as they
	// are supposedly coming from the same rendering context.

	deliver(url, callback, image_to_texture, when_delayed)
	{
		let tex = this.tex_cache.get(url);
		if (tex !== undefined) {
		   if (this.verbose) console.log("TextureCache HAS", url);
		   if (tex) callback(tex);
		   return;
		}

		let pc = this.tex_precache.get(url);
		if (pc !== undefined) {
		   if (this.verbose) console.log("TextureCache url is incoming -- appending callback", url);
		   pc.array.push(callback);
		   return;
		}

		this.tex_precache.set(url, { img2tex: image_to_texture,
			                         delayed: when_delayed,
									 array: [callback] });

 	 	ImageCache.deliver(url, this.image_loaded.bind(this));
	}

	image_loaded(url, image, delayed)
	{
		let pc = this.tex_precache.get(url);

		let tex = image ? pc.img2tex(image) : null;

		this.tex_cache.set(url, tex);

		if (tex)
		{
		   for (let i = 0; i < pc.array.length; ++i) {
			  pc.array[i](tex);
		   }
		}

		if (tex && delayed)
		   pc.delayed();

	   this.tex_precache.delete(url);
	}

	remove(url) {
		this.tex_cache.delete(url);
	}

	clear() {
		this.tex_cache.clear();
	}
};
