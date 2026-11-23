/**
 * Exact xterm-256 colour index to #RRGGBB hex converter
 * Matches terminal colours from bouquet3d.py
 */
export function ansi256ToHex(code) {
  if (typeof code === "string" && code.startsWith("#")) return code;
  const n = Number(code);
  if (isNaN(n) || n < 0 || n > 255) return "#ffffff";

  const std = [
    "#000000", "#800000", "#008000", "#808000",
    "#000080", "#800080", "#008080", "#c0c0c0",
    "#808080", "#ff0000", "#00ff00", "#ffff00",
    "#0000ff", "#ff00ff", "#00ffff", "#ffffff",
  ];
  if (n < 16) return std[n];

  if (n >= 232) {
    const v = Math.min(255, Math.max(0, 8 + (n - 232) * 10));
    const h = v.toString(16).padStart(2, "0");
    return `#${h}${h}${h}`;
  }

  const idx = n - 16;
  const r = Math.floor(idx / 36);
  const g = Math.floor((idx % 36) / 6);
  const b = idx % 6;
  const steps = [0, 95, 135, 175, 215, 255];
  const rh = steps[r].toString(16).padStart(2, "0");
  const gh = steps[g].toString(16).padStart(2, "0");
  const bh = steps[b].toString(16).padStart(2, "0");
  return `#${rh}${gh}${bh}`;
}

export const mapAnsiPalette = (arr) => arr.map(ansi256ToHex);

/** Only hex colours are produced by the pickers — reject anything else from URLs. */
export function isSafeColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value.trim());
}

export function sanitizeColor(value, fallback = "#ffffff") {
  return isSafeColor(value) ? value.trim() : fallback;
}

/**
 * Exact baseline palettes from the original bouquet3d.py
 */
export const DEFAULT_PALETTES = {
  WHITE: mapAnsiPalette([244, 248, 251, 254, 255, 231]),
  PINK: mapAnsiPalette([125, 162, 168, 205, 211, 218, 225]),
  RED: mapAnsiPalette([52, 88, 124, 160, 196, 203]),
  PURPLE: mapAnsiPalette([54, 91, 97, 134, 140, 183]),
  YELLOW: mapAnsiPalette([136, 178, 214, 220, 226, 229]),
  ORANGE: mapAnsiPalette([130, 166, 202, 208, 214, 216]),
  GOLD_CENTER: mapAnsiPalette([94, 136, 178, 214, 220]),
  DARK_CENTER: mapAnsiPalette([52, 58, 94, 130, 136]),
  GREENS: mapAnsiPalette([22, 28, 28, 34, 35, 71, 77, 114]),
  BLUE: mapAnsiPalette([25, 33, 39, 75, 111, 117]),
  PAPER: mapAnsiPalette([24, 31, 67, 110, 153, 195]),
  RIBBON: mapAnsiPalette([94, 136, 178, 214, 220, 229]),
  HEART_COLORS: mapAnsiPalette([27, 33, 39, 45, 75, 117]),
  MSG_COLORS: mapAnsiPalette([
    161, 168, 205, 211, 218, 225, 218, 211, 205, 168,
    27, 33, 39, 45, 75, 117, 75, 45, 39, 33,
  ]),
};

/**
 * Extra quick-apply colour presets for the Editor (including Section 2 blue ideas)
 */
export const PALETTE_PRESETS = {
  DEEP_BLUE: mapAnsiPalette([17, 18, 19, 20, 21, 27]),
  SKY_BLUE: mapAnsiPalette([39, 45, 81, 117, 159, 195]),
  PURE_BLUE_MSG: mapAnsiPalette([27, 33, 39, 45, 75, 117, 153, 195, 153, 117, 75, 45, 39, 33]),
  ICY_PAPER: mapAnsiPalette([31, 38, 74, 117, 159, 195]),
  ROSE_GOLD_RIBBON: ["#7a4b47", "#9e635e", "#c07d76", "#dca098", "#ecc0b9", "#f8dfd9"],
};

/**
 * Default settings — 100% faithful to the original bouquet3d.py, with a
 * neutral banner so a fresh visit is nobody's personal gift.
 */
export const DEFAULT_SETTINGS = {
  // Renderer: 'canvas' | 'webgl' | 'dom'
  renderer: "canvas",

  // Theme: 'paper' (warm off-white page), 'midnight' (dark terminal ocean),
  // 'tide' (cool pale page). ids are shared in links, so keep them stable.
  theme: "paper",

  // Animation
  fps: 120,
  spinSpeed: 0.45,
  tilt: 0.45,
  camDist: 4.0,
  heartCount: 57,
  heartSpeed: 1.0,
  breathingAmp: 0.06,

  // Structure & Seed
  seed: 21,
  flowerHeads: 15,
  leafCount: 12,
  babiesCount: 90,
  sparklesCount: 30,

  // Flowers
  tulipCount: 2,
  petalMultiplier: 1.0,
  flowerSizeMin: 0.11,
  flowerSizeMax: 0.17,

  // Message
  message: "for you ♥",

  // Quit-heart easter egg colour (ANSI 39 = #00afff)
  quitHeartColor: ansi256ToHex(39),

  // Palettes (deep-cloned when used)
  palettes: structuredClone(DEFAULT_PALETTES),
};

export function cloneDefaults() {
  return structuredClone(DEFAULT_SETTINGS);
}

/** Longest banner the ASCII grid draws. Mirrors the editor's counter. */
export const MESSAGE_MAX_LENGTH = 100;

/**
 * A share link is a few hundred characters. Anything much longer is corrupted
 * or a payload, so the decoder refuses it instead of allocating blind.
 */
export const MAX_ENCODED_LENGTH = 4096;

