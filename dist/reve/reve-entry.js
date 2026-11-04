// This file exists only as rollup's entry for the REve bundle, see the Makefile. It
// re-exports the source entry and registers the shader library that pack-shaders.js
// generates, so the bundle carries the shaders and loads them with no request. Nothing
// else reads this file: the source tree and dev mode never see the library.
export * from '../../src/contrib/REveRenderCore.js';
import { ShaderLoader } from '../../src/loaders/ShaderLoader.js';
import { programs, sources } from './shader-library.js';
ShaderLoader.addLibrary(programs, sources);
