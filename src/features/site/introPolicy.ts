/**
 * When the home-page brand intro may play, and which file to use.
 * Pure, so it is unit-tested (tests/introPolicy.test.mjs).
 */
export type IntroConditions = {
  ready: boolean;
  path: string;
  alreadyPlayed: boolean;
  signedIn: boolean;
  reducedMotion: boolean;
  saveData: boolean;
};

export function shouldPlayIntro(c: IntroConditions): boolean {
  return c.ready && c.path === "/" && !c.alreadyPlayed && !c.signedIn && !c.reducedMotion && !c.saveData;
}

/** Safari and every iOS browser use WebKit, which does not render VP9 alpha. */
export function isWebKitWithoutAlpha(userAgent: string): boolean {
  const ios = /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && /Mobile\//.test(userAgent));
  const safari = /Safari\//.test(userAgent) && !/(Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS|Android)\//.test(userAgent);
  return ios || safari;
}

export type IntroSource = { src: string; type: string; overlay: "cream" | "white" };

/**
 * WebM with alpha on a cream overlay where VP9 plays and the browser is not WebKit;
 * otherwise the MP4 (white background) on a white overlay, so its edges do not show.
 * Both checks are needed: some WebKit builds report VP9 support but drop the alpha.
 */
export function pickIntroSource(files: { webm: string; mp4: string }, canPlayVp9: boolean, userAgent: string): IntroSource {
  if (canPlayVp9 && !isWebKitWithoutAlpha(userAgent)) return { src: files.webm, type: 'video/webm; codecs="vp9"', overlay: "cream" };
  return { src: files.mp4, type: "video/mp4", overlay: "white" };
}

/** Timings from the brief, in ms. */
export const INTRO_TIMING = { startWithin: 800, fadeAt: 3400, fade: 400 } as const;

/** Supabase keeps the session in localStorage as sb-<project>-auth-token. */
export function hasStoredSession(keys: string[]): boolean {
  return keys.some((key) => /^sb-.+-auth-token$/.test(key));
}

/** Fired on window when the intro ends (or never starts), so the header logo and hero motif can follow. */
export const INTRO_END_EVENT = "dataplus:intro-end";
