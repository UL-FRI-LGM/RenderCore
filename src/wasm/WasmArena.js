/**
 * One WebAssembly memory per page, shared by every wasm kernel of RenderCore
 * and by the data the kernels work on, with a free-list allocator in JS.
 *
 * The kernels import the memory as env.memory, so one memory serves them all
 * and a kernel reads the data where it lies: a texture's image that is a view
 * on this memory is walked in place, with no copy. The bottom BASE bytes are
 * the kernels' own, their shadow stacks; allocations start above.
 *
 * Pointers are byte offsets into the memory and stay valid across a growth;
 * views do not. Growing a WebAssembly.Memory detaches its old ArrayBuffer and
 * every typed array on it, so the one rule for every holder is: never keep a
 * view across an alloc() that may grow. Take views with view() right before
 * use, or register a listener with addGrowListener(), which is called after a
 * growth with the new buffer, to replace views kept elsewhere: a texture whose
 * image is a view gets a new view, which bumps its version and re-uploads it.
 * `generation` counts the growths, for holders that check rather than listen.
 *
 * Growth doubles the memory, from 64 MB, so it is rare.
 *
 * Memory is not collected: whoever allocates frees, see free().
 */
export class WasmArena {
    static PAGE = 65536;
    /// Bytes at the bottom of the memory left to the kernels, for their stacks.
    static BASE = 1 << 20;
    static INITIAL_BYTES = 64 << 20;

    constructor(initialBytes = WasmArena.INITIAL_BYTES) {
        const initial = Math.ceil(initialBytes / WasmArena.PAGE);
        // 65536 pages, 4 GB, is the most a wasm32 memory can have and what
        // Chrome allows on 64-bit; try smaller maxima for engines that refuse it.
        let mem = null;
        for (const maximum of [65536, 32768, 16384, undefined]) {
            try {
                mem = new WebAssembly.Memory(maximum === undefined ? { initial } : { initial, maximum });
                this.maxPages = maximum === undefined ? 65536 : maximum;
                break;
            } catch (e) { mem = null; }
        }
        if (mem === null) throw new Error("WasmArena: cannot create a memory of " + initial + " pages");
        this.memory = mem;
        this.generation = 0;
        this._free = [{ ptr: WasmArena.BASE, size: mem.buffer.byteLength - WasmArena.BASE }];  // sorted by ptr
        this._used = new Map();       // ptr -> size
        this._listeners = new Set();
        this._kernels = new Map();    // name -> { promise, exports }
        this._scratch = { ptr: 0, size: 0 };
    }

    /** The page's arena, created on first use. */
    static shared() {
        if (WasmArena._shared === undefined) WasmArena._shared = new WasmArena();
        return WasmArena._shared;
    }

    /** Whether the engine has wasm SIMD (simd128); the kernels need it. */
    static simdSupported() {
        if (WasmArena._simd === undefined) {
            // A function returning i8x16.popcnt(i8x16.splat(0)).
            const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0,
                                          10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
            try { WasmArena._simd = typeof WebAssembly === "object" && WebAssembly.validate(bytes); }
            catch (e) { WasmArena._simd = false; }
        }
        return WasmArena._simd;
    }

    get buffer() { return this.memory.buffer; }
    get byteLength() { return this.memory.buffer.byteLength; }
    /** Bytes allocated, and the number of live allocations. */
    get usedBytes() { let n = 0; for (const s of this._used.values()) n += s; return n; }
    get usedCount() { return this._used.size; }

    /**
     * Allocates bytes, rounded up to a multiple of 16, at an address aligned
     * to align (a power of two, at least 16). Grows the memory when no free
     * block fits; returns 0 when the memory cannot grow far enough.
     */
    alloc(bytes, align = 16) {
        if (align < 16) align = 16;
        const size = Math.max(16, (bytes + 15) & ~15);
        let ptr = this._take(size, align);
        if (ptr === 0 && this._grow(size + align)) ptr = this._take(size, align);
        return ptr;
    }

    /** Returns an allocation to the free list, merging it with its neighbours. */
    free(ptr) {
        const size = this._used.get(ptr);
        if (size === undefined) throw new Error("WasmArena.free: " + ptr + " is not allocated");
        this._used.delete(ptr);
        this._insertFree(ptr, size);
    }

    /** The size of an allocation, undefined if ptr is not one. */
    sizeOf(ptr) { return this._used.get(ptr); }

    /** A typed array of the given type over bytes at ptr; dies on the next growth. */
    view(ptr, bytes, Type = Uint8Array) {
        return new Type(this.memory.buffer, ptr, (bytes / Type.BYTES_PER_ELEMENT) | 0);
    }

