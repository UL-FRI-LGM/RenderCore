NPM_DIR := /opt/npm/bin
SRC_DIR := ../../src
CONTRIB_DIR := ${SRC_DIR}/contrib

# The release version is 'revision' in src/constants.js -- the single place it
# is recorded. Bump it there when cutting a release; the tarball names itself
# from it and the shipped bundle then carries its own version string.
VERSION := $(shell sed -n 's/.*revision *= *["]*\([0-9.]*\)["]*.*/\1/p' ${SRC_DIR}/constants.js)
TARBALL := RenderCore-${VERSION}.tar.gz

.PHONY: default dist tarball clean

default:
	@echo No default target, please specify dist or clean.

# A release is always built from scratch. The alternative is to teach make the
# import graph that rollup follows, which is the whole source tree, and getting
# that list wrong fails silently. It takes about four seconds.
#
# The tar is built reproducibly -- fixed order, zeroed mtimes and ownership, and
# gzip -n so the compressed stream carries no timestamp either. The checksum is
# then a function of the contents alone, so an unchanged release keeps its
# checksum and a changed one is visible. Without this, every run produced a new
# checksum from the file mtimes, which is how a tarball packing a stale bundle
# passed for a new release on 2026-09-23.
dist:
	${MAKE} clean
	${MAKE} tarball

tarball: REveRenderCore-min.mjs shaders
	@test -n "${VERSION}" || { echo "Could not read revision from ${SRC_DIR}/constants.js"; exit 1; }
	tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner \
	    -cf RenderCore-${VERSION}.tar ../../LICENSE REveRenderCore-min.mjs shaders/
	gzip -9nf RenderCore-${VERSION}.tar
	sha256sum -b ${TARBALL}
	@echo Now move the tarball to ROOT source and put the checksum into ROOT source tree
	@echo "  " mv ${TARBALL} ROOT-SRC/builtins/rendercore/
	@echo and remember to tag this commit in rcore:
	@echo "  " git tag -a ${VERSION} -m \"RenderCore ${VERSION}\" \&\& git push rcore ${VERSION}
	@echo and put the file name and the SHA256 checksum into:
	@echo "  " ROOT-SRC/builtins/rendercore/CMakeLists.txt

clean:
	rm -rf REveRenderCore.mjs REveRenderCore-min.mjs programs.json shaders RenderCore-*.tar.gz

# ------------------------------------------------------

REveRenderCore.mjs: ${CONTRIB_DIR}/REveRenderCore.js
	${NPM_DIR}/rollup $< --format es --file REveRenderCore.mjs

REveRenderCore-min.mjs: REveRenderCore.mjs
	${NPM_DIR}/terser REveRenderCore.mjs -c -b indent_level=1 -m -o REveRenderCore-min.mjs

define prog_name_help
$@ must be created manually. One can use merge-names.js, e.g.:
    ./merge-names.js ~/Downloads/programs-ev_demo.json ~/Downloads/programs-col_prox.json
It is safe to include $@ in the list of arguments
endef
program_names.json:
	$(error ${prog_name_help})

shaders: program_names.json
	./pack-shaders.js
