/**
 * ============================================================================
 * CONTENT.JS — Site branding
 * ============================================================================
 * Everything a fork is likely to want to change about the *site* lives here:
 * its name, tagline, hero copy, footer credit and repository link.
 *
 * The bouquet's own look (colours, message, motion, structure) is deliberately
 * NOT here. That is a live setting the visitor edits in the studio and can
 * share with a link — see src/bouquet/defaults.js for the production defaults.
 */

export const SITE_CONFIG = {
  /** Used in the header, hero heading and document title. */
  name: "ASCII Bouquet",

  /** One-line description — feeds the document title and meta description. */
  tagline: "A spinning ASCII bouquet, rendered live in your browser.",

  /** The paragraph beside the bouquet. */
  intro:
    "Every petal, colour and star is editable. Change what you like, then copy a link that keeps it exactly that way.",

  /** Quiet footer credit. Set to an empty string to hide it. */
  credit: "Open source under the MIT license",
};
