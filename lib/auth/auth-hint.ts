/**
 * "Probably signed in" hint for the public landing.
 *
 * The landing (`/`) is server-rendered for everyone so search engines read its
 * content. Signed-in visitors are redirected to the app, but Firebase only knows
 * the session after hydration. To avoid flashing the landing at them, the auth
 * listener stores this hint; the inline script in app/layout.tsx copies it onto
 * <html> as a class before first paint, and CSS (globals.css) then hides the
 * landing behind a spinner. A stale hint is cleared as soon as Firebase reports
 * no user.
 */

export const AUTH_HINT_KEY = "posty-auth-hint";
export const AUTH_HINT_CLASS = "posty-auth-hint";

export function setAuthHint(signedIn: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (signedIn) localStorage.setItem(AUTH_HINT_KEY, "1");
    else localStorage.removeItem(AUTH_HINT_KEY);
  } catch {
    // storage unavailable (private mode): the landing simply shows briefly
  }
  if (!signedIn) document.documentElement.classList.remove(AUTH_HINT_CLASS);
}