/**
 * Every numeric setting has an editor range. Encoding only writes values that
 * differ from the defaults, and decoding clamps to these bounds — a hand-edited
 * link must never be able to ask the renderer for a billion hearts or flowers.
 */
export const NUMERIC_LIMITS = {
  fps: [15, 120],
  spinSpeed: [0, 2],
  tilt: [-0.8, 1.1],
  camDist: [2.2, 6.5],
  heartCount: [0, 140],
  heartSpeed: [0.1, 3],
  breathingAmp: [0, 0.2],
  seed: [1, 9999],
  flowerHeads: [3, 30],
  leafCount: [0, 24],
  babiesCount: [0, 180],
  sparklesCount: [0, 100],
  tulipCount: [0, 30],
  petalMultiplier: [0.5, 2],
  flowerSizeMin: [0.06, 0.24],
  flowerSizeMax: [0.08, 0.28],
};

/** Settings the editor treats as whole numbers (step=1 / parseInt). */
const INTEGER_KEYS = new Set([
  "fps",
  "heartCount",
  "seed",
  "flowerHeads",
  "leafCount",
  "babiesCount",
  "sparklesCount",
  "tulipCount",
]);

/**
 * Clamp a numeric setting to its editor range. Non-numeric keys (message,
 * theme, renderer, colours) pass straight through, so any caller can run every
 * setting through this without branching.
 */
export function clampNumber(key, value) {
  const range = NUMERIC_LIMITS[key];
  if (!range) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS[key];
  const [min, max] = range;
  const clamped = Math.min(max, Math.max(min, n));
  return INTEGER_KEYS.has(key) ? Math.round(clamped) : clamped;
}

/**
 * The banner is one short line of plain text: never markup, never multi-line.
 * (The renderer escapes it per character as well; this is defence in depth.)
 */
export function sanitizeMessage(value, fallback = DEFAULT_SETTINGS.message) {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").slice(0, MESSAGE_MAX_LENGTH);
}

/**
 * Token used when a share link contains no customised values at all.
 * It keeps "shared links open in Guest mode" true even for the defaults.
 */
export const SHARE_DEFAULTS_TOKEN = "~";

/**
 * Compact URL state encoding: ONLY encodes keys that differ from DEFAULT_SETTINGS
 */
export function encodeSettingsToParam(settings) {
  const diff = {};
  const def = DEFAULT_SETTINGS;

  for (const key of Object.keys(def)) {
    if (key === "palettes") continue;
    if (settings[key] !== def[key]) {
      diff[key] = settings[key];
    }
  }

  // Compare palettes
  if (settings.palettes) {
    const pDiff = {};
    for (const pKey of Object.keys(def.palettes)) {
      const curArr = settings.palettes[pKey];
      const defArr = def.palettes[pKey];
      if (
        Array.isArray(curArr) &&
        JSON.stringify(curArr).toLowerCase() !== JSON.stringify(defArr).toLowerCase()
      ) {
        pDiff[pKey] = curArr;
      }
    }
    if (Object.keys(pDiff).length > 0) {
      diff.p = pDiff;
    }
  }

  if (Object.keys(diff).length === 0) return "";

  try {
    const json = JSON.stringify(diff);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    // URL-safe base64
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (e) {
    console.error("Failed to encode settings:", e);
    return "";
  }
}

const NUMERIC_KEYS = Object.keys(NUMERIC_LIMITS);

const RENDERERS = ["canvas", "webgl", "dom"];
const THEMES = ["paper", "midnight", "tide"];

export function decodeSettingsFromParam(encoded) {
  const base = cloneDefaults();
  if (typeof encoded !== "string" || !encoded || encoded === SHARE_DEFAULTS_TOKEN) {
    return base;
  }
  if (encoded.length > MAX_ENCODED_LENGTH) {
    console.warn("Share link is longer than expected; using defaults.");
    return base;
  }

  try {
    let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const diff = JSON.parse(new TextDecoder().decode(bytes));
    // A share link must decode to a plain object of settings.
    if (!diff || typeof diff !== "object" || Array.isArray(diff)) return base;

    for (const key of Object.keys(base)) {
      if (key === "palettes") continue;
      if (diff[key] !== undefined) {
        base[key] = diff[key];
      }
    }

    // Coerce / reject anything a hand-edited URL could break
    for (const key of NUMERIC_KEYS) {
      base[key] = clampNumber(key, base[key]);
    }
    if (!RENDERERS.includes(base.renderer)) base.renderer = DEFAULT_SETTINGS.renderer;
    if (!THEMES.includes(base.theme)) base.theme = DEFAULT_SETTINGS.theme;
    base.message = sanitizeMessage(base.message, DEFAULT_SETTINGS.message);
    base.quitHeartColor = sanitizeColor(base.quitHeartColor, DEFAULT_SETTINGS.quitHeartColor);

    // Interdependent pairs, normalised so the renderer can trust the scene
    base.tulipCount = Math.min(base.tulipCount, base.flowerHeads);
    const sizeLo = Math.min(base.flowerSizeMin, base.flowerSizeMax);
    const sizeHi = Math.max(base.flowerSizeMin, base.flowerSizeMax);
    base.flowerSizeMin = sizeLo;
    base.flowerSizeMax = sizeHi;

    if (diff.p && typeof diff.p === "object") {
      for (const pKey of Object.keys(base.palettes)) {
        const incoming = diff.p[pKey];
        if (!Array.isArray(incoming) || incoming.length === 0) continue;
        // Keep the palette length stable and never trust arbitrary strings
        base.palettes[pKey] = base.palettes[pKey].map((fallback, i) =>
          sanitizeColor(incoming[i], fallback)
        );
      }
    }
    return base;
  } catch (e) {
    console.warn("Invalid share link parameter, falling back to defaults:", e);
    return base;
  }
}
