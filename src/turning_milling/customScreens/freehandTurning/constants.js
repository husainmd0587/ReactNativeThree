import { Dimensions, Platform } from 'react-native';
import { matchFont } from '@shopify/react-native-skia';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Layout Constants ──
export const HEADER_H = Platform.OS === 'ios' ? 96 : 58;
export const TOOLBAR_H = 108;
export const MAGAZINE_H = 150; // Height reserved for magazine
export const CONTROL_STRIP_H = 44; // Height reserved for the accuracy/stats control strip
export const CANVAS_H = SH - HEADER_H - TOOLBAR_H - MAGAZINE_H - CONTROL_STRIP_H;
export const CANVAS_W = SW;

// ── Drawing space ─────────────────────────────────────────────
export const PROFILE_SEGS = 60;
export const STOCK_RADIUS = Math.min(CANVAS_H * 0.32, 100);
export const AXIS_Y = CANVAS_H * 0.45;
export const STOCK_LEFT = 65;
export const STOCK_RIGHT = CANVAS_W - 10;
export const STOCK_WIDTH = STOCK_RIGHT - STOCK_LEFT;

// ── Chuck end-caps ──
// Small rotating 3-jaw chucks bracketing the stock -- "[]==[]" -- so
// the flat 2D profile still reads as the side view of a cylinder held
// on a lathe, not a flat strip. They live in the margin already
// reserved by STOCK_LEFT/STOCK_RIGHT, so no cutting-coordinate
// constants need to change.
export const CHUCK_RADIUS = Math.min(30, STOCK_LEFT);
export const CHUCK_CENTER_L = STOCK_LEFT / 2;
export const CHUCK_CENTER_R = STOCK_RIGHT + (CANVAS_W - STOCK_RIGHT) / 2;

// ── Real-world scale ─────────────────────────────────────────
// Purely for HUD readouts (diameter callipers, thin-wall warning) --
// the simulation itself still works in px. We treat the stock's full
// starting radius as representing a real blank of this diameter.
export const REAL_STOCK_DIAMETER_MM = 100;
export const PX_TO_MM = REAL_STOCK_DIAMETER_MM / (STOCK_RADIUS * 2);
export const MIN_SAFE_RADIUS = STOCK_RADIUS * 0.12; // below this, wall is "thin" / at risk

// ── Spindle speed ──────────────────────────────────────────────
export const BASE_RPM = 1200; // reference speed the base spin/rotation rates were tuned at
export const MIN_RPM = 200;
export const MAX_RPM = 3000;
export const RPM_STEP = 100;

// ── Persisted parts (AsyncStorage) ──
export const SAVED_PARTS_KEY = '@pottery_studio/saved_parts';

// ── Cutting accuracy tuning ──────────────────────────────────
// Single place to retune the feel of catches, chatter, and wear
// without hunting through the gesture/cut pipeline below.
export const CATCH_BASE_CHANCE = 0.006; // scaled by risk factors, then capped per-frame
export const CATCH_PROB_CAP = 0.035;
export const CATCH_LOCKOUT_MS = 220;    // brief "recoil" pause after a catch
export const WEAR_RATE = 0.00003;       // wear gained per px of cutting contact
export const WEAR_DEPTH_PENALTY = 0.55; // fully worn tool cuts up to 55% less
export const WEAR_CATCH_RISK = 1.6;     // dull edges are more likely to skid/catch

// ── Tools ──────────────────────────────────────────────
export const TOOLS = [
  { id: 'roughing', name: 'Roughing', icon: '⚡', color: '#e67e22', width: 16, depth: 6, shape: 'round' },
  { id: 'gouge', name: 'Bowl Gouge', icon: '🔄', color: '#3498db', width: 10, depth: 3.5, shape: 'round' },
  { id: 'skew', name: 'Skew', icon: '💠', color: '#9b59b6', width: 6, depth: 2.5, shape: 'flat' },
  { id: 'parting', name: 'Parting', icon: '✂️', color: '#e74c3c', width: 2, depth: 7, shape: 'narrow' },
  { id: 'scraper', name: 'Scraper', icon: '🔲', color: '#1abc9c', width: 16, depth: 0.8, shape: 'flat' },
  { id: 'spindle', name: 'Spindle', icon: '📏', color: '#f39c12', width: 4, depth: 4, shape: 'point' },
  { id: 'bead', name: 'Bead', icon: '⚪', color: '#ff6b9d', width: 4, depth: 3, shape: 'round' },
];

