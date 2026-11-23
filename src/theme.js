/**
 * Theme system — one world: cream paper, ink, and the bouquet's blue.
 * paper:    Paper    (warm off-white page, petrol blue accent)
 * midnight: Midnight (deep ink page, phosphor blue)
 * tide:     Tide     (cool pale page, sea blue)
 *
 * Chrome stays quiet: neutrals carry the surfaces, the accent appears only on
 * the primary action, the selected state and the one figure that matters.
 *
 * These ids are part of the share-link format — renaming one invalidates old
 * links, which then fall back to the default theme.
 */
export const THEMES = {
  paper: {
    id: "paper",
    name: "Paper",
    hint: "Cream, ink",
    dark: false,
    pageBg: "#f7f4ee",
    accent: "#0f4c81",
    page: "bg-[#f7f4ee] text-[#1f1b16]",
    heading: "text-[#1f1b16]",
    body: "text-[#574e44]",
    muted: "text-[#7b7266]",
    hairline: "border-[#1f1b16]/10",
    surface: "bg-[#fdfbf7] border border-[#1f1b16]/10",
    panel: "bg-[#fdfbf7] border-[#1f1b16]/10",
    raised: "bg-[#efe9df]",
    raisedHover: "hover:bg-[#efe9df]",
    accentText: "text-[#0f4c81]",
    accentBg: "bg-[#0f4c81] text-[#fdfbf7]",
    accentHover: "hover:bg-[#0d436f]",
    btnPrimary: "bg-[#0f4c81] text-[#fdfbf7] hover:bg-[#0d436f]",
    btnSecondary:
      "border border-[#1f1b16]/15 text-[#1f1b16] hover:bg-[#efe9df]",
    btnQuiet: "text-[#574e44] hover:text-[#1f1b16]",
    field:
      "bg-[#fdfbf7] border border-[#1f1b16]/15 text-[#1f1b16] placeholder:text-[#7b7266]",
    selected: "border-[#0f4c81] bg-[#0f4c81]/[0.05]",
    fab: "bg-[#fdfbf7] text-[#1f1b16] border border-[#1f1b16]/15",
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    hint: "Navy, starlight",
    dark: true,
    pageBg: "#002366",
    accent: "#9cc8f0",
    page: "bg-[#002366] text-[#eef0f5]",
    heading: "text-[#f2f5fb]",
    body: "text-[#c3ccdf]",
    muted: "text-[#a3aec7]",
    hairline: "border-[#f2f5fb]/15",
    surface: "bg-[#002a70] border border-[#f2f5fb]/12",
    panel: "bg-[#00265f] border-[#f2f5fb]/12",
    raised: "bg-[#003a8f]",
    raisedHover: "hover:bg-[#003a8f]",
    accentText: "text-[#9cc8f0]",
    accentBg: "bg-[#9cc8f0] text-[#002366]",
    accentHover: "hover:bg-[#b0d5f5]",
    btnPrimary: "bg-[#f2f5fb] text-[#002366] hover:bg-[#ffffff]",
    btnSecondary:
      "border border-[#f2f5fb]/20 text-[#f2f5fb] hover:bg-[#003a8f]",
    btnQuiet: "text-[#c3ccdf] hover:text-[#f2f5fb]",
    field:
      "bg-[#002a70] border border-[#f2f5fb]/15 text-[#f2f5fb] placeholder:text-[#a3aec7]",
    selected: "border-[#9cc8f0] bg-[#9cc8f0]/10",
    fab: "bg-[#002a70] text-[#f2f5fb] border border-[#f2f5fb]/15",
  },
  tide: {
    id: "tide",
    name: "Tide",
    hint: "Pale blue",
    dark: false,
    pageBg: "#f5f7fa",
    accent: "#0369a1",
    page: "bg-[#f5f7fa] text-[#111827]",
    heading: "text-[#111827]",
    body: "text-[#4b5565]",
    muted: "text-[#6b7487]",
    hairline: "border-[#111827]/10",
    surface: "bg-white border border-[#111827]/10",
    panel: "bg-white border-[#111827]/10",
    raised: "bg-[#eceff4]",
    raisedHover: "hover:bg-[#eceff4]",
    accentText: "text-[#0369a1]",
    accentBg: "bg-[#0369a1] text-white",
    accentHover: "hover:bg-[#075985]",
    btnPrimary: "bg-[#0369a1] text-white hover:bg-[#075985]",
    btnSecondary: "border border-[#111827]/15 text-[#111827] hover:bg-[#eceff4]",
    btnQuiet: "text-[#4b5565] hover:text-[#111827]",
    field:
      "bg-white border border-[#111827]/15 text-[#111827] placeholder:text-[#6b7487]",
    selected: "border-[#0369a1] bg-[#0369a1]/[0.05]",
    fab: "bg-white text-[#111827] border border-[#111827]/15",
  },
};

export const THEME_ORDER = ["paper", "midnight", "tide"];

export function getTheme(id) {
  return THEMES[id] || THEMES.paper;
}
