NPM_DIR := /opt/npm/bin
CONTRIB_DIR := ../../src/contrib

default:
	@echo No default target, please specify dist or clean.

dist: REveRenderCore-min.mjs shaders
	tar cf RenderCore.tar REveRenderCore-min.mjs shaders/
	gzip -9 RenderCore.tar
	sha256sum -b RenderCore.tar.gz
	@echo Now move the tarball to ROOT source and put the checksum into ROOT source tree
	@echo "  " mv RenderCore.tar.gz ROOT-SRC/builtins/rendercore/
	@echo and put the SHA256 checksum into:
	@echo "  " ROOT-SRC/cmake/modules/SearchInstalledSoftware.cmake

clean:
	rm -rf REveRenderCore.mjs REveRenderCore-min.mjs programs.json shaders RenderCore.tar.gz

# ------------------------------------------------------

REveRenderCore.mjs: ${CONTRIB_DIR}/REveRenderCore.js
	${NPM_DIR}/rollup $< --format es --file REveRenderCore.mjs

REveRenderCore-min.mjs: REveRenderCore.mjs
	${NPM_DIR}/uglifyjs REveRenderCore.mjs -c -b indent_level=1 -m -o REveRenderCore-min.mjs

define prog_name_help
$@ must be created manually. One can use merge-names.js, e.g.:
    ./merge-names.js ~/Downloads/programs-ev_demo.json ~/Downloads/programs-col_prox.json
It is safe to include $@ in the list of arguments
endef
program_names.json:
	$(error ${prog_name_help})

shaders: program_names.json
	./pack-shaders.js
