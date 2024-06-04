/**
 * Created by Matevz on 14.6.2022
 * Based on Cache.js by Primoz
 */

/**
 * This is a global object that can be used for caching of Images.
 * Useful when it is known that the same image might be requested at the
 * same time, potentially from different GL contexts / MeshRenderers.
 * To be used along with a TextureCache on the level of individual MeshRenderer.
 * NOTE: ImageCache will always invoke the callback.
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
		if (this.verbose) console.log("ImageCache deliver", url);

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

		// Support for .js and .js.gz objects -- JSON.
		if (url.endsWith(".js") || url.endsWith(".js.gz")) {
			fetch(url)
			.then((resp) => {
				if (resp.ok) return resp.blob();
				else throw new Error(resp.statusText);
			})
			.then((cblob) => {
				// console.log("fetch ok, got blob", cblob);
				let text_prom;
				if (cblob.type == "application/x-gunzip" || cblob.type == 'application/gzip') {
					const ds = new DecompressionStream("gzip");
					const stream = cblob.stream(); // new Blob([text], {type: 'application/gzip'}).stream();
					const dstream = stream.pipeThrough(ds);
					const resp = new Response(dstream);
					text_prom = resp.blob().then((dblob) => dblob.text());
				} else { // assumin text/javasript
					text_prom = cblob.text();
				}
				text_prom.then((text) => {
				  // console.log("Eureka???", text);
				  let obj = JSON.parse(text);
				  this.image_loaded(url, obj);
				});
			}) // cblob
			.catch((err) => {
				console.error("Load .js or .js.gz error", url, err);
				this.image_loaded(url, null);
			});
			return;
		}

		let image = new Image();
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

		// Notify all registered callbacks.
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
	// - callback takes 3 arguments: texture, delayed flag, url
	// - image_to_texture takes 1 argument: image and returns texture
	// - when_delayed takes 1 argument: url
	// When deliver is called multiple times with the same url while the initial
	// Image processing is still ongoing, the latter image_to_texture and
	// when_delay are not stored -- they are assumed to be the same as they
	// are supposedly coming from the same rendering context.

	deliver(url, callback, image_to_texture, when_delayed)
	{
		let tex = this.tex_cache.get(url);
		if (tex !== undefined) {
		   if (this.verbose) console.log("TextureCache HAS", url);
		   if (tex) callback(tex, false, url);
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
									 array:   [ callback ] });

 	 	ImageCache.deliver(url, this.image_loaded.bind(this));
	}

	image_loaded(url, image, delayed)
	{
		let pc = this.tex_precache.get(url);

		let tex = image ? pc.img2tex(image) : null;

		this.tex_cache.set(url, tex);

		if (tex) {
		   for (let i = 0; i < pc.array.length; ++i) {
			  pc.array[i](tex, delayed, url);
		   }
		   if (delayed && pc.delayed)
              pc.delayed(url);
		}

	    this.tex_precache.delete(url);
	}

	remove(url) {
		this.tex_cache.delete(url);
	}

	clear() {
		this.tex_cache.clear();
	}

	// url_base -> expanded with .png for image/texture, .js.gz for font metrics
	// callback takes 4 arguments: texture, font-metrics object, delayed flag, url_base
	// when_delayed takes 1 argument: url_base

	async deliver_font(url_base, callback, image_to_texture, when_delayed)
	{
		let texture = undefined;
		let font_metrics = undefined;
		let some_delayed = false;
		let p1 = new Promise((resolve) => {
			this.deliver(url_base + ".png",
			             (tex, delayed) => { some_delayed ||= delayed; texture = tex; resolve(); },
			             image_to_texture);
		});
		let p2 = new Promise((resolve) => {
			ImageCache.deliver(url_base + ".js.gz",
							   (url, obj, delayed) => { some_delayed ||= delayed; font_metrics = obj; resolve(); }
		)});
		if (texture === undefined)
			await p1;
		if (font_metrics === undefined)
			await p2;
		if (texture && font_metrics) {
			callback(texture, font_metrics, some_delayed, url_base);
			if (some_delayed && when_delayed)
				when_delayed(url_base);
		}
	}
};
