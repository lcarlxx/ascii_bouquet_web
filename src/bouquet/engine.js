import { ansi256ToHex } from "./defaults";

const SHADE = ".:-=+*%@";
const PETAL_SHADE = "+*#%";
const PIVOT_Y = 0.2;

// Normalized light vector from bouquet3d.py: _L = (-0.45, 0.6, 0.66)
const _L = [-0.45, 0.6, 0.66];
const _n = Math.hypot(_L[0], _L[1], _L[2]);
export const LIGHT_DIR = [_L[0] / _n, _L[1] / _n, _L[2] / _n];

const COLOR_231 = ansi256ToHex(231); // #ffffff
const COLOR_255 = ansi256ToHex(255); // #eeeeee
const COLOR_225 = ansi256ToHex(225); // #ffd7ff
const COLOR_218 = ansi256ToHex(218); // #ffafd7

/**
 * Deterministic PRNG (Mulberry32)
 */
export function createRng(seed = 21) {
  let a = (Number(seed) || 21) >>> 0;
  const random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const uniform = (min, max) => min + (max - min) * random();
  const choice = (arr) => arr[Math.floor(random() * arr.length)] || "#ffffff";
  return { random, uniform, choice };
}

function norm(v) {
  const m = Math.hypot(v[0], v[1], v[2]) || 1.0;
  return [v[0] / m, v[1] / m, v[2] / m];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function add(p, d, k) {
  return [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];
}

/**
 * Port of build_scene() from bouquet3d.py with full parameter support
 */
export function buildScene(settings) {
  const rnd = createRng(settings.seed);
  const pal = settings.palettes;

  const DISC_TYPES = [
    [pal.WHITE, pal.GOLD_CENTER, 13],
    [pal.PINK, pal.GOLD_CENTER, 8],
    [pal.RED, pal.DARK_CENTER, 6],
    [pal.PURPLE, pal.GOLD_CENTER, 7],
    [pal.YELLOW, pal.DARK_CENTER, 12],
    [pal.BLUE, pal.GOLD_CENTER, 9],
    [pal.BLUE, pal.GOLD_CENTER, 10],
    [pal.BLUE, pal.DARK_CENTER, 8],
    [pal.BLUE, pal.GOLD_CENTER, 13],
  ];
  const TULIP_COLORS = [pal.RED, pal.PINK, pal.YELLOW, pal.BLUE];

  const pts = [];
  const neck = [0.0, -0.12, 0.0];
  const C = [0.0, 0.12, 0.0];
  const D = 0.64;
  const N = Math.max(1, Math.round(settings.flowerHeads ?? 15));
  const golden = Math.PI * (3 - Math.sqrt(5));

  const heads = [];
  for (let i = 0; i < N; i++) {
    const ratio = N > 1 ? i / (N - 1) : 0;
    const el = ((88 - 60 * Math.sqrt(ratio)) * Math.PI) / 180;
    const az = i * golden;
    const d = [
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    ];
    const pos = add(C, d, D * rnd.uniform(0.92, 1.05));
    heads.push([pos, norm(d)]);
  }

  // Determine tulip slots: exact {3, 8} when N=15 and tulipCount=2
  const tulipCount = Math.max(0, Math.min(N, Math.round(settings.tulipCount ?? 2)));
  const tulipSlots = new Set();
  if (N === 15 && tulipCount === 2) {
    tulipSlots.add(3);
    tulipSlots.add(8);
  } else {
    for (let t = 0; t < tulipCount; t++) {
      const slot = Math.min(N - 1, Math.floor(((t + 0.6) * N) / Math.max(1, tulipCount)));
      tulipSlots.add(slot);
    }
  }

  const flowers = [];
  let disc_i = 0;
  const sizeMin = Math.min(settings.flowerSizeMin ?? 0.11, settings.flowerSizeMax ?? 0.17);
  const sizeMax = Math.max(settings.flowerSizeMin ?? 0.11, settings.flowerSizeMax ?? 0.17);
  const petalMult = settings.petalMultiplier ?? 1.0;

  for (let idx = 0; idx < heads.length; idx++) {
    const [pos, axis] = heads[idx];
    const base = add(pos, axis, -0.03);
    for (let j = 0; j < 70; j++) {
      const t = j / 69;
      const p = [
        base[0] + (neck[0] - base[0]) * t,
        base[1] + (neck[1] - base[1]) * t,
        base[2] + (neck[2] - base[2]) * t,
      ];
      pts.push({
        x: p[0],
        y: p[1],
        z: p[2],
        nx: axis[0],
        ny: 0.0,
        nz: axis[2],
        pal: pal.GREENS,
        tone: -0.15,
        twoSided: true,
        override: null,
        part: "stem",
      });
    }

    if (tulipSlots.has(idx)) {
      let n_t = 0;
      for (const k of tulipSlots) {
        if (k < idx) n_t++;
      }
      flowers.push({
        pos,
        axis,
        kind: "tulip",
        pal: TULIP_COLORS[n_t % TULIP_COLORS.length],
        cpal: null,
        nPet: 0,
        R: sizeMin,
        seed: rnd.uniform(0, 6.28),
      });
    } else {
      const [petals, center, basePet] = DISC_TYPES[disc_i % DISC_TYPES.length];
      disc_i++;
      const nPet = Math.max(3, Math.round(basePet * petalMult));
      flowers.push({
        pos,
        axis,
        kind: "disc",
        pal: petals,
        cpal: center,
        nPet,
        R: rnd.uniform(sizeMin, sizeMax),
        seed: rnd.uniform(0, 6.28),
      });
    }
  }

  // Leaves around perimeter
  const leafCount = Math.max(0, Math.round(settings.leafCount ?? 12));
  for (let i = 0; i < leafCount; i++) {
    const a = ((i + 0.4) / Math.max(1, leafCount)) * 2 * Math.PI;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const base = [0.26 * c, 0.3, 0.26 * s];
    const d = norm([c, 0.15, s]);
    const side = [-s, 0.0, c];
    const n = norm(cross(side, d));
    const L = 0.3;
    const W = 0.07;
    for (let ti = 0; ti < 32; ti++) {
      const t = ti / 31;
      for (let wi = -5; wi <= 5; wi++) {
        const w = wi / 5;
        const curl = 0.025 * w * w;
        const p = [
          base[0] + d[0] * L * t + side[0] * W * Math.sin(Math.PI * t) * w + n[0] * curl,
          base[1] + d[1] * L * t - 0.1 * t * t + n[1] * curl,
          base[2] + d[2] * L * t + side[2] * W * Math.sin(Math.PI * t) * w + n[2] * curl,
        ];
        const rib = wi === 0 ? -0.25 : 0.0;
        pts.push({
          x: p[0],
          y: p[1],
          z: p[2],
          nx: n[0],
          ny: n[1],
          nz: n[2],
          pal: pal.GREENS,
          tone: rib,
          twoSided: true,
          override: null,
          part: "leaf",
        });
      }
    }
  }

  // Paper cone wrapper
  const y0 = -0.2,
    y1 = 0.3,
    r0 = 0.06,
    r1 = 0.36;
  const k = (r1 - r0) / (y1 - y0);
  const rings = 50;
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    const r = r0 + (r1 - r0) * t;
    const count = Math.max(8, Math.floor(170 * r));
    for (let j = 0; j < count; j++) {
      const ph = ((j + rnd.random()) / count) * 2 * Math.PI;
      const c = Math.cos(ph);
      const s = Math.sin(ph);
      let y = y0 + (y1 - y0) * t;
      if (t > 0.9) {
        y += 0.03 * Math.sin(9 * ph);
      }
      const fold = 0.3 * (Math.abs(Math.sin(5 * ph)) - 0.6);
      const nn = norm([c, -k, s]);
      pts.push({
        x: r * c,
        y,
        z: r * s,
        nx: nn[0],
        ny: nn[1],
        nz: nn[2],
        pal: pal.PAPER,
        tone: fold,
        twoSided: false,
        override: null,
        part: "paper",
      });
    }
  }

  // Lower stems below wrapper
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * 2 * Math.PI;
    const sx = 0.025 * Math.cos(a);
    const sz = 0.025 * Math.sin(a);
    for (let j = 0; j < 40; j++) {
      const t = j / 39;
      pts.push({
        x: sx * (1 + 1.2 * t),
        y: -0.2 - 0.3 * t,
        z: sz * (1 + 1.2 * t),
        nx: Math.cos(a),
        ny: 0.0,
        nz: Math.sin(a),
        pal: pal.GREENS,
        tone: -0.1,
        twoSided: true,
        override: null,
        part: "lowerStem",
      });
    }
  }

  // Ribbon band & bow
  const by = -0.12;
  const br = r0 + k * (by - y0) + 0.01;
  for (let j = 0; j < 90; j++) {
    const ph = (j / 90) * 2 * Math.PI;
    for (const dy of [-0.012, 0.0, 0.012]) {
      pts.push({
        x: br * Math.cos(ph),
        y: by + dy,
        z: br * Math.sin(ph),
        nx: Math.cos(ph),
        ny: 0.0,
        nz: Math.sin(ph),
        pal: pal.RIBBON,
        tone: 0.0,
        twoSided: false,
        override: null,
        part: "ribbon",
      });
    }
  }

  const knot = [0.0, by, br + 0.01];
  for (const side of [-1, 1]) {
    for (let j = 0; j < 70; j++) {
      const a = (j / 70) * 2 * Math.PI;
      const lx = side * (0.07 + 0.07 * Math.cos(a));
      const ly = 0.04 * Math.sin(a) + (0.02 * (0.07 + 0.07 * Math.cos(a))) / 0.14;
      for (const fill of [1.0, 0.7]) {
        pts.push({
          x: knot[0] + lx * fill,
          y: knot[1] + ly * fill,
          z: knot[2] + 0.01,
          nx: side * 0.3,
          ny: 0.2,
          nz: 0.93,
          pal: pal.RIBBON,
          tone: 0.1,
          twoSided: true,
          override: null,
          part: "ribbon",
        });
      }
    }
    for (let j = 0; j < 30; j++) {
      const t = j / 29;
      pts.push({
        x: knot[0] + side * 0.06 * t,
        y: knot[1] - 0.15 * t,
        z: knot[2] + 0.015,
        nx: side * 0.2,
        ny: 0.0,
        nz: 0.98,
        pal: pal.RIBBON,
        tone: -0.05 + 0.05 * Math.sin(t * 9),
        twoSided: true,
        override: null,
        part: "ribbon",
      });
    }
  }
  for (const dx of [-0.01, 0.0, 0.01]) {
    pts.push({
      x: dx,
      y: by,
      z: knot[2] + 0.02,
      nx: 0,
      ny: 0,
      nz: 1,
      pal: pal.RIBBON,
      tone: 0.2,
      twoSided: true,
      override: "@",
      part: "ribbonKnot",
    });
  }

  // Baby's breath
  const babies = [];
  const babiesCount = Math.max(0, Math.round(settings.babiesCount ?? 90));
  for (let i = 0; i < babiesCount; i++) {
    const a = rnd.random() * 2 * Math.PI;
    const el = rnd.uniform(0.3, 1.4);
    const rr = rnd.uniform(0.4, 0.58);
    babies.push([
      rr * Math.cos(a) * Math.cos(el),
      C[1] + rr * Math.sin(el),
      rr * Math.sin(a) * Math.cos(el),
      rnd.uniform(0, 6.28),
    ]);
  }

  // Sparkles
  const sparkles = [];
  const sparklesCount = Math.max(0, Math.round(settings.sparklesCount ?? 30));
  for (let i = 0; i < sparklesCount; i++) {
    const a = rnd.random() * 2 * Math.PI;
    const rr = rnd.uniform(0.75, 0.95);
    sparkles.push([
      rr * Math.cos(a),
      rnd.uniform(-0.3, 1.0),
      rr * Math.sin(a),
      rnd.uniform(0, 6.28),
      rnd.uniform(1.5, 4.0),
    ]);
  }

  return { pts, flowers, babies, sparkles };
}

