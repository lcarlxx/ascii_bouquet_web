import React, { useEffect, useState } from "react";
import { X, RotateCcw, Share2, Check, Shuffle } from "lucide-react";
import { DEFAULT_SETTINGS, PALETTE_PRESETS } from "./defaults";

function SettingRow({ label, title, valueLabel, isModified, onReset, children }) {
  return (
    <div
      className="border-b py-3 last:border-b-0"
      style={{ borderColor: "var(--setting-hairline)" }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span
          title={title}
          className="text-[12px] font-medium text-[var(--setting-label)]"
        >
          {label}
        </span>
        <div className="flex items-center gap-2">
          {valueLabel !== undefined && (
            <span className="font-mono text-[11px] tabular-nums text-[var(--setting-meta)]">
              {valueLabel}
            </span>
          )}
          <button
            type="button"
            onClick={onReset}
            disabled={!isModified}
            title="Reset to default"
            className={`rounded p-1 transition-colors duration-150 ${
              isModified
                ? "text-[var(--setting-accent)] hover:bg-[var(--setting-raised)]"
                : "cursor-not-allowed text-[var(--setting-meta)] opacity-30"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

const PALETTE_ROWS = [
  { key: "BLUE", label: "Blue flowers" },
  { key: "WHITE", label: "White flowers" },
  { key: "PINK", label: "Pink flowers" },
  { key: "RED", label: "Red flowers" },
  { key: "PURPLE", label: "Purple flowers" },
  { key: "YELLOW", label: "Yellow flowers" },
  { key: "GOLD_CENTER", label: "Gold centres" },
  { key: "DARK_CENTER", label: "Dark centres" },
  { key: "GREENS", label: "Stems and leaves" },
  { key: "PAPER", label: "Paper wrapper" },
  { key: "RIBBON", label: "Ribbon and bow" },
  { key: "HEART_COLORS", label: "Floating hearts" },
  { key: "MSG_COLORS", label: "Message shimmer" },
];

const PRESETS = [
  { label: "Pure blue message", key: "MSG_COLORS", preset: "PURE_BLUE_MSG" },
  { label: "Deep blue flowers", key: "BLUE", preset: "DEEP_BLUE" },
  { label: "Sky blue flowers", key: "BLUE", preset: "SKY_BLUE" },
  { label: "Icy blue wrapper", key: "PAPER", preset: "ICY_PAPER" },
  { label: "Rose gold ribbon", key: "RIBBON", preset: "ROSE_GOLD_RIBBON" },
];

const TABS = [
  { id: "animation", label: "Motion" },
  { id: "structure", label: "Shape" },
  { id: "flowers", label: "Flowers" },
  { id: "colors", label: "Colour" },
  { id: "message", label: "Text" },
];

export default function EditorDrawer({
  isOpen,
  onClose,
  theme,
  settings,
  onChangeSetting,
  onChangePaletteColor,
  onApplyPalettePreset,
  onResetSetting,
  onResetPalette,
  onResetAll,
  onCopyShareLink,
}) {
  const [activeTab, setActiveTab] = useState("animation");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    onCopyShareLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDiff = (key) => settings[key] !== DEFAULT_SETTINGS[key];
  const isPaletteDiff = (pKey) =>
    JSON.stringify(settings.palettes[pKey]).toLowerCase() !==
    JSON.stringify(DEFAULT_SETTINGS.palettes[pKey]).toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none sm:flex-row sm:justify-end"
      style={{
        "--setting-label": theme.dark ? "#eef0f5" : "#1f1b16",
        "--setting-meta": theme.dark ? "#7a8296" : "#7b7266",
        "--setting-accent": theme.dark ? "#8fbde8" : "#0f4c81",
        "--setting-raised": theme.dark ? "#1a1e28" : "#efe9df",
        "--setting-hairline": theme.dark ? "rgba(238,240,245,0.10)" : "rgba(31,27,22,0.10)",
      }}
    >
      {/* Tap-outside-to-close on mobile; on desktop the bouquet stays interactive */}
      <div
        onClick={onClose}
        className="pointer-events-auto fixed inset-0 bg-[#0b0d12]/30 sm:pointer-events-none sm:bg-transparent"
      />

      {/* Bottom sheet on mobile, right drawer on desktop */}
      <div
        className={`pointer-events-auto relative z-10 flex max-h-[62vh] w-full flex-col rounded-t-xl border-t sm:h-full sm:max-h-full sm:w-[420px] sm:rounded-none sm:border-l sm:border-t-0 ${theme.panel} ${theme.heading}`}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--setting-hairline)" }}
        >
          <div>
            <h2 className={`font-serif text-[18px] font-medium leading-tight ${theme.heading}`}>
              Bouquet studio
            </h2>
            <p className={`mt-1 font-mono text-[11px] ${theme.muted}`}>
              bouquet3d.py, live
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md p-1.5 transition-colors duration-150 ${theme.muted} ${theme.raisedHover}`}
            aria-label="Close editor"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex items-center gap-1 overflow-x-auto border-b px-3 py-2 no-scrollbar"
          style={{ borderColor: "var(--setting-hairline)" }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={active}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12px] transition-colors duration-150 ${
                  active
                    ? `${theme.raised} ${theme.heading}`
                    : `${theme.muted} ${theme.raisedHover}`
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex-1 overflow-y-auto px-5 py-1 thin-scroll">
          {activeTab === "animation" && (
            <>
              <SettingRow
                label="Renderer"
                valueLabel={settings.renderer === "webgl" ? "3D" : "2D"}
                isModified={isDiff("renderer")}
                onReset={() => onResetSetting("renderer")}
              >
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "canvas", name: "2D", hint: "ASCII text" },
                    { id: "webgl", name: "3D", hint: "WebGL" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onChangeSetting("renderer", r.id)}
                      className={`rounded-lg border p-2 text-left transition-colors duration-150 ${
                        (settings.renderer === "webgl" ? "webgl" : "canvas") === r.id
                          ? theme.selected
                          : `${theme.hairline} ${theme.raisedHover}`
                      }`}
                    >
                      <span className={`block text-[12px] font-medium ${theme.heading}`}>
                        {r.name}
                      </span>
                      <span className={`mt-0.5 block font-mono text-[10px] ${theme.muted}`}>
                        {r.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow
                label="Spin speed"
                title="SPIN_SPEED"
                valueLabel={settings.spinSpeed.toFixed(2)}
                isModified={isDiff("spinSpeed")}
                onReset={() => onResetSetting("spinSpeed")}
              >
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.05"
                  value={settings.spinSpeed}
                  onChange={(e) => onChangeSetting("spinSpeed", parseFloat(e.target.value))}
                  className="w-full"
                />
              </SettingRow>

              <SettingRow
                label="Camera tilt"
                title="TILT"
                valueLabel={settings.tilt.toFixed(2)}
                isModified={isDiff("tilt")}
                onReset={() => onResetSetting("tilt")}
              >
                <input
                  type="range"
                  min="-0.8"
                  max="1.1"
                  step="0.05"
                  value={settings.tilt}
                  onChange={(e) => onChangeSetting("tilt", parseFloat(e.target.value))}
                  className="w-full"
                />
              </SettingRow>

              <SettingRow
                label="Camera distance"
                title="CAM_DIST"
                valueLabel={settings.camDist.toFixed(2)}
                isModified={isDiff("camDist")}
                onReset={() => onResetSetting("camDist")}
              >
                <input
                  type="range"
                  min="2.2"
                  max="6.5"
                  step="0.1"
                  value={settings.camDist}
                  onChange={(e) => onChangeSetting("camDist", parseFloat(e.target.value))}
                  className="w-full"
                />
              </SettingRow>

              <SettingRow
                label="Frame rate"
                title="FPS"
                valueLabel={`${settings.fps} fps`}
                isModified={isDiff("fps")}
                onReset={() => onResetSetting("fps")}
              >
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="5"
                  value={settings.fps}
                  onChange={(e) => onChangeSetting("fps", parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </SettingRow>

              <SettingRow
                label="Floating hearts"
                title="NUM_HEARTS"
                valueLabel={settings.heartCount}
                isModified={isDiff("heartCount")}
                onReset={() => onResetSetting("heartCount")}
              >
                <input
                  type="range"
                  min="0"
                  max="140"
                  step="1"
                  value={settings.heartCount}
                  onChange={(e) => onChangeSetting("heartCount", parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </SettingRow>

              <SettingRow
                label="Heart float speed"
                valueLabel={`${settings.heartSpeed.toFixed(1)}×`}
                isModified={isDiff("heartSpeed")}
                onReset={() => onResetSetting("heartSpeed")}
              >
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={settings.heartSpeed}
                  onChange={(e) => onChangeSetting("heartSpeed", parseFloat(e.target.value))}
                  className="w-full"
                />
              </SettingRow>
            </>
          )}

          {activeTab === "structure" && (
            <>
              <SettingRow
                label="Arrangement seed"
                title="random.Random seed"
                valueLabel={`#${settings.seed}`}
                isModified={isDiff("seed")}
                onReset={() => onResetSetting("seed")}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.seed}
                    onChange={(e) =>
                      onChangeSetting("seed", parseInt(e.target.value || "21", 10))
                    }
                    className={`h-9 w-24 rounded-md px-2.5 font-mono text-[12px] outline-none ${theme.field}`}
                  />
                  <button
                    type="button"
                    onClick={() => onChangeSetting("seed", Math.floor(Math.random() * 9999) + 1)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors duration-150 ${theme.btnSecondary}`}
                  >
                    <Shuffle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Shuffle
                  </button>
                </div>
              </SettingRow>

              <SettingRow
                label="Flower heads"
                title="N"
                valueLabel={settings.flowerHeads}
                isModified={isDiff("flowerHeads")}
                onReset={() => onResetSetting("flowerHeads")}
              >
                <input
                  type="range"
                  min="3"
                  max="30"
                  step="1"
                  value={settings.flowerHeads}
                  onChange={(e) => onChangeSetting("flowerHeads", parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </SettingRow>

              <SettingRow
                label="Outer leaves"
                valueLabel={settings.leafCount}
                isModified={isDiff("leafCount")}
                onReset={() => onResetSetting("leafCount")}
              >
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="1"
                  value={settings.leafCount}
                  onChange={(e) => onChangeSetting("leafCount", parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </SettingRow>

              <SettingRow
                label="Baby's breath"
                valueLabel={settings.babiesCount}
                isModified={isDiff("babiesCount")}
                onReset={() => onResetSetting("babiesCount")}
              >
                <input
                  type="range"
                  min="0"
                  max="180"
                  step="5"
                  value={settings.babiesCount}
                  onChange={(e) => onChangeSetting("babiesCount", parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </SettingRow>

              <SettingRow
                label="Sparkles"
                valueLabel={settings.sparklesCount}
                isModified={isDiff("sparklesCount")}
                onReset={() => onResetSetting("sparklesCount")}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="2"
                  value={settings.sparklesCount}
                  onChange={(e) => onChangeSetting("sparklesCount", parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </SettingRow>
            </>
          )}

          {activeTab === "flowers" && (
            <>
              <SettingRow
                label="Tulips"
                valueLabel={`${settings.tulipCount} of ${settings.flowerHeads}`}
                isModified={isDiff("tulipCount")}
                onReset={() => onResetSetting("tulipCount")}
              >
                <input
                  type="range"
                  min="0"
                  max={settings.flowerHeads}
                  step="1"
                  value={Math.min(settings.tulipCount, settings.flowerHeads)}
                  onChange={(e) => onChangeSetting("tulipCount", parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </SettingRow>

              <SettingRow
                label="Petal count"
                valueLabel={`${settings.petalMultiplier.toFixed(2)}×`}
                isModified={isDiff("petalMultiplier")}
                onReset={() => onResetSetting("petalMultiplier")}
              >
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.petalMultiplier}
                  onChange={(e) => onChangeSetting("petalMultiplier", parseFloat(e.target.value))}
                  className="w-full"
                />
              </SettingRow>

              <SettingRow
                label="Smallest flower"
                valueLabel={settings.flowerSizeMin.toFixed(2)}
                isModified={isDiff("flowerSizeMin")}
                onReset={() => onResetSetting("flowerSizeMin")}
              >
                <input
                  type="range"
                  min="0.06"
                  max="0.24"
                  step="0.01"
                  value={settings.flowerSizeMin}
                  onChange={(e) => onChangeSetting("flowerSizeMin", parseFloat(e.target.value))}
                  className="w-full"
                />
              </SettingRow>

              <SettingRow
                label="Largest flower"
                valueLabel={settings.flowerSizeMax.toFixed(2)}
                isModified={isDiff("flowerSizeMax")}
                onReset={() => onResetSetting("flowerSizeMax")}
              >
                <input
                  type="range"
                  min="0.08"
                  max="0.28"
                  step="0.01"
                  value={settings.flowerSizeMax}
                  onChange={(e) => onChangeSetting("flowerSizeMax", parseFloat(e.target.value))}
                  className="w-full"
                />
              </SettingRow>

              <SettingRow
                label="Breathing"
                valueLabel={settings.breathingAmp.toFixed(2)}
                isModified={isDiff("breathingAmp")}
                onReset={() => onResetSetting("breathingAmp")}
              >
                <input
                  type="range"
                  min="0"
                  max="0.20"
                  step="0.01"
                  value={settings.breathingAmp}
                  onChange={(e) => onChangeSetting("breathingAmp", parseFloat(e.target.value))}
                  className="w-full"
                />
              </SettingRow>
            </>
          )}

          {activeTab === "colors" && (
            <>
              <div
                className="border-b py-3"
                style={{ borderColor: "var(--setting-hairline)" }}
              >
                <div className="mb-2 text-[12px] font-medium text-[var(--setting-label)]">
                  Presets
                </div>
                <div className="-mx-2 flex flex-col">
                  {PRESETS.map((preset) => {
                    const colors = PALETTE_PRESETS[preset.preset] || [];
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => onApplyPalettePreset(preset.key, colors)}
                        className={`flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ${theme.raisedHover}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="flex">
                            {colors.slice(0, 6).map((hex, i) => (
                              <span
                                key={`${preset.label}-${i}`}
                                className="h-2.5 w-2.5 rounded-sm border border-black/10"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </span>
                          <span className={`text-[12px] ${theme.body}`}>{preset.label}</span>
                        </span>
                        <span className={`font-mono text-[10px] ${theme.muted}`}>
                          Apply
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {PALETTE_ROWS.map(({ key, label }) => {
                const colors = settings.palettes[key] || [];
                return (
                  <SettingRow
                    key={key}
                    label={label}
                    title={key}
                    valueLabel={`${colors.length}`}
                    isModified={isPaletteDiff(key)}
                    onReset={() => onResetPalette(key)}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {colors.map((hex, idx) => (
                        <label
                          key={idx}
                          className="relative block h-6 w-6 cursor-pointer rounded border border-black/15"
                          title={`${hex}`}
                          style={{ backgroundColor: hex }}
                        >
                          <input
                            type="color"
                            value={hex}
                            onChange={(e) => onChangePaletteColor(key, idx, e.target.value)}
                            className="sr-only"
                            aria-label={`${label} colour ${idx + 1}`}
                          />
                        </label>
                      ))}
                    </div>
                  </SettingRow>
                );
              })}

              <SettingRow
                label="Quit heart"
                title="Quit-heart colour (ANSI 39)"
                valueLabel={settings.quitHeartColor}
                isModified={isDiff("quitHeartColor")}
                onReset={() => onResetSetting("quitHeartColor")}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-8 w-8 shrink-0 rounded border border-black/15"
                    style={{ backgroundColor: settings.quitHeartColor }}
                  >
                    <input
                      type="color"
                      value={settings.quitHeartColor}
                      onChange={(e) => onChangeSetting("quitHeartColor", e.target.value)}
                      className="h-full w-full opacity-0"
                      aria-label="Quit heart colour"
                    />
                  </span>
                  <input
                    type="text"
                    value={settings.quitHeartColor}
                    onChange={(e) => onChangeSetting("quitHeartColor", e.target.value)}
                    className={`h-9 w-28 rounded-md px-2.5 font-mono text-[12px] outline-none ${theme.field}`}
                  />
                </div>
              </SettingRow>
            </>
          )}

          {activeTab === "message" && (
            <SettingRow
              label="Banner message"
              title="MESSAGE"
              valueLabel={`${settings.message.length}/100`}
              isModified={isDiff("message")}
              onReset={() => onResetSetting("message")}
            >
              <input
                type="text"
                maxLength={100}
                value={settings.message}
                onChange={(e) => onChangeSetting("message", e.target.value.slice(0, 100))}
                placeholder="for you ♥"
                className={`h-10 w-full rounded-md px-3 text-[13px] outline-none ${theme.field}`}
              />
              <p className={`mt-2 text-[11px] leading-relaxed ${theme.muted}`}>
                Set in the shimmer palette, under the bouquet.
              </p>
            </SettingRow>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-2 border-t px-5 py-3"
          style={{ borderColor: "var(--setting-hairline)" }}
        >
          <button
            type="button"
            onClick={onResetAll}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors duration-150 ${theme.btnSecondary}`}
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
            Reset all
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-[12px] font-medium transition-colors duration-150 ${theme.btnPrimary}`}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            {copied ? "Link copied" : "Copy share link"}
          </button>
        </div>
      </div>
    </div>
  );
}
