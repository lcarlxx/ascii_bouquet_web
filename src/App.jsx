import React, { useCallback, useEffect, useState } from "react";
import { ArrowUp, Moon, Pencil, Sun } from "lucide-react";
import Hero from "./components/Hero";
import EditorDrawer from "./bouquet/EditorDrawer";
import {
  DEFAULT_SETTINGS,
  SHARE_DEFAULTS_TOKEN,
  clampNumber,
  cloneDefaults,
  decodeSettingsFromParam,
  encodeSettingsToParam,
  sanitizeColor,
} from "./bouquet/defaults";
import { getTheme } from "./theme";
import { SITE_CONFIG } from "./content";

const PARAM_KEY = "b";
const MESSAGE_MAX = 100;

/**
 * The bouquet is always the entry point: there is no gate, no password and no
 * second mode. A shared link (?b=…) simply seeds the settings before the first
 * render — anything malformed falls back to the defaults inside the decoder.
 */
function readInitialSettings() {
  if (typeof window === "undefined") return cloneDefaults();
  const encoded = new URLSearchParams(window.location.search).get(PARAM_KEY);
  return decodeSettingsFromParam(encoded);
}

export default function App() {
  const [settings, setSettings] = useState(readInitialSettings);
  const [editorOpen, setEditorOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const theme = getTheme(settings.theme);
  const isDark = !!theme.dark;

  // An edited message is plain text; clamp it here as well as in the editor so
  // no caller can grow the banner past what the ASCII grid expects.
  const changeSetting = useCallback((key, value) => {
    setSettings((prev) => {
      let next = { ...prev, [key]: clampNumber(key, value) };

      if (key === "message") {
        next.message = String(next.message ?? "").slice(0, MESSAGE_MAX);
      }
      if (key === "quitHeartColor") {
        next.quitHeartColor = sanitizeColor(next.quitHeartColor, prev.quitHeartColor);
      }

      // Keep the interdependent pairs ordered whatever order they arrived in.
      if (next.tulipCount > next.flowerHeads) next.tulipCount = next.flowerHeads;
      const lo = Math.min(next.flowerSizeMin, next.flowerSizeMax);
      const hi = Math.max(next.flowerSizeMin, next.flowerSizeMax);
      next.flowerSizeMin = lo;
      next.flowerSizeMax = hi;

      return next;
    });
  }, []);

  const toggleDarkMode = () =>
    changeSetting("theme", isDark ? "paper" : "midnight");

  // The accent, the paper and the hairline feed native controls (sliders, focus
  // rings, selection) that Tailwind classes can't reach.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--paper", theme.pageBg);
    root.style.backgroundColor = theme.pageBg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme.pageBg);
  }, [theme]);

  // Branding lives in content.js; keep the document in step with it so a fork
  // only has to edit one file.
  useEffect(() => {
    document.title = `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", SITE_CONFIG.tagline);
  }, []);

  // Keep the address bar in sync with the visitor's current bouquet (local only)
  useEffect(() => {
    const url = new URL(window.location.href);
    // Stay shareable/reload-safe even when everything is at its default
    const encoded = encodeSettingsToParam(settings) || SHARE_DEFAULTS_TOKEN;
    url.searchParams.set(PARAM_KEY, encoded);
    window.history.replaceState(null, "", url.toString());
  }, [settings]);

  const changePaletteColor = useCallback((paletteKey, index, hex) => {
    setSettings((prev) => {
      const existing = prev.palettes[paletteKey] || [];
      const arr = [...existing];
      arr[index] = sanitizeColor(hex, existing[index] || "#ffffff");
      return { ...prev, palettes: { ...prev.palettes, [paletteKey]: arr } };
    });
  }, []);

  const applyPalettePreset = useCallback((paletteKey, presetColors) => {
    if (!Array.isArray(presetColors)) return;
    setSettings((prev) => ({
      ...prev,
      palettes: { ...prev.palettes, [paletteKey]: [...presetColors] },
    }));
  }, []);

  const resetSetting = useCallback((key) => {
    setSettings((prev) => ({ ...prev, [key]: DEFAULT_SETTINGS[key] }));
  }, []);

  const resetPalette = useCallback((paletteKey) => {
    setSettings((prev) => ({
      ...prev,
      palettes: {
        ...prev.palettes,
        [paletteKey]: [...DEFAULT_SETTINGS.palettes[paletteKey]],
      },
    }));
  }, []);

  const resetAll = useCallback(() => setSettings(cloneDefaults()), []);

  const copyShareLink = useCallback(async () => {
    const encoded = encodeSettingsToParam(settings) || SHARE_DEFAULTS_TOKEN;
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM_KEY, encoded);
    const link = url.toString();
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* noop */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [settings]);

  // Editor opens over the bouquet; on long pages bring the hero back into view
  const openEditor = () => {
    setEditorOpen(true);
    // On phones the sheet covers the lower half, so bring the bouquet above it
    if (window.innerWidth < 640) {
      document
        .getElementById("bouquet-view")
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    } else if (window.scrollY > 200) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className={`min-h-screen w-full font-sans ${theme.page}`}>
      <header
        className={`mx-auto flex max-w-[1200px] items-center justify-between border-b px-6 py-4 sm:px-8 ${theme.hairline}`}
      >
        <span className={`font-serif text-[17px] font-medium ${theme.heading}`}>
          {SITE_CONFIG.name}
        </span>
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Light mode" : "Dark mode"}
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] transition-colors duration-150 ${theme.muted} ${theme.btnQuiet}`}
        >
          {isDark ? (
            <Sun className="h-3.5 w-3.5" strokeWidth={1.5} />
          ) : (
            <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
          <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
        </button>
      </header>

      <main>
        <Hero
          theme={theme}
          settings={settings}
          onChangeSetting={changeSetting}
          copied={copied}
          onOpenEditor={openEditor}
          onCopyShareLink={copyShareLink}
        />

        <footer className={`border-t px-6 pb-20 pt-8 sm:px-8 ${theme.hairline}`}>
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={`font-serif text-sm ${theme.muted}`}>
              {SITE_CONFIG.credit}
            </p>
            <div className="flex items-center gap-5">
              <p className={`font-mono text-[11px] ${theme.muted}`}>
                ASCII bouquet, spinning forever
              </p>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className={`inline-flex items-center gap-1.5 font-mono text-[11px] transition-colors duration-150 ${theme.muted} ${theme.btnQuiet}`}
              >
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                Top
              </button>
            </div>
          </div>
        </footer>
      </main>

      {/* Always-visible pencil button (every visitor) */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={openEditor}
          aria-label="Open bouquet editor"
          title="Bouquet studio"
          className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-colors duration-150 ${theme.fab}`}
        >
          <Pencil className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
      </div>

      <EditorDrawer
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        theme={theme}
        settings={settings}
        onChangeSetting={changeSetting}
        onChangePaletteColor={changePaletteColor}
        onApplyPalettePreset={applyPalettePreset}
        onResetSetting={resetSetting}
        onResetPalette={resetPalette}
        onResetAll={resetAll}
        onCopyShareLink={copyShareLink}
      />
    </div>
  );
}
