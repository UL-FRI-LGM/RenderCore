/**
 * Based on Sprite by Sebastien.
 *
 * Apr. 22 Simplifed by Matevz to:
 * - Construct geometry and material in place.
 * - Assume use of fixed unit square quad, centered by default (-0.5,0.5) -> (0.5,-0.5)
 *   This simplifies shaders and does not require the use of deltaOffsets as they are
 *   implied in the vertex position.
 * - Removed deltaOffsets and obsolete spriteSize members.
 * - Normals are not needed, shader can always set them to (0,0,+/-1).
 * - Shader basic_zsprite also supports picking and outline.
 * - Removed support for CIRCLES and POINTS.
 *
 * Description
 * Camera-facing quad. Extents of the quad should be 1 in both directions and
 * actual size needs to be set via 'spriteSize' propery passed to SpriteBasicMaterial.
 * 'mode' can be SPRITE_SPACE_SCREEN (size is in pixels) or SPRITE_SPACE_WORLD
 * (model-view coordinates). E.g.: { mode: RC.SPRITE_SPACE_SCREEN, spriteSize: [40, 40] }
 * By default the sprite is cenetered on its position, pass xy0/1 as needed to
 * place / center sprite in other ways.
 * There is, in principle, no reason to restrict this to a Quad, it can be any 2D mesh
 * that fits into nit square, eg., triangle, five-pointed-star.
 *
 * Texture 0 in SpriteBasicMaterial is mapped onto the mesh. If transparent flag is set,
 * fragments with zero alpha are discarded so one can have shapes determined by the texture.
 * For instancing, one should also bind an instanceData texture (RGBA32F).
 * rgb components are used as position offsets (in ZSprite's reference frame).
 * a value could be used to pass color (as ubyte quad) or the whole concept could
 * be extended to also (optionally) include per-instance sprite-scale (or size).
 */

import {Mesh} from './Mesh.js';
import {Quad} from './Quad.js';
import {ZSpriteBasicMaterial} from '../materials/ZSpriteBasicMaterial.js';
import {Vector2} from '../RenderCore.js';


export class ZSprite extends Mesh {
    constructor(geometry = null, material = null) {
        if (geometry === null) {
            let xy0 = new Vector2(-0.5, 0.5);
            let xy1 = new Vector2(0.5, -0.5);
            geometry = Quad.makeGeometry(xy0, xy1, false, false, false);
        }
        if (material === null) {
            material = new ZSpriteBasicMaterial();
        }

        // MT for Sebastien -- what would be the best way to clone material?
        // ZSpriteBasicMaterial.clone_for_xyzz() seems OK but one needs to
        // take care with uniform / texture / instanceData updates.
        // Ideally, one could even have the same program built and compiled
        // several times with different SB flags.
        let pmat = material.clone_for_picking();
        let omat = material.clone_for_outline();

        //SUPER
        super(geometry, material, pmat, omat);
        this.type = "ZSprite";
    }
}
