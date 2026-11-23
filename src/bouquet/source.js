import rawSource from "../../bouquet3d.py?raw";
import { ansi256ToHex } from "./defaults";

/**
 * The source viewer shows bouquet3d.py tuned to whatever is currently in the
 * studio, so the code never drifts from the bouquet on screen.
 */

function parseHex(hex) {
  let h = String(hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6);
  const n = Number.parseInt(h, 16);
  if (!Number.isFinite(n) || h.length !== 6) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const ANSI_RGB = Array.from({ length: 256 }, (_, i) => parseHex(ansi256ToHex(i)));
const ANSI_CACHE = new Map();

/** Closest xterm-256 index for a hex colour (the Python script's native format). */
export function hexToAnsi256(hex) {
  const key = String(hex || "").toLowerCase();
  if (ANSI_CACHE.has(key)) return ANSI_CACHE.get(key);
  const [r, g, b] = parseHex(key);
  let best = 15;
  let bestDist = Infinity;
  for (let i = 0; i < ANSI_RGB.length; i++) {
    const [ar, ag, ab] = ANSI_RGB[i];
    const d = (r - ar) ** 2 + (g - ag) ** 2 + (b - ab) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  ANSI_CACHE.set(key, best);
  return best;
}

const pyPalette = (colors) =>
  `[${(Array.isArray(colors) ? colors : []).map(hexToAnsi256).join(", ")}]`;

const pyString = (value) => JSON.stringify(String(value ?? ""));

const fmt = (n, fallback) => {
  const v = Number(n);
  return Number.isFinite(v) ? String(v) : String(fallback);
};

const count = (n, fallback) => Math.max(0, Math.round(Number(n ?? fallback)));

function tulipSlots(heads, tulipCount) {
  const slots = new Set();
  if (heads === 15 && tulipCount === 2) {
    slots.add(3);
    slots.add(8);
  } else {
    for (let t = 0; t < tulipCount; t++) {
      slots.add(
        Math.min(heads - 1, Math.floor(((t + 0.6) * heads) / Math.max(1, tulipCount)))
      );
    }
  }
  return slots;
}

const pySet = (set) => (set.size ? `{${[...set].sort((a, b) => a - b).join(", ")}}` : "set()");

export function buildSource(settings) {
  const pal = settings.palettes || {};
  const heads = Math.max(1, Math.round(Number(settings.flowerHeads ?? 15)));
  const tulips = Math.max(0, Math.min(heads, Math.round(Number(settings.tulipCount ?? 2))));
  const sizeMin = Math.min(
    Number(settings.flowerSizeMin ?? 0.11),
    Number(settings.flowerSizeMax ?? 0.17)
  );
  const sizeMax = Math.max(
    Number(settings.flowerSizeMin ?? 0.11),
    Number(settings.flowerSizeMax ?? 0.17)
  );

  let src = rawSource.replace(/\r\n?/g, "\n").replace(/\s+$/, "");

  const line = (prefix, value) => {
    src = src.replace(
      new RegExp(`^([ \\t]*)${prefix} = .*$`, "m"),
      (m, indent) => `${indent}${prefix} = ${value}`
    );
  };

  line("FPS", fmt(settings.fps, 120));
  line("SPIN_SPEED", fmt(settings.spinSpeed, 0.45));
  line("TILT", fmt(settings.tilt, 0.45));
  line("CAM_DIST", fmt(settings.camDist, 4.0));
  line("MESSAGE", pyString(settings.message ?? "for you ♥"));
  line("NUM_HEARTS", count(settings.heartCount, 57));

  for (const key of [
    "WHITE",
    "PINK",
    "RED",
    "PURPLE",
    "YELLOW",
    "ORANGE",
    "GOLD_CENTER",
    "DARK_CENTER",
    "GREENS",
    "BLUE",
    "PAPER",
    "RIBBON",
    "HEART_COLORS",
    "MSG_COLORS",
  ]) {
    if (Array.isArray(pal[key]) && pal[key].length) {
      line(key, pyPalette(pal[key]));
    }
  }

  // Extra tuning constants used by the patched body below
  src = src.replace(
    /^PIVOT_Y = .*$/m,
    (m) =>
      `${m}\nPETAL_MULT = ${fmt(settings.petalMultiplier, 1.0)}\nHEART_SPEED = ${fmt(
        settings.heartSpeed,
        1.0
      )}`
  );

  src = src.replace("random.Random(21)", `random.Random(${count(settings.seed, 21)})`);
  line("N", heads);
  src = src.replace(
    /tulip_slots = \{3, 8\}/,
    `tulip_slots = ${pySet(tulipSlots(heads, tulips))}`
  );

  // Flower radii and petal multiplier
  src = src.replace(
    /flowers\.append\(\(pos, "disc", petals, center, n_pet,\n\s+rnd\.uniform\(0\.11, 0\.17\), rnd\.uniform\(0, 6\.28\)\)\)/,
    `flowers.append((pos, "disc", petals, center,\n                            max(3, round(n_pet * PETAL_MULT)),\n                            rnd.uniform(${fmt(sizeMin, 0.11)}, ${fmt(
      sizeMax,
      0.17
    )}), rnd.uniform(0, 6.28)))`
  );

  // Leaves, baby's breath and sparkles
  src = src.replace(
    /^    for i in range\(12\):$/m,
    `    for i in range(${count(settings.leafCount, 12)}):`
  );
  src = src.replace(
    /babies = \[\]\n    for _ in range\(90\):/,
    `babies = []\n    for _ in range(${count(settings.babiesCount, 90)}):`
  );
  src = src.replace(
    /sparkles = \[\]\n    for _ in range\(30\):/,
    `sparkles = []\n    for _ in range(${count(settings.sparklesCount, 30)}):`
  );

  // Heart fall speed
  src = src.replace("h[1] -= h[2] * dt", "h[1] -= h[2] * HEART_SPEED * dt");

  // The farewell heart in the original script is ANSI 39
  src = src.replace(
    "\\033[38;5;39m♥\\033[0m",
    `\\033[38;5;${hexToAnsi256(settings.quitHeartColor || "#00afff")}m♥\\033[0m`
  );

  const header = [
    "# bouquet3d.py — tuned copy from the bouquet studio.",
    "# Reflects the settings currently on screen.",
    "",
  ].join("\n");

  return header + src;
}
