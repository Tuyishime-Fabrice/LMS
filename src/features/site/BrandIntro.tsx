import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { siteFacts } from "@/content/site-facts";
import { useAppAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { INTRO_END_EVENT, INTRO_TIMING, hasStoredSession, pickIntroSource, shouldPlayIntro, type IntroSource } from "./introPolicy";

const PLAYED_KEY = "dataplus-intro-played";
const INTRO_END_KEYS = new Set(["Escape", "PageDown", "PageUp", "ArrowDown", "ArrowUp", " ", "Home", "End"]);

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function localKeys(): string[] {
  try {
    return Object.keys(window.localStorage);
  } catch {
    return [];
  }
}

function conditionsAllow(path: string): boolean {
  if (typeof window === "undefined") return false;
  let alreadyPlayed = false;
  try {
    alreadyPlayed = storage()?.getItem(PLAYED_KEY) === "1";
  } catch {
    alreadyPlayed = false;
  }
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return shouldPlayIntro({
    ready: siteFacts.brand.intro.ready,
    path,
    alreadyPlayed,
    signedIn: hasStoredSession(localKeys()),
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    saveData: connection?.saveData === true,
  });
}

/**
 * Home-page brand intro (docs/product/DESIGN_SYSTEM.md, "Intro"). A fixed overlay above the
 * fully rendered page: plays once per browser session for signed-out visitors, ends at 3.4 s
 * or on any click, tap, key, scroll or "Skip intro", and is never shown under reduced motion,
 * Save-Data, or when the video has not started within 800 ms. `force` is for the brand page.
 */
export function BrandIntro({ force = false, onEnd }: { force?: boolean; onEnd?: () => void }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user } = useAppAuth();
  const [source] = useState<IntroSource | null>(() => {
    if (!force && !conditionsAllow(pathname)) return null;
    const probe = document.createElement("video");
    return pickIntroSource(siteFacts.brand.intro, probe.canPlayType('video/webm; codecs="vp9"') !== "", navigator.userAgent);
  });
  const [phase, setPhase] = useState<"playing" | "leaving" | "gone">(source ? "playing" : "gone");
  const started = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const finish = useCallback((immediately = false) => {
    setPhase((current) => (current === "gone" ? current : immediately ? "gone" : "leaving"));
  }, []);

  // Remember the visit, and announce the end so the page can run its own entrances.
  useEffect(() => {
    if (!source || force) return;
    try {
      storage()?.setItem(PLAYED_KEY, "1");
    } catch {
      // Private browsing or storage turned off: the intro may play again next visit, which is harmless.
    }
  }, [source, force]);
  useEffect(() => {
    if (phase === "leaving") {
      const timer = window.setTimeout(() => setPhase("gone"), INTRO_TIMING.fade);
      return () => window.clearTimeout(timer);
    }
    if (phase === "gone") {
      window.dispatchEvent(new Event(INTRO_END_EVENT));
      onEnd?.();
    }
  }, [phase, onEnd]);

  // Timers: give up if the video has not started in time; leave at 3.4 s.
  useEffect(() => {
    if (!source) return;
    const giveUp = window.setTimeout(() => { if (!started.current) finish(true); }, INTRO_TIMING.startWithin);
    const leave = window.setTimeout(() => finish(), INTRO_TIMING.fadeAt);
    return () => { window.clearTimeout(giveUp); window.clearTimeout(leave); };
  }, [source, finish]);

  // Any interaction ends it. Scrolling is detected from the gesture (wheel, touch, scroll keys),
  // not the scroll event, which browsers also fire on their own while a page settles.
  useEffect(() => {
    if (phase !== "playing") return;
    const end = () => finish();
    const onKey = (event: KeyboardEvent) => { if (INTRO_END_KEYS.has(event.key)) finish(); };
    window.addEventListener("wheel", end, { passive: true });
    window.addEventListener("touchmove", end, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", end);
      window.removeEventListener("touchmove", end);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, finish]);

  // Signed in after all (session restored late): leave straight away.
  useEffect(() => { if (user && !force) finish(true); }, [user, force, finish]);

  if (!source || phase === "gone") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-[400ms] ease-out",
        source.overlay === "white" ? "bg-white" : "bg-cream",
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      onPointerDown={() => finish()}
    >
      <video
        ref={videoRef}
        className="h-auto w-[min(88vw,960px)] max-h-[80vh]"
        autoPlay
        muted
        playsInline
        preload="auto"
        poster={source.overlay === "white" ? siteFacts.brand.intro.poster : undefined}
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => { started.current = true; }}
        onError={() => finish(true)}
        onEnded={() => finish()}
      >
        <source src={source.src} type={source.type} onError={() => finish(true)} />
      </video>
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); finish(); }}
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute right-4 top-4 rounded-lg border border-brand-900/20 bg-card/90 px-3 py-2 text-sm font-medium text-forest hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-6 sm:top-6"
      >
        {t("intro.skip", "Skip intro")}
      </button>
    </div>
  );
}
