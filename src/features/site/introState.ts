import { useEffect, useState } from "react";
import { INTRO_END_EVENT } from "./introPolicy";

/**
 * Whether the brand intro is still covering the page. BrandIntro marks it as playing while it
 * decides to show (it renders before the header and hero), and clears it when it leaves, so the
 * header logo and the hero motif can run their entrance after it. Everywhere else it is false.
 */
let playing = false;

export function markIntroPlaying() {
  playing = true;
}

export function markIntroEnded() {
  playing = false;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(INTRO_END_EVENT));
}

/** True once the intro has ended or when it never played. */
export function useIntroEnded(): boolean {
  const [ended, setEnded] = useState(() => !playing);
  useEffect(() => {
    if (!playing) { setEnded(true); return; }
    const done = () => setEnded(true);
    window.addEventListener(INTRO_END_EVENT, done);
    return () => window.removeEventListener(INTRO_END_EVENT, done);
  }, []);
  return ended;
}
