// Preferences and auth should keep working when browser storage is restricted.
const fallback = new Map<string, string>();

export function readBrowserStorage(kind: "local" | "session", key: string): string | null {
  try {
    return (kind === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return fallback.get(`${kind}:${key}`) || null;
  }
}

export function writeBrowserStorage(kind: "local" | "session", key: string, value: string): void {
  try { (kind === "local" ? window.localStorage : window.sessionStorage).setItem(key, value); }
  catch { fallback.set(`${kind}:${key}`, value); }
}

export function removeBrowserStorage(kind: "local" | "session", key: string): void {
  fallback.delete(`${kind}:${key}`);
  try { (kind === "local" ? window.localStorage : window.sessionStorage).removeItem(key); }
  catch { /* A restricted browser can still use the in-memory session. */ }
}

export const authStorage = {
  getItem: (key: string) => readBrowserStorage("local", key),
  setItem: (key: string, value: string) => writeBrowserStorage("local", key, value),
  removeItem: (key: string) => removeBrowserStorage("local", key),
};