    /** Whether a typed array is a view on this memory, as it is now. */
    owns(array) { return array !== null && array !== undefined && array.buffer === this.memory.buffer; }

    /** fn(buffer, arena) is called after every growth. */
    addGrowListener(fn) { this._listeners.add(fn); return fn; }
    removeGrowListener(fn) { this._listeners.delete(fn); }

    /**
     * A block of at least bytes for the duration of one kernel call, shared by
     * every caller and grown as needed. Its contents do not survive the next
     * call of scratch(), and its address may change then.
     */
    scratch(bytes) {
        const s = this._scratch;
        if (s.size < bytes) {
            if (s.ptr !== 0) this.free(s.ptr);
            s.ptr = 0; s.size = 0;
            // Room to spare, so a slowly growing need does not reallocate every time.
            const size = Math.max(bytes, Math.min(2 * bytes, bytes + (16 << 20)));
            const ptr = this.alloc(size);
            if (ptr === 0) return 0;
            s.ptr = ptr; s.size = size;
        }
        return s.ptr;
    }

    /**
     * Instantiates a kernel, given its bytes as base64, with this memory as
     * env.memory; once per name. Resolves to the instance's exports.
     */
    loadKernel(name, base64) {
        let k = this._kernels.get(name);
        if (k === undefined) {
            k = { promise: null, exports: null, error: null };
            this._kernels.set(name, k);
            k.promise = (async () => {
                const bin = atob(base64);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; ++i) bytes[i] = bin.charCodeAt(i);
                const { instance } = await WebAssembly.instantiate(bytes, { env: { memory: this.memory } });
                const hb = instance.exports.__heap_base;
                if (hb !== undefined && hb.value > WasmArena.BASE)
                    throw new Error("WasmArena: kernel " + name + " needs " + hb.value + " bytes below the arena, " + WasmArena.BASE + " reserved");
                k.exports = instance.exports;
                return k.exports;
            })();
            k.promise.catch((e) => { k.error = e; console.warn("WasmArena: kernel " + name + " not loaded:", e); });
        }
        return k.promise;
    }

    /** The exports of a loaded kernel, null while it loads or if it failed. */
    kernel(name) {
        const k = this._kernels.get(name);
        return k !== undefined ? k.exports : null;
    }

    // --- internals --------------------------------------------------------------

    // First fit; the gap before an aligned start stays free.
    _take(size, align) {
        const fl = this._free;
        for (let i = 0; i < fl.length; ++i) {
            const b = fl[i];
            const start = (b.ptr + align - 1) & ~(align - 1);
            const gap = start - b.ptr;
            if (gap + size > b.size) continue;
            const rest = b.size - gap - size;
            const repl = [];
            if (gap > 0) repl.push({ ptr: b.ptr, size: gap });
            if (rest > 0) repl.push({ ptr: start + size, size: rest });
            fl.splice(i, 1, ...repl);
            this._used.set(start, size);
            return start;
        }
        return 0;
    }

    _insertFree(ptr, size) {
        const fl = this._free;
        let lo = 0, hi = fl.length;
        while (lo < hi) { const m = (lo + hi) >> 1; if (fl[m].ptr < ptr) lo = m + 1; else hi = m; }
        fl.splice(lo, 0, { ptr: ptr, size: size });
        // Merge with the next, then with the previous.
        if (lo + 1 < fl.length && fl[lo].ptr + fl[lo].size === fl[lo + 1].ptr) {
            fl[lo].size += fl[lo + 1].size;
            fl.splice(lo + 1, 1);
        }
        if (lo > 0 && fl[lo - 1].ptr + fl[lo - 1].size === fl[lo].ptr) {
            fl[lo - 1].size += fl[lo].size;
            fl.splice(lo, 1);
        }
    }

    // Doubles the memory until a block of `need` bytes fits at its end.
    _grow(need) {
        const P = WasmArena.PAGE;
        const oldBytes = this.memory.buffer.byteLength, oldPages = oldBytes / P;
        // The free block at the end, if any, counts towards the need.
        const fl = this._free, last = fl.length > 0 ? fl[fl.length - 1] : null;
        const tail = last !== null && last.ptr + last.size === oldBytes ? last.size : 0;
        let pages = oldPages;
        while ((pages - oldPages) * P + tail < need && pages < this.maxPages) pages = Math.min(2 * pages, this.maxPages);
        if ((pages - oldPages) * P + tail < need) return false;
        try { this.memory.grow(pages - oldPages); }
        catch (e) { console.warn("WasmArena: growth to " + pages + " pages failed:", e); return false; }
        this._insertFree(oldBytes, (pages - oldPages) * P);
        ++this.generation;
        const buf = this.memory.buffer;
        for (const fn of this._listeners) fn(buf, this);
        return true;
    }
}