/**
 * Update floating hearts array in-place
 */
export function updateHearts(hearts, dt, settings) {
  const targetCount = Math.max(0, Math.round(settings.heartCount ?? 57));
  const heartPal = settings.palettes?.HEART_COLORS?.length
    ? settings.palettes.HEART_COLORS
    : ["#005fff", "#0087ff", "#00afff"];
  const speedMult = settings.heartSpeed ?? 1.0;

  while (hearts.length > targetCount) {
    hearts.pop();
  }
  while (hearts.length < targetCount) {
    hearts.push([
      Math.random(),
      1.0 + Math.random(),
      0.02 + Math.random() * 0.03,
      Math.random() * 6.28,
      heartPal[Math.floor(Math.random() * heartPal.length)],
    ]);
  }
  for (let i = 0; i < hearts.length; i++) {
    const h = hearts[i];
    h[1] -= h[2] * speedMult * dt;
    if (h[1] < 0) {
      h[0] = Math.random();
      h[1] = 1.0;
      h[4] = heartPal[Math.floor(Math.random() * heartPal.length)];
    }
  }
}

/**
 * Compute 2D grid buffer (chars + hex colors) for Canvas 2D and Monospace DOM renderers.
 * Matches render() from bouquet3d.py pixel-for-character!
 */
