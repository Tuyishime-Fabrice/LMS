const STORAGE_KEY = "coursePaymentReturnState";
const RETURN_PARAM = "returnTo";

/** Only a local course or bundle checkout may be resumed after authentication. */
export function validatePaymentReturnUrl(value: unknown, origin: string): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return null;
    if (!/^\/course\/[a-zA-Z0-9_-]+$/.test(url.pathname) &&
        !(url.pathname === "/bundles" && /^[a-zA-Z0-9_-]+$/.test(url.searchParams.get("bundle") || ""))) {
      return null;
    }
    url.searchParams.set("paymentStep", "payment");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function saveReturnUrl(returnUrl: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ returnUrl, paymentStep: "payment" }));
  } catch {
    // The URL parameter also preserves intent when browser storage is unavailable.
  }
}

export function getPaymentReturnUrl(): string | null {
  const explicit = new URLSearchParams(window.location.search).get(RETURN_PARAM);
  if (explicit !== null) {
    const returnUrl = validatePaymentReturnUrl(explicit, window.location.origin);
    if (returnUrl) saveReturnUrl(returnUrl);
    else clearPaymentReturn();
    return returnUrl;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const returnUrl = validatePaymentReturnUrl(JSON.parse(raw)?.returnUrl, window.location.origin);
    if (!returnUrl) clearPaymentReturn();
    return returnUrl;
  } catch {
    clearPaymentReturn();
    return null;
  }
}

export function clearPaymentReturn() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage can be disabled. */ }
}

export function authContinuationUrl(path: string, returnUrl = getPaymentReturnUrl()): string {
  const url = new URL(path, window.location.origin);
  const validated = validatePaymentReturnUrl(returnUrl, window.location.origin);
  if (validated) url.searchParams.set(RETURN_PARAM, validated);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function beginPaymentSignUp(target: string): string {
  const returnUrl = validatePaymentReturnUrl(target, window.location.origin);
  if (returnUrl) saveReturnUrl(returnUrl);
  return authContinuationUrl("/signup", returnUrl);
}

export function postAuthDestination(profile: { role?: unknown; onboarding_completed?: unknown }): string {
  // Administrators do not pass through learner onboarding.
  if (profile.role === "admin") return "/admin/dashboard";
  if (!profile.onboarding_completed) {
    return authContinuationUrl(profile.role === "teacher" ? "/teacher/onboarding" : "/onboarding");
  }
  return getPaymentReturnUrl() || (profile.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
}
