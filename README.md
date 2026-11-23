# ASCII Bouquet

**A spinning ASCII bouquet, rendered live in your browser.** Remix the flowers, colours, motion and message, then copy a link that reproduces your bouquet exactly.

This is an open-source (MIT) plaything: no accounts, no server, no database, no tracking. One page, one canvas full of terminal characters, and a small studio drawer that edits every number behind it.

> Origin: this began as a gift project around a Python terminal script, `bouquet3d.py` that I sourced from a repo made by [alishsharma17](https://github.com/alishsharma17/Ascii-Flower-Bouquet- "Go to Repo!"). That script is still in this repo and is still the reference renderer — the browser engine is a faithful JavaScript port of it, and the "Source" button in the viewer shows the same script tuned to whatever is currently on screen.

---

## Table of contents

- [What it is for](#what-it-is-for)
- [Feature tour](#feature-tour)
- [Quick start](#quick-start)
- [Deploy](#deploy)
- [How it works](#how-it-works)
  - [The renderer](#the-renderer)
  - [The settings model](#the-settings-model)
  - [Share links](#share-links)
  - [The studio](#the-studio)
  - [Themes](#themes)
  - [Themes and the frame colour](#themes-and-the-frame-colour)
- [Customising](#customising)
- [Making it yours (recipes)](#making-it-yours-recipes)
- [File map](#file-map)
- [Security and privacy](#security-and-privacy)
- [Accessibility](#accessibility)
- [Performance](#performance)
- [Browser support](#browser-support)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Credits](#credits)

---

## What it is for

Good fits:

- **A digital bouquet as a gift.** Send the link instead of flowers, or attach it to a card. The recipient can edit it themselves — it is deliberately not a locked, password-gated love letter.
- **A personalisable share page.** Any bouquet configuration is a URL, so you can drop one into a chat, a QR code, or a README.
- **Generative-art demo / teaching material.** A readable example of projecting 3D points to an ASCII grid in real time, with three renderers (text, 2D canvas, WebGL) in one codebase.
- **A screen-saver-ish display.** Leave it open; it spins forever at up to 120 fps.
- **A source of images.** The camera button saves a 3× PNG of the current frame, printable or postable.
- **A starting point.** The palette and structure controls are the interesting part — fork it and build your own terminal-art toy.

Deliberately not included:

- No accounts, auth, or password gate.
- No backend, database, analytics, or cookies.
- No bundled music or third-party media.
- No photo gallery, timeline, or letter sections.

---

## Feature tour

- **Live ASCII bouquet** — ~65-column character grid, coloured per glyph, spinning and breathing continuously.
- **Three renderers** — monospace DOM text (2D), Canvas 2D export path, and a lazy-loaded three.js WebGL scene.
- **Camera control** — drag to spin, drag vertically to tilt, pinch or ⌘/Ctrl+scroll to zoom, plus a "Reset view" button.
- **Studio drawer** — a pencil button opens a bottom sheet (mobile) or side drawer (desktop) with Motion, Shape, Flowers, Colour and Text tabs.
- **14 editable palettes** — blue/white/pink/red/purple/yellow flowers, gold and dark centres, greens, paper wrapper, ribbon, floating hearts, message shimmer — plus five one-tap presets.
- **Editable banner** — up to 100 characters set in the shimmer palette under the bouquet.
- **Per-setting reset and "Reset all"** — the production defaults are always one click away.
- **Share links** — only the values that differ from the defaults are encoded, into a compact base64url `?b=` parameter.
- **PNG snapshot** — saves exactly what is on screen at 3× resolution.
- **Source viewer** — shows `bouquet3d.py` regenerated from the current settings, copyable as Python.
- **Quit-heart easter egg** — reproduces the script's `Ctrl+C` farewell heart, with a configurable colour.
- **Three themes** — Paper, Midnight, Tide, with a light/dark toggle in the header.
- **Zero network calls at runtime** other than the two Google Fonts hosts.

---

## Quick start

Requirements: **Node 18+** (Vite 6).

```bash
git clone https://github.com/lcarlxx/ascii_bouquet_web.git
cd ascii_bouquet_web
npm install
npm run dev      # http://localhost:5173
```

Build and preview the production bundle:

```bash
npm run build    # output in dist/
npm run preview  # serve the built site locally
```

There is no `.env`, no API key, and no service to configure.

---

## Deploy

### Vercel (the default)

The repo is Vercel-ready. `vercel.json` does two jobs:

1. Rewrites every path to `index.html`, so `/?b=…` links resolve on a hard refresh.
2. Sets the security headers (see [Security and privacy](#security-and-privacy)).

```bash
npx vercel        # first deploy, links the project
npx vercel --prod # production
```

### GitHub Pages

`.github/workflows/deploy.yml` builds `dist/` with Vite (`base: './'`) and deploys it on every push to `main`. In your repository settings (**Settings → Pages → Build and deployment**), set **Source** to **GitHub Actions**. Because share links store settings in `?b=…` query parameters, they work natively on GitHub Pages without server rewrites; the `<meta http-equiv="Content-Security-Policy">` tag in `index.html` enforces the CSP where custom HTTP headers are unavailable.

### Netlify, Cloudflare Pages, any static host

The build is a static SPA. You need:

- Build command: `npm run build`
- Output directory: `dist`

On Netlify, a `netlify.toml` with `[[redirects]] from = "/*" to = "/index.html" status = 200` handles path rewrites; on Cloudflare Pages set the same in the dashboard. Copy the `headers` block from `vercel.json` into `_headers` on hosts that support custom response headers.

---

## How it works

```
┌─────────────────────────────┐
│ Python original             │  bouquet3d.py — the reference implementation
└──────────────┬──────────────┘
               │ hand-ported, deterministic
┌──────────────▼──────────────┐
│ settings (plain object)     │  src/bouquet/defaults.js
└──────────────┬──────────────┘
               │
   ┌───────────┴────────────┬──────────────────┐
   ▼                        ▼                  ▼
 buildScene()          computeAsciiFrame()   buildSource()
 engine.js             engine.js             source.js
   │                        │                  │
   ▼                        ▼                  ▼
 BouquetView.jsx  ◄──── render loop ────►  SourceModal
   │
   ├─ DOM <pre> (2D text)
   └─ WebGLBouquet.jsx (three.js, lazy)
```

### The renderer

`src/bouquet/engine.js` is a faithful port of `build_scene()` and `render()` from `bouquet3d.py`:

1. **`buildScene(settings)`** seeds a deterministic PRNG (`settings.seed`), then places flower heads, tulips, leaves, baby's breath, sparkles, the paper wrapper, ribbon and floating hearts in 3D. Same seed + same structure = same bouquet, every time, on every machine.
2. **`computeAsciiFrame(...)`** projects those points to the character grid each frame, applies lighting/shading via characters (`.:-=+*%@`), and emits two flat arrays: `chars` and `colors` (hex per cell).
3. `BouquetView.jsx` paints that frame:
   - **2D mode** writes coloured `<span>` runs into a `<pre>`, capped at ~50 DOM paints/sec while the maths runs at full rate. The browser antialiases every glyph, so it stays crisp at any zoom.
   - **3D mode** hands the same scene to `WebGLBouquet.jsx`, which builds real geometry with three.js (lazy-loaded, so the initial bundle stays small).
   - The same frame buffer is reused for the PNG export at 3× scale.

The animation loop reads settings from refs, so moving a slider never restarts the spin.

### The settings model

`src/bouquet/defaults.js` is the single source of truth. `DEFAULT_SETTINGS` contains every knob:

| Group | Keys |
| --- | --- |
| Renderer / theme | `renderer`, `theme` |
| Motion | `fps`, `spinSpeed`, `tilt`, `camDist`, `heartCount`, `heartSpeed`, `breathingAmp` |
| Structure | `seed`, `flowerHeads`, `leafCount`, `babiesCount`, `sparklesCount`, `tulipCount` |
| Flowers | `petalMultiplier`, `flowerSizeMin`, `flowerSizeMax` |
| Text / accents | `message`, `quitHeartColor` |
| Colour | `palettes` (14 named arrays of hex strings) |

Everything else — the studio UI, the share link, the Python source viewer — is derived from this object.

### Share links

The URL is the entire state. `encodeSettingsToParam()` walks the defaults and serialises **only the keys that differ**, JSON → UTF-8 → base64url:

```
https://your.site/?b=eyJzcGluU3BlZWQiOjAuOSwibWVzc2FnZSI6ImhpIn0
```

Details worth knowing:

- `?b=~` is a special token meaning "all defaults", so a shared link still produces a shareable link even when nothing was changed.
- Palette overrides are nested under a short `p` key; each palette keeps its length and any non-hex value is replaced by the default.
- Decoding is defensive: length-capped, type-checked, and every number is clamped to its editor range. See [Security](#security-and-privacy).
- The address bar is kept in sync on every edit with `history.replaceState`, so a refresh or a copied address bar reproduces the bouquet. Nothing is ever written to `localStorage`, `sessionStorage`, or a cookie.

### The studio

`src/bouquet/EditorDrawer.jsx` is a controlled component: it renders every setting and calls back. It is a bottom sheet under 640 px and a right-hand drawer above it. It shows a dirty indicator per row (the little reset arrow lights up when a value differs from the default), a per-palette reset, and a global reset.

### Themes

`src/theme.js` defines three looks as flat maps of Tailwind class strings plus a couple of hex values used for native controls (`--accent`, `--paper`). Theme IDs (`paper`, `midnight`, `tide`) are part of the share-link format — renaming one makes old links fall back to `paper`.

### Themes and the frame colour

The bouquet's own backdrop is separate from the page theme: `BouquetView.jsx` maps the theme to a deep frame colour so the ASCII always reads as a lit object, on a cream page or a navy one.

---

## Customising

| You want to change | Edit |
| --- | --- |
| Site name, tagline, hero copy, footer credit | `src/content.js` |
| Production defaults (the "reset" state) | `src/bouquet/defaults.js` → `DEFAULT_SETTINGS` |
| Add a colour preset to the studio | `src/bouquet/defaults.js` → `PALETTE_PRESETS`, then list it in `PRESETS` in `EditorDrawer.jsx` |
| Theme colours / add a fourth theme | `src/theme.js` (and the `THEMES` allow-list in `defaults.js` for link validation) |
| Fonts | `index.html` (Google Fonts link) + `src/index.css` (`@theme` tokens) |
| Default banner text | `DEFAULT_SETTINGS.message` and `bouquet3d.py`'s `MESSAGE` |
| Allowed slider ranges | `NUMERIC_LIMITS` in `defaults.js` — the studio and the link decoder share it |
| Security headers | `vercel.json` and the CSP `<meta>` in `index.html` |
| Favicon | the inline `<svg>` data URI in `index.html` |

### Adding a palette preset (example)

```js
// src/bouquet/defaults.js
export const PALETTE_PRESETS = {
  // ...
  LAVENDER: ["#1c1633", "#2f2450", "#4b3a7a", "#6f59a8", "#9a86cc", "#c8bce8"],
};
```

```jsx
// src/bouquet/EditorDrawer.jsx → PRESETS
{ label: "Lavender", key: "BLUE", preset: "LAVENDER" },
```

---

## Making it yours (recipes)

**"Send someone a bouquet."**
Open the site, tune the studio until it looks how you want, type your message in the Text tab, press **Copy share link**, and send that. The recipient gets exactly your bouquet and can keep editing.

**"Put it on a card / print it."**
Use the camera icon in the bouquet's top bar. It saves `ascii-bouquet.png` at 3× the on-screen size with the frame background baked in, so it is opaque and printable.

**"Set it as a looping display."**
Pick your settings, copy the link, and open it full-screen on the device. The loop is `requestAnimationFrame`-driven and stops while the tab is hidden.

**"Use it as a gift page with my own words."**
Edit `SITE_CONFIG` in `src/content.js` (name, tagline, intro, credit), then deploy your own copy. Keep the studio available — it is the point of the project.

**"I want the Python experience back."**
`bouquet3d.py` runs in a terminal: `python bouquet3d.py`. The Source button in the viewer shows the same file patched to your current settings, ready to paste and run.

---

## File map

```
.
├── index.html                  Shell: fonts, CSP meta, favicon, title
├── vercel.json                 SPA rewrite + security headers + asset caching
├── vite.config.js              React + Tailwind v4 plugins
├── bouquet3d.py                The original terminal script (reference + Source view)
├── LICENSE                     MIT
├── SECURITY.md                 Threat model and reporting
└── src
    ├── main.jsx                React root, reduced-motion config
    ├── App.jsx                 State owner: settings, URL sync, editor, layout
    ├── content.js              Site branding only
    ├── theme.js                Paper / Midnight / Tide
    ├── index.css               Tailwind entry, tokens, range + colour inputs
    ├── components
    │   └── Hero.jsx            Hero copy, CTAs, bouquet mount
    └── bouquet
        ├── defaults.js         Settings schema, palettes, encode/decode, clamping
        ├── engine.js           Port of build_scene() / render() — the maths
        ├── BouquetView.jsx     Frame loop, DOM + card, camera, PNG export
        ├── WebGLBouquet.jsx    three.js renderer (lazy-loaded chunk)
        ├── EditorDrawer.jsx    The studio
        ├── SourceModal.jsx     bouquet3d.py viewer
        └── source.js           Regenerates bouquet3d.py from settings
```

---

## Security and privacy

This is a static, client-only site. There is no server to attack, no credentials, and no personal data stored. The threat model is therefore narrow — but it is treated seriously, because a page anyone can share is a page anyone can craft a malicious link for.

**No data collection.** No analytics, no cookies, no fingerprinting, no network requests except the page bundle, and the CSS for three fonts from Google Fonts. The URL fragment/query is the only state, and it stays on the visitor's machine unless they copy it.

**Content Security Policy.** Enforced twice: as an HTTP header in `vercel.json` (which also sets `frame-ancestors 'none'`) and as a `<meta>` tag in `index.html` for hosts that cannot set headers. `default-src 'self'`; scripts are same-origin only; images allow `data:` and `blob:` for the favicon and PNG export; `object-src` and `form-action` are disabled; no inline scripts are allowed.

**Supporting headers.** HSTS (2 years, preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy` (camera/mic/geolocation/payment/USB off), and `Cross-Origin-Opener-Policy: same-origin`.

**Untrusted share links are validated, not trusted.**

- The `?b=` payload is length-capped at 4 KiB before base64 decoding.
- The decoded JSON must be a plain object; arrays, scalars and `null` are rejected.
- Every numeric setting is clamped to its editor range, so a crafted link cannot ask the renderer for a billion flowers or hearts (a trivial client-side denial of service otherwise).
- `seed`, counts and frame rate are additionally rounded to integers.
- Colours must match `^#[0-9a-fA-F]{3,8}$`; anything else falls back to the default. Palette length is fixed by the defaults, so arrays cannot be grown.
- The banner message is coerced to a string, has control characters stripped, and is cut to 100 characters.
- Interdependent pairs are normalised (`tulipCount ≤ flowerHeads`, `flowerSizeMin ≤ flowerSizeMax`).
- Unknown `renderer` and `theme` values fall back to the defaults.

**No HTML injection.** The ASCII frame is drawn with per-character escaping (`&`, `<`, `>` are escaped before the colour-span runs are assembled), so the banner can never become markup. Elsewhere, user values are rendered as text or applied through style properties — never through `dangerouslySetInnerHTML`.

**Clipboard fallback.** "Copy share link" uses the async Clipboard API and falls back to a temporary textarea with `execCommand("copy")` for older browsers; the temporary node is removed immediately.

**Dependencies.** React, Vite, Tailwind, Framer Motion, lucide-react and three.js only. `npm audit` is run before releases; see `SECURITY.md` for the policy.

**Deploying your own copy.** If you change hosts, carry the CSP and headers across. If you add a backend, analytics, or a third-party embed, you must widen the CSP deliberately — do not delete it.

To report a vulnerability, read [`SECURITY.md`](SECURITY.md). Please do not open a public issue for a live exploit.

---

## Accessibility

- All interactive controls are real `<button>`/`<input>` elements with labels; the bouquet has an `aria-label`.
- The studio supports Escape to close, and the drawer is reachable by keyboard (the pencil button is in the tab order).
- `prefers-reduced-motion` is honoured for page scrolling and Framer Motion transitions (`MotionConfig reducedMotion="user"`).
- Colour is never the only signal: dirty settings show a reset affordance, active renderer buttons use `aria-pressed`.
- The page is responsive from 390 px up; the studio becomes a bottom sheet on phones so the bouquet stays visible.
- Contrast: each theme is built on a paper/ink or navy/starlight pairing rather than pure white-on-black.

Known limitation: the ASCII art itself is decorative, not described text — the `aria-label` names it rather than transcribing it.

---

## Performance

- The scene is memoised; only structural or colour changes rebuild it. Motion values are read from refs, so sliders never restart the loop.
- 2D mode caps DOM paints at ~50 fps and batches consecutive same-colour characters into a single `<span>`.
- WebGL/three.js lives in its own lazy chunk (~500 kB raw, ~130 kB gzipped) and is only downloaded if the visitor chooses 3D.
- Frame rate is capped by `settings.fps` (default 120, minimum 15).
- The loop stops while the quit-heart easter egg is open.

---

## Browser support

Evergreen Chrome, Edge, Firefox and Safari. Required features: ES modules, `structuredClone`, `Intl`-free math, Canvas 2D, and (for 3D) WebGL2. `backdrop-filter` is progressive. No polyfills are shipped.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Blank page after deploying | Missing SPA rewrite. Set the catch-all to `/index.html`. |
| Shared link opens the default bouquet | The `b` parameter was mangled — some chat clients truncate URLs at `&` or `#`. Copy the whole link, or use a QR code. |
| Fonts look wrong | Google Fonts is blocked. The stack falls back to Georgia / system sans / Menlo; layout still works. |
| 3D mode says "Loading three.js" forever | The lazy chunk is blocked by a CSP you tightened, or the host is rewriting `/assets/*`. |
| The PNG is blank | WebGL context loss, or the first frame has not rendered yet — wait a moment and try again. |
| Sliders jump back | You are below `NUMERIC_LIMITS` — values clamp to the editor's range on purpose. |
| Old link shows the Paper theme | Theme IDs were renamed from the earlier gift version; unknown IDs intentionally fall back. |
| `npm run dev` port already in use | `npm run dev -- --port 5174`. |

---

## Contributing

Issues and PRs are welcome.

- Keep `bouquet3d.py` and `src/bouquet/engine.js` in step: the Python script is the reference for the maths, and the Source viewer promises they match.
- Any new numeric setting needs an entry in `DEFAULT_SETTINGS` **and** `NUMERIC_LIMITS`, or the share link cannot round-trip it safely.
- Run `npm run build` before opening a PR; there is no test suite yet, so a green build plus a manual pass at 390 px and on desktop is the bar.
- Do not add trackers, remote scripts, or telemetry — it would break the CSP and the privacy promise in this README.

---

## License

MIT — see [`LICENSE`](LICENSE). Use it, fork it, sell what you build with it; keep the copyright notice.

---

## Credits

- `bouquet3d.py`, the original terminal bouquet, and the palette choices it encodes.
- The browser engine, renderers and studio built on top of it.
- [three.js](https://threejs.org/), [React](https://react.dev/), [Vite](https://vite.dev/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [lucide](https://lucide.dev/).