export function computeAsciiFrame(scene, t, cols, rows, hearts, settings, cameraOffset = {}) {
  const { pts, flowers, babies, sparkles } = scene;
  const size = cols * rows;
  const chars = new Array(size).fill(" ");
  const colors = new Array(size).fill("");
  const zbuf = new Float32Array(size).fill(-1e9);

  const viewRows = rows - 2;
  const scale = Math.max(1.0, Math.min((viewRows - 2) / 1.45, (cols - 2) / 2.7));
  const sxScale = scale * 2.0;
  const cx = cols / 2;
  const cy = 1 + 0.78 * scale;

  const ang = t * (settings.spinSpeed ?? 0.45) + (cameraOffset.azimuth || 0);
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);

  const tiltVal = (settings.tilt ?? 0.45) + (cameraOffset.elevation || 0);
  const ct = Math.cos(tiltVal);
  const st = Math.sin(tiltVal);

  const camDist = Math.max(1.8, (settings.camDist ?? 4.0) + (cameraOffset.zoom || 0));
  const [LX, LY, LZ] = LIGHT_DIR;

  function plot(col, row, z, ch, color) {
    if (row >= 0 && row < viewRows && col >= 0 && col < cols) {
      const idx = row * cols + col;
      if (z > zbuf[idx]) {
        zbuf[idx] = z;
        chars[idx] = ch;
        colors[idx] = color;
      }
    }
  }

  // 1. Background rising hearts
  for (let i = 0; i < hearts.length; i++) {
    const [x, y, , phase, color] = hearts[i];
    let col = Math.floor((x + 0.015 * Math.sin(t * 1.2 + phase)) * cols) % cols;
    if (col < 0) col += cols;
    plot(col, Math.floor(y * viewRows), -50, "♥", color);
  }

  // 2. 3D scene points (stems, leaves, wrapper, ribbon)
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    const xr = pt.x * ca - pt.z * sa;
    const zr = pt.x * sa + pt.z * ca;
    const yp = pt.y - PIVOT_Y;
    const yt = yp * ct - zr * st;
    const zt = yp * st + zr * ct;
    const f = camDist / (camDist - zt);
    const col = Math.trunc(cx + xr * f * sxScale);
    const row = Math.trunc(cy - yt * f * scale);

    const nxr = pt.nx * ca - pt.nz * sa;
    const nzr = pt.nx * sa + pt.nz * ca;
    const nyt = pt.ny * ct - nzr * st;
    const nzt = pt.ny * st + nzr * ct;
    let dot = nxr * LX + nyt * LY + nzt * LZ;
    if (pt.twoSided && dot < 0) {
      dot = -dot * 0.55;
    }
    let b = 0.25 + 0.75 * Math.max(0.0, dot) + pt.tone;
    b = Math.min(0.999, Math.max(0.0, b));

    let ch;
    if (pt.override === "P") {
      ch = PETAL_SHADE[Math.floor(b * PETAL_SHADE.length)];
    } else {
      ch = pt.override || SHADE[Math.floor(b * SHADE.length)];
    }
    const pal = pt.pal;
    const color = pal[Math.floor(b * pal.length)];
    plot(col, row, zt, ch, color);
  }

  // 3. Flower heads (discs & tulips)
  const breathingAmp = settings.breathingAmp ?? 0.06;
  for (let i = 0; i < flowers.length; i++) {
    const fl = flowers[i];
    const [x, y, z] = fl.pos;
    const xr = x * ca - z * sa;
    const zr = x * sa + z * ca;
    const yp = y - PIVOT_Y;
    const yt = yp * ct - zr * st;
    const zt = yp * st + zr * ct;
    const f = camDist / (camDist - zt);
    const fx = cx + xr * f * sxScale;
    const fy = cy - yt * f * scale;

    const R2 = fl.R * (1 + breathingAmp * Math.sin(t * 2 + fl.seed));
    const rx = R2 * f * sxScale;
    const ry = R2 * f * scale;
    const dim = -0.4 * (1 - Math.min(1.0, Math.max(0.0, (zt + 0.6) / 1.2)));
    const rot = fl.seed + ang * 0.7;

    const rStart = Math.trunc(fy - ry) - 1;
    const rEnd = Math.trunc(fy + ry) + 2;
    const cStart = Math.trunc(fx - rx) - 1;
    const cEnd = Math.trunc(fx + rx) + 2;

    for (let row = rStart; row < rEnd; row++) {
      const dy = (row + 0.5 - fy) / ry;
      for (let col = cStart; col < cEnd; col++) {
        const dx = (col + 0.5 - fx) / rx;
        if (fl.kind === "disc") {
          const s = Math.hypot(dx, dy);
          if (s > 1.0) continue;
          if (s < 0.3) {
            let b = 0.55 - 0.35 * dx - 0.35 * dy + dim;
            b = Math.min(0.999, Math.max(0.0, b));
            plot(
              col,
              row,
              zt + 0.06,
              s < 0.17 ? "@" : "o",
              fl.cpal[Math.floor(b * fl.cpal.length)]
            );
            continue;
          }
          const ph = Math.atan2(dy, dx);
          const reach =
            0.32 + 0.68 * Math.pow(Math.abs(Math.cos((fl.nPet * (ph + rot)) / 2)), 0.7);
          if (s > reach) continue;
          const edge = s > reach - 0.14 ? -0.22 : 0.0;
          let b = 0.62 - 0.22 * dx - 0.28 * dy + 0.12 * s + edge + dim;
          b = Math.min(0.999, Math.max(0.0, b));
          plot(
            col,
            row,
            zt + 0.04 * (1 - s),
            PETAL_SHADE[Math.floor(b * PETAL_SHADE.length)],
            fl.pal[Math.floor(b * fl.pal.length)]
          );
        } else {
          const v = (1 - dy) / 2;
          if (v < 0 || v > 1) continue;
          const hw = 0.62 * Math.sin(Math.PI * 0.5 * Math.min(1.0, v * 1.5 + 0.05));
          if (hw <= 0 || Math.abs(dx) > hw) continue;
          const xn = dx / hw;
          const cVal = Math.cos(1.5 * Math.PI * xn);
          if (v > 0.72 + 0.28 * cVal * cVal) continue;
          const seam = Math.abs(Math.abs(xn) - 0.33) < 0.12 && v > 0.3 ? -0.25 : 0.0;
          let b = 0.55 - 0.3 * xn + 0.1 * v + seam + dim;
          b = Math.min(0.999, Math.max(0.0, b));
          plot(
            col,
            row,
            zt + 0.03,
            PETAL_SHADE[Math.floor(b * PETAL_SHADE.length)],
            fl.pal[Math.floor(b * fl.pal.length)]
          );
        }
      }
    }
  }

  // 4. Baby's breath
  for (let i = 0; i < babies.length; i++) {
    const [x, y, z, phase] = babies[i];
    const xr = x * ca - z * sa;
    const zr = x * sa + z * ca;
    const yp = y - PIVOT_Y;
    const yt = yp * ct - zr * st;
    const zt = yp * st + zr * ct;
    const f = camDist / (camDist - zt);
    const col = Math.trunc(cx + xr * f * sxScale);
    const row = Math.trunc(cy - yt * f * scale);
    const star = Math.sin(t * 2 + phase) > 0.6;
    plot(col, row, zt + 0.02, star ? "*" : "·", star ? COLOR_231 : COLOR_255);
  }

  // 5. Sparkles
  for (let i = 0; i < sparkles.length; i++) {
    const [x, y, z, phase, speed] = sparkles[i];
    const xr = x * ca - z * sa;
    const zr = x * sa + z * ca;
    const yp = y - PIVOT_Y;
    const yt = yp * ct - zr * st;
    const zt = yp * st + zr * ct;
    const f = camDist / (camDist - zt);
    const col = Math.trunc(cx + xr * f * sxScale);
    const row = Math.trunc(cy - yt * f * scale);
    const tw = Math.sin(t * speed + phase);
    if (tw > 0.85) {
      plot(col, row, zt, "*", COLOR_231);
    } else if (tw > 0.4) {
      plot(col, row, zt, "+", COLOR_225);
    } else if (tw > 0.0) {
      plot(col, row, zt, "·", COLOR_218);
    }
  }

  // 6. Message at bottom row (rows - 2)
  const msg = String(settings.message ?? "for you ♥").slice(0, 100);
  const msgColors = settings.palettes?.MSG_COLORS?.length
    ? settings.palettes.MSG_COLORS
    : ["#ff5faf", "#00afff"];
  const mrow = rows - 2;
  if (mrow >= 0 && mrow < rows && msg.length > 0) {
    const start = Math.max(0, Math.floor((cols - msg.length) / 2));
    const shift = Math.floor(t * 6);
    for (let i = 0; i < msg.length; i++) {
      if (start + i < cols) {
        const idx = mrow * cols + (start + i);
        chars[idx] = msg[i];
        colors[idx] = msgColors[(i + shift) % msgColors.length];
      }
    }
  }

  return { chars, colors, cols, rows };
}
