import {Vector3} from './math/Vector3.js'

// RenderCore consts
export const singleton = Symbol();
export const singletonEnforcer = Symbol();

export const revision = 1;

// Material side constants
export const FRONT_SIDE = 0;
export const BACK_SIDE = 1;
export const FRONT_AND_BACK_SIDE = 2;

// GL Constants
export const FUNC_LESS = 3;
export const FUNC_LEQUAL = 4;
export const FUNC_EQUAL = 5;
export const FUNC_NOTEQUAL = 6;
export const FUNC_GREATER = 7;
export const FUNC_GEQUAL = 8;
export const FUNC_NEVER = 9;
export const FUNC_ALWAYS = 10;

export const WEBGL1 = 'gl1';
export const WEBGL2 = 'gl2';

export const ZeroCurvatureEnding = 2400;
export const ZeroSlopeEnding = 2401;
export const WrapAroundEnding = 2402;

// Rendering constants
export const FlatShading = 1;
export const GouraudShading = 2;
export const PhongShading = 3;
export const SmoothShading = 4;

// Sprite modes
export const SPRITE_SPACE_WORLD = 0;
export const SPRITE_SPACE_SCREEN = 1;

// Stripe modes
export const STRIPE_SPACE_WORLD = 0;
export const STRIPE_SPACE_SCREEN = 1;
export const STRIPE_CAP_DEFAULT = 0;
export const STRIPE_CAP_BUTT = 1;
export const STRIPE_CAP_SQUARE = 2;
export const STRIPE_CAP_ROUND = 3;
export const STRIPE_JOIN_DEFAULT = 0;
export const STRIPE_JOIN_MITER = 1;
export const STRIPE_JOIN_BEVEL = 2;
export const STRIPE_JOIN_ROUND = 3;

//Text2D modes
export const TEXT2D_SPACE_WORLD = 0;
export const TEXT2D_SPACE_SCREEN = 1;

// Highpass modes
export const HIGHPASS_MODE_BRIGHTNESS = 0;
export const HIGHPASS_MODE_DIFFERENCE = 1;

// Rendering primitives constants
export const POINTS = 0;
export const LINES = 1;
export const LINE_LOOP = 2;
export const LINE_STRIP = 3;
export const TRIANGLES = 4;
export const TRIANGLE_STRIP = 5;
export const TRIANGLE_FAN = 6;


// GL Program Manager constants
// ./program_management/GLProgramManager
export const VERTEX_SHADER = "vertex";
export const FRAGMENT_SHADER = "fragment";

// Keyboard constants
// ./controls/KeyboardInput
export const SUPPRESS_DEFAULT_KEYBOARD_KEYS = [37, 38, 39, 40];

// Gamepad constants
// ./controls/GamepadInput
export const BLACKLIST = {beef: ["046d"]};
export const gamepadIDRegex = /Vendor:\s+(.*)\s+Product:\s+(.*)\)/;
export const MINVEC = new Vector3(-1, -1, -1);
export const MAXVEC = new Vector3(1, 1, 1);