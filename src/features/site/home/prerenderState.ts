/**
 * Whether this page load started from the build-time render of the home page
 * (scripts/prerender-home.mjs). In that case the hero photo has already played its
 * plus-mask reveal in plain CSS at first paint, so React shows it revealed instead of
 * playing it again (which would flicker and repaint the largest image late).
 */
let prerendered = false;

export function detectPrerender(root: HTMLElement | null) {
  prerendered = Boolean(root?.querySelector("[data-prerender]:not([hidden])"));
}

export const wasPrerendered = () => prerendered;
