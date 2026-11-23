import React from "react";
import { motion } from "framer-motion";
import { Check, Pencil, Share2 } from "lucide-react";
import BouquetView from "../bouquet/BouquetView";
import { SITE_CONFIG } from "../content";

const EASE = [0.22, 1, 0.36, 1];

export default function Hero({
  theme,
  settings,
  onChangeSetting,
  copied,
  onOpenEditor,
  onCopyShareLink,
}) {
  return (
    <section className={`mx-auto max-w-[1200px] px-6 sm:px-8`}>
      <div className="grid min-h-[calc(100vh-57px)] items-center gap-12 py-14 lg:grid-cols-12 lg:gap-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="lg:col-span-5"
        >
          <h1
            className={`font-serif text-[44px] font-normal leading-[1.02] tracking-[-0.02em] sm:text-[56px] lg:text-[64px] ${theme.heading}`}
          >
            {SITE_CONFIG.name}
          </h1>

          <p
            className={`mt-5 max-w-[34rem] text-[17px] leading-[1.65] ${theme.body}`}
          >
            {SITE_CONFIG.intro}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenEditor}
              className={`inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors duration-150 ${theme.btnPrimary}`}
            >
              <Pencil className="h-4 w-4" strokeWidth={1.5} />
              Open the studio
            </button>
            <button
              type="button"
              onClick={onCopyShareLink}
              className={`inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors duration-150 ${theme.btnSecondary}`}
            >
              {copied ? (
                <Check className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Share2 className="h-4 w-4" strokeWidth={1.5} />
              )}
              {copied ? "Link copied" : "Copy share link"}
            </button>
          </div>

          <p className={`mt-5 font-mono text-[11px] ${theme.muted}`}>
            Drag to turn · pinch to zoom · your changes live in the link
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: EASE }}
          className="lg:col-span-7"
        >
          <BouquetView settings={settings} onChangeSetting={onChangeSetting} />
        </motion.div>
      </div>
    </section>
  );
}