export const MATERIALS = [
  { id: 'clay', label: 'Clay', color: '#c8956c', roughness: 0.88, metalness: 0.00 },
  { id: 'ceramic', label: 'Ceramic', color: '#e8ddd0', roughness: 0.30, metalness: 0.05 },
  { id: 'glazed', label: 'Glazed', color: '#5b8fa8', roughness: 0.08, metalness: 0.15 },
  { id: 'wood', label: 'Wood', color: '#8B5E3C', roughness: 0.95, metalness: 0.00 },
  { id: 'bronze', label: 'Bronze', color: '#cd7f32', roughness: 0.35, metalness: 0.80 },
];

// ── Handle → tip offset ────────────────────────────────────────
export const TOOL_REACH = 10;
export const TOOL_LENGTH = 50;
export const DEBUG_SHOW_TIP = true;

export const toolLabelFont = matchFont({
  fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif',
  fontSize: 7,
  fontStyle: 'normal',
  fontWeight: 'normal',
});

// ── Spin texture / shader config ──────────────────────────────
export const SPIN_TEXTURE_CONFIG = {
  MATERIAL: 'wood',
  TILE_SIZE: 96,
  WRAP_HEIGHT: 160,
  SPEED: 22,
  DIRECTION: 1,
  CLOCK_RATE: 5, // base rate at BASE_RPM -- scaled live by rpm/BASE_RPM
  MIN_BRIGHTNESS: 0.35,
  MAX_BRIGHTNESS: 1.0,
};

export const CYLINDER_SHADER_SKSL = `
uniform shader image;
uniform float axisY;
uniform float radius;
uniform float phase;
uniform float direction;
uniform float wrapHeight;
uniform float minBrightness;
uniform float maxBrightness;

half4 main(vec2 pos) {
  float dy = pos.y - axisY;
  float t = clamp(dy / radius, -1.0, 1.0);
  float phi = acos(t);

  float twoPi = 6.28318530718;
  float matAngle = phi + direction * phase;
  float v = mod(matAngle, twoPi) / twoPi * wrapHeight;

  float facing = sin(phi);
  float brightness = mix(minBrightness, maxBrightness, facing);

  half4 texColor = image.eval(vec2(pos.x, v));
  return half4(texColor.rgb * brightness, texColor.a);
}
`;

// ── 3D world scale (lathe geometry) ───────────────────────────
export const WORLD_H = 4.0;
export const WORLD_R = 1.8;

// ── Chip particle system ──────────────────────────────────────
export const CHIP_POOL_SIZE = 50;
export const CHIP_GRAVITY = 520;          // px/s² -- stronger fall for a punchier arc
export const CHIP_MAX_LIFE = 800;         // ms, randomized per chip
export const CHIP_MIN_REMOVAL = 0.05;     // ignore near-zero radius changes -- hovering/edge-grazing shouldn't spawn chips

// ── Tool blade visual geometry ────────────────────────────────
export const BLADE_LEN = 32;    // exposed steel blade, tip to shoulder
export const SHANK_LEN = 8;     // taper from blade shoulder into the ferrule
export const HANDLE_LEN = 46;   // visual handle length only -- independent of
                                 // TOOL_LENGTH, which still drives cutting reach
                                 // in fingerToTip/the pan gesture and must not
                                 // be touched for cosmetic changes.
export const TOTAL_VISUAL_LEN = BLADE_LEN + SHANK_LEN + HANDLE_LEN;

export const STEEL_LIGHT = '#eef2f6';
export const STEEL_MID   = '#b9c4cf';
export const STEEL_DARK  = '#7c8894';
export const WOOD_HANDLE = '#e3c79a';
export const WOOD_HANDLE_DK = '#c9a874';

// ── Motor/pulley rig visual scale ─────────────────────────────
// Single knob to retune how big the pulley/belt rig reads relative
// to the motor PNG. Previously set to 0.4 to shrink an apparently
// oversized rig, but that made it read as a thin disconnected wire
// instead of a wheel -- 1 (no scaling, original size) looked better
// in practice. Adjust here if it ever needs retuning again.
export const MOTOR_RIG_SCALE = 1;

// ── Motor PNG screen placement ─────────────────────────────────
// Shared between Motor3D.js (positions the actual <Image>) and the
// main screen (positions the power switch relative to it), so the
// two never drift out of sync if the motor's placement changes.
export const MOTOR_IMAGE_BOTTOM = 60;
export const MOTOR_IMAGE_LEFT = 100;
export const MOTOR_IMAGE_SIZE = 100;
