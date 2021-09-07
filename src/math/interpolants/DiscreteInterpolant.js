import { Interpolant } from '../Interpolant.js';

/**
 *
 * Interpolant that evaluates to the sample value at the position preceeding
 * the parameter.
 *
 * Copyright © 2010-2021 three.js authors
 */

function DiscreteInterpolant( parameterPositions, sampleValues, sampleSize, resultBuffer ) {

	Interpolant.call( this, parameterPositions, sampleValues, sampleSize, resultBuffer );

}

DiscreteInterpolant.prototype = Object.assign( Object.create( Interpolant.prototype ), {

	constructor: DiscreteInterpolant,

	interpolate_: function ( i1 ) {

		return this.copySampleValue_( i1 - 1 );

	}

} );


export { DiscreteInterpolant };
