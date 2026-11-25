import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldPlayIntro, pickIntroSource, isWebKitWithoutAlpha, hasStoredSession } from "../src/features/site/introPolicy.ts";

const base = { ready: true, path: "/", alreadyPlayed: false, signedIn: false, reducedMotion: false, saveData: false };
const files = { webm: "/i.webm", mp4: "/i.mp4" };
const UA = {
  chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  edge: "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0",
  firefox: "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
  safari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  iosChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
};

test("plays only on the home page, once, for visitors who have not opted out", () => {
  assert.equal(shouldPlayIntro(base), true);
  for (const change of [{ ready: false }, { path: "/courses" }, { path: "/course/abc" }, { alreadyPlayed: true }, { signedIn: true }, { reducedMotion: true }, { saveData: true }]) {
    assert.equal(shouldPlayIntro({ ...base, ...change }), false, JSON.stringify(change));
  }
});

test("WebKit browsers are detected, including Chrome on iOS", () => {
  assert.equal(isWebKitWithoutAlpha(UA.safari), true);
  assert.equal(isWebKitWithoutAlpha(UA.iosChrome), true);
  for (const ua of [UA.chrome, UA.edge, UA.firefox, UA.android]) assert.equal(isWebKitWithoutAlpha(ua), false);
});

test("alpha WebM on cream where it renders, MP4 on white everywhere else", () => {
  assert.deepEqual(pickIntroSource(files, true, UA.chrome).overlay, "cream");
  assert.equal(pickIntroSource(files, true, UA.firefox).src, "/i.webm");
  assert.deepEqual(pickIntroSource(files, true, UA.safari), { src: "/i.mp4", type: "video/mp4", overlay: "white" });
  assert.equal(pickIntroSource(files, false, UA.chrome).src, "/i.mp4");
});

test("a stored Supabase session counts as signed in", () => {
  assert.equal(hasStoredSession(["i18nextLng", "sb-abcd-auth-token"]), true);
  assert.equal(hasStoredSession(["i18nextLng", "dataplus-demo-db-v4"]), false);
});
