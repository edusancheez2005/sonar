// Google blocks OAuth inside embedded WebViews ("Error 403: disallowed_useragent"),
// so "Continue with Google" must detect in-app browsers (LinkedIn, Instagram,
// Gmail, X, TikTok, …) and route the user to a real browser instead.

const IN_APP_UA =
  /LinkedInApp|FBAN|FBAV|FB_IAB|FBIOS|Instagram|Twitter|TwitterAndroid|TikTok|musical_ly|BytedanceWebview|Snapchat|GSA\/|Line\/|MicroMessenger|WhatsApp|; wv\)/i;

export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (IN_APP_UA.test(ua)) return true;
  // iOS WebViews drop the trailing "Safari/xxx" token that every real iOS
  // browser (Safari, CriOS, FxiOS, EdgiOS) keeps.
  return /iPhone|iPad|iPod/i.test(ua) && !/Safari\//i.test(ua);
}

// On Android an intent:// URL breaks out of the WebView into Chrome (falling
// back to the current URL if Chrome is missing). Returns true if the escape
// was attempted — the caller should abort the OAuth flow either way.
export function escapeInAppBrowser() {
  if (typeof navigator === 'undefined' || !/Android/i.test(navigator.userAgent || '')) return false;
  const { host, pathname, search } = window.location;
  window.location.href =
    `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
  return true;
}

export const IN_APP_BROWSER_MESSAGE =
  'Google sign-in doesn’t work inside this app’s built-in browser. ' +
  'Tap the ⋯ menu and choose “Open in browser”, or visit sonartracker.io in Safari or Chrome. ' +
  'Email sign-in below works here too.';
