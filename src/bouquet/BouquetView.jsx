import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Code2, Loader2, RotateCcw } from "lucide-react";
import { buildScene, computeAsciiFrame, updateHearts } from "./engine";
import { isSafeColor } from "./defaults";
import SourceModal from "./SourceModal";

// three.js is heavy — only download it when the WebGL renderer is chosen
const WebGLBouquet = lazy(() => import("./WebGLBouquet"));

function escapeHtml(ch) {
  if (ch === "&") return "&amp;";
  if (ch === "<") return "&lt;";
  if (ch === ">") return "&gt;";
  return ch;
}

/**
 * Paint one computed ASCII frame onto a 2D context.
 * Used for the PNG export, at 3x so the saved photo is sharp.
 */
function paintFrame(ctx, frame, meta, bg) {
  const { cols, rows, fontSize, charW, charH, width, height } = meta;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
  ctx.textBaseline = "top";

  const gridW = cols * charW;
  const gridH = rows * charH;
  const offsetX = Math.max(4, (width - gridW) / 2);
  const offsetY = Math.max(4, (height - gridH) / 2);

  // Batch consecutive same-colour characters into one fillText call per run.
  for (let r = 0; r < rows; r++) {
    const yPos = offsetY + r * charH;
    const rowOffset = r * cols;
    let runStart = -1;
    let runColor = "";

    const flush = (endCol) => {
      if (runStart < 0) return;
      ctx.fillStyle = runColor;
      ctx.fillText(
        frame.chars.slice(rowOffset + runStart, rowOffset + endCol).join(""),
        offsetX + runStart * charW,
        yPos
      );
      runStart = -1;
    };

    for (let c = 0; c < cols; c++) {
      const ch = frame.chars[rowOffset + c];
      if (ch === " ") continue;
      const color = frame.colors[rowOffset + c];
      const colHex = isSafeColor(color) ? color : "#ffffff";
      if (runStart < 0) {
        runStart = c;
        runColor = colHex;
      } else if (colHex !== runColor) {
        flush(c);
        runStart = c;
        runColor = colHex;
      }
    }
    flush(cols);
  }
}

