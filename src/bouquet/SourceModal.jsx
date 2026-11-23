import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { buildSource } from "./source";

export default function SourceModal({ settings, onClose }) {
  const [copied, setCopied] = useState(false);
  const source = useMemo(() => buildSource(settings), [settings]);
  const lines = useMemo(() => source.split("\n"), [source]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const copySource = async () => {
    try {
      await navigator.clipboard.writeText(source);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = source;
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
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="bouquet3d.py source"
    >
      <div className="absolute inset-0 bg-[#0b0d12]/75" onClick={onClose} />

      <div className="relative z-10 flex max-h-[86vh] w-full max-w-[880px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#08131f] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="font-mono text-[12px] text-[#eef0f5]">bouquet3d.py</span>
            <span className="truncate font-mono text-[11px] text-white/35">
              Python · {lines.length} lines · live studio copy
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={copySource}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[11px] text-white/55 transition-colors duration-150 hover:bg-white/5 hover:text-white"
              aria-label="Copy source code"
              title="Copy the source"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
              ) : (
                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-white/45 transition-colors duration-150 hover:bg-white/5 hover:text-white"
              aria-label="Close source"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto thin-scroll">
          <pre className="w-max min-w-full px-4 py-4 font-mono text-[12px] leading-[20px] text-[#c3ccdf]">
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-10 shrink-0 select-none pr-4 text-right text-white/20">
                  {i + 1}
                </span>
                <code className="whitespace-pre">{line || " "}</code>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
