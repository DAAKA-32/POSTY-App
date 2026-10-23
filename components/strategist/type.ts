/**
 * Strategist type scale — seven roles, used everywhere in the workspace so
 * the journey, the conversation and the settings read as one product.
 * Sizes that follow the screen height (display, lede) come from the density
 * tokens in globals.css (`--st-*`); the rest is fixed.
 *
 *   display  step / view title          28→36px desktop, 25px mobile, 600, -0.025em
 *   lede     why it matters             16px / 1.5 (15px mobile)
 *   kicker   micro-caps above a title   11.5px, 600, +0.14em, coral ink
 *   label    field / group label        14px, 500
 *   option   title of a choice          15px, 600
 *   help     hint under a field         13px / 1.45, tertiary ink
 *   meta     counters, small print      12px, tertiary ink, tabular
 */

export const type = {
  display: "st-display",
  lede: "st-lede",
  kicker: "st-kicker",
  label: "text-[14px] leading-5 font-medium text-st-ink",
  option: "text-[15px] leading-5 font-semibold tracking-[-0.01em] text-st-ink",
  help: "text-[13px] leading-[1.45] text-st-ink-3",
  meta: "text-[12px] leading-4 tabular-nums text-st-ink-3",
} as const;

/** The Strategist's reading measure: journey sheet, conversation, composer. */
export const MEASURE = "mx-auto w-full max-w-[720px]";