export default function BouquetView({ settings, onChangeSetting }) {
  const containerRef = useRef(null);
  const preRef = useRef(null);
  const webglCanvasRef = useRef(null);
  const lastFrameRef = useRef(null);
  const lastDomPaintRef = useRef(0);

  const [quitHeartActive, setQuitHeartActive] = useState(false);
  const [hasCameraMoved, setHasCameraMoved] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [shotSaved, setShotSaved] = useState(false);

  // Live refs so the animation loop never restarts when a slider moves
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const sceneRef = useRef(null);
  const pausedRef = useRef(quitHeartActive);
  pausedRef.current = quitHeartActive;

  // Camera manual drag/zoom state kept in ref for 120fps responsiveness
  const cameraOffsetRef = useRef({ azimuth: 0, elevation: 0, zoom: 0 });
  const pointerStateRef = useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
    pinchDist: null,
  });

  // Memoize 3D scene points whenever structural/colour parameters change
  const scene = useMemo(() => buildScene(settings), [
    settings.seed,
    settings.flowerHeads,
    settings.leafCount,
    settings.babiesCount,
    settings.sparklesCount,
    settings.tulipCount,
    settings.petalMultiplier,
    settings.flowerSizeMin,
    settings.flowerSizeMax,
    settings.palettes,
  ]);

  // Background color of bouquet frame based on theme
  const frameBg =
    settings.theme === "tide"
      ? "#0f1e36"
      : settings.theme === "midnight"
      ? "#050914"
      : "#071022";
  const frameBgRef = useRef(frameBg);
  frameBgRef.current = frameBg;
  sceneRef.current = scene;

  const resetCamera = () => {
    cameraOffsetRef.current = { azimuth: 0, elevation: 0, zoom: 0 };
    setHasCameraMoved(false);
  };

  // Pointer & touch handlers for rotating, tilting, and pinching to zoom
  const handlePointerDown = (e) => {
    if (quitHeartActive) return;
    pointerStateRef.current.dragging = true;
    pointerStateRef.current.lastX = e.clientX;
    pointerStateRef.current.lastY = e.clientY;
  };

  const handlePointerMove = (e) => {
    if (!pointerStateRef.current.dragging || quitHeartActive) return;
    const dx = e.clientX - pointerStateRef.current.lastX;
    const dy = e.clientY - pointerStateRef.current.lastY;
    pointerStateRef.current.lastX = e.clientX;
    pointerStateRef.current.lastY = e.clientY;

    cameraOffsetRef.current.azimuth += dx * 0.01;
    cameraOffsetRef.current.elevation = Math.max(
      -1.1,
      Math.min(1.1, cameraOffsetRef.current.elevation + dy * 0.008)
    );
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      setHasCameraMoved(true);
    }
  };

  const handlePointerUp = () => {
    pointerStateRef.current.dragging = false;
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pointerStateRef.current.pinchDist = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pointerStateRef.current.pinchDist !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = pointerStateRef.current.pinchDist - dist;
      pointerStateRef.current.pinchDist = dist;
      cameraOffsetRef.current.zoom = Math.max(
        -2.0,
        Math.min(3.5, cameraOffsetRef.current.zoom + delta * 0.012)
      );
      setHasCameraMoved(true);
    }
  };

  const handleTouchEnd = () => {
    pointerStateRef.current.pinchDist = null;
  };

  const handleWheel = (e) => {
    // Zoom the bouquet when the visitor uses a trackpad pinch (ctrlKey) or shift-wheel,
    // without stealing normal page scrolling.
    if (!(e.ctrlKey || e.metaKey || e.shiftKey)) return;
    e.preventDefault();
    cameraOffsetRef.current.zoom = Math.max(
      -2.0,
      Math.min(3.5, cameraOffsetRef.current.zoom + e.deltaY * 0.003)
    );
    setHasCameraMoved(true);
  };

  // React registers wheel listeners as passive, so bind this one natively.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Animation loop for Canvas 2D & Monospace DOM Text renderers.
  // Runs once; reads live settings/camera from refs so edits never restart the spin.
  useEffect(() => {
    const hearts = [];
    let animId;
    const startTime = performance.now();
    let lastTime = startTime;
    let lastRenderTime = 0;

    const loop = (now) => {
      animId = requestAnimationFrame(loop);
      if (pausedRef.current) return;

      const settings = settingsRef.current;
      if (!settings || settings.renderer === "webgl") return;

      const targetFps = Math.max(15, Math.min(120, settings.fps ?? 120));
      const minInterval = 1000 / targetFps;
      if (now - lastRenderTime < minInterval * 0.85) return;
      lastRenderTime = now;

      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const t = (now - startTime) / 1000;

      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth || 360;
      const height = container.clientHeight || 460;

      // Choose crisp character grid sizing responsive to mobile (390px) & desktop
      const fontSize = width < 440 ? 9.5 : width < 640 ? 11 : 12;
      const charW = fontSize * 0.6;
      const charH = fontSize * 1.16;
      const cols = Math.max(44, Math.min(130, Math.floor((width - 16) / charW)));
      const rows = Math.max(26, Math.min(64, Math.floor((height - 16) / charH)));

      updateHearts(hearts, dt, settings);
      const frame = computeAsciiFrame(
        sceneRef.current,
        t,
        cols,
        rows,
        hearts,
        settings,
        cameraOffsetRef.current
      );

      // Keep the latest frame so the PNG export reproduces exactly what is shown
      lastFrameRef.current = {
        chars: frame.chars,
        colors: frame.colors,
        cols,
        rows,
        fontSize,
        charW,
        charH,
        width,
        height,
      };

      // 2D is text: the browser draws every glyph at its own resolution, which
      // stays crisp where the old canvas copy looked soft. innerHTML is the
      // costly part, so it is capped at ~50fps while the maths runs at full rate.
      if (preRef.current && now - lastDomPaintRef.current >= 20) {
        lastDomPaintRef.current = now;

        const pre = preRef.current;
        pre.style.fontSize = `${fontSize}px`;
        pre.style.lineHeight = `${charH}px`;

        const lines = [];
        for (let r = 0; r < rows; r++) {
          const rowOffset = r * cols;
          let lastCol = "";
          let lineHtml = "";
          for (let c = 0; c < cols; c++) {
            const ch = frame.chars[rowOffset + c];
            const colHex = isSafeColor(frame.colors[rowOffset + c])
              ? frame.colors[rowOffset + c]
              : "#ffffff";
            if (ch !== " " && colHex !== lastCol) {
              if (lastCol !== "") lineHtml += "</span>";
              lastCol = colHex;
              lineHtml += `<span style="color:${colHex}">`;
            }
            lineHtml += escapeHtml(ch);
          }
          if (lastCol !== "") lineHtml += "</span>";
          lines.push(lineHtml);
        }
        pre.innerHTML = lines.join("\n");
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 2D now renders as text; any other non-3D value falls into the same mode
  const is3D = settings.renderer === "webgl";
  const activeRenderer = is3D ? "webgl" : "canvas";

  const savePhoto = () => {
    let url;

    if (is3D) {
      const source = webglCanvasRef.current;
      if (!source) return;

      const width = source.width || source.clientWidth;
      const height = source.height || source.clientHeight;
      if (!width || !height) return;

      // Composite over the screen colour so the PNG is opaque
      const out = document.createElement("canvas");
      out.width = width;
      out.height = height;
      const ctx = out.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = frameBgRef.current;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(source, 0, 0, width, height);
      try {
        url = out.toDataURL("image/png");
      } catch {
        return;
      }
    } else {
      const snap = lastFrameRef.current;
      if (!snap) return;

      // Redraw the same frame at 3x for a sharp, printable photo
      const scale = 3;
      const out = document.createElement("canvas");
      out.width = Math.round(snap.width * scale);
      out.height = Math.round(snap.height * scale);
      const ctx = out.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      paintFrame(ctx, { chars: snap.chars, colors: snap.colors }, snap, frameBgRef.current);
      try {
        url = out.toDataURL("image/png");
      } catch {
        return;
      }
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = "ascii-bouquet.png";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setShotSaved(true);
    window.setTimeout(() => setShotSaved(false), 1800);
  };

  const pointerHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onPointerLeave: handlePointerUp,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return (
    <div id="bouquet-view" className="relative w-full">
      <div
        className="relative overflow-hidden rounded-xl border border-white/10 shadow-[0_20px_50px_-28px_rgba(8,19,31,0.55)]"
        style={{ backgroundColor: frameBg }}
      >
        {/* Top bar: the script it came from, the quit-heart easter egg, the renderer */}
        <div className="flex h-11 items-center justify-between gap-3 border-b border-white/10 px-3 sm:px-4">
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setQuitHeartActive((v) => !v)}
              title="Trigger the Ctrl+C quit heart (ANSI 39)"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-white/5"
            >
              <span
                className="inline-block text-[13px] leading-none"
                style={{ color: settings.quitHeartColor || "#00afff" }}
              >
                ♥
              </span>
              <span className="hidden font-mono text-[11px] text-white/40 sm:inline">
                bouquet3d.py
              </span>
            </button>
          </div>

          {/* Renderer, source and snapshot */}
          <div className="flex shrink-0 items-center gap-1">
            <div className="flex items-center gap-1" role="group" aria-label="Renderer">
              {[
                { id: "canvas", label: "2D", title: "Canvas 2D renderer" },
                { id: "webgl", label: "3D", title: "WebGL / three.js renderer" },
              ].map((item) => {
                const active = activeRenderer === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeSetting("renderer", item.id)}
                    title={item.title}
                    aria-pressed={active}
                    className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors duration-150 ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <span aria-hidden className="mx-1 h-4 w-px bg-white/10" />

            <button
              type="button"
              onClick={() => setSourceOpen(true)}
              title="View the bouquet3d.py source"
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 font-mono text-[11px] text-white/40 transition-colors duration-150 hover:bg-white/5 hover:text-white/70"
            >
              <Code2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              Source
            </button>

            <button
              type="button"
              onClick={savePhoto}
              title={shotSaved ? "Saved" : "Save a PNG of the bouquet"}
              aria-label="Save a PNG of the bouquet"
              className="rounded-md p-1.5 text-white/40 transition-colors duration-150 hover:bg-white/5 hover:text-white"
            >
              {shotSaved ? (
                <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
              ) : (
                <Camera className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* Main Viewport */}
        <div
          ref={containerRef}
          className="relative flex h-[360px] w-full cursor-grab items-center justify-center overflow-hidden touch-none active:cursor-grabbing sm:h-[510px]"
        >
          {quitHeartActive ? (
            <div
              onClick={() => setQuitHeartActive(false)}
              className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none"
            >
              <div
                className="mb-5 text-6xl sm:text-7xl"
                style={{ color: settings.quitHeartColor || "#00afff" }}
              >
                ♥
              </div>
              <p className="mb-1 font-mono text-[11px] text-white/45">
                ^C — KeyboardInterrupt (ANSI 39)
              </p>
              <p className="text-xs text-white/30">Tap anywhere to resume</p>
            </div>
          ) : settings.renderer === "webgl" ? (
            <Suspense
              fallback={
                <div className="flex flex-col items-center gap-3 text-white/40">
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                  <span className="font-mono text-[11px]">Loading three.js</span>
                </div>
              }
            >
              <WebGLBouquet
                settings={settings}
                cameraOffset={cameraOffsetRef}
                onPointerHandlers={pointerHandlers}
                bgColor={frameBg}
                webglCanvasRef={webglCanvasRef}
              />
            </Suspense>
          ) : (
            <div
              className="flex h-full w-full select-none items-center justify-center overflow-hidden"
              {...pointerHandlers}
            >
              <pre
                ref={preRef}
                aria-label="ASCII bouquet"
                className="m-0 select-none whitespace-pre text-center font-mono font-medium"
              />
            </div>
          )}

          {/* Quiet interaction hint */}
          {!quitHeartActive && (
            <>
              <div className="pointer-events-none absolute bottom-2 right-3 font-mono text-[10px] text-white/25">
                drag · pinch
              </div>
              {hasCameraMoved && (
                <button
                  type="button"
                  onClick={resetCamera}
                  className="absolute left-3 top-2 inline-flex h-7 items-center gap-1.5 rounded-md border border-white/15 px-2 font-mono text-[10px] text-white/60 transition-colors duration-150 hover:bg-white/5 hover:text-white"
                  title="Reset camera angle"
                >
                  <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
                  Reset view
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {sourceOpen && (
        <SourceModal settings={settings} onClose={() => setSourceOpen(false)} />
      )}
    </div>
  );
}
