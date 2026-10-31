/* Roscap cookie consent v1. No dependencies. Needs the Consent Mode default from site-head.html.
   Exposes window.RoscapConsent {open, get, reset, version} and fires CustomEvent "roscap-consent". */
(function (w, d) {
  var VERSION = 1; /* bump here and in site-head.html to ask everyone again */
  var NAME = 'roscap_consent', MAX_AGE = 15552000; /* 180 days */
  var SEEN = 'roscap_consent_seen'; /* the banner shows on the first page of a visit only (owner's choice) */
  var $ = function (id) { return d.getElementById(id); };
  var banner = $('rc-banner'), modal = $('rc-modal'), dialog = $('rc-dialog'), live = $('rc-live');
  var swA = $('rc-sw-analytics'), swM = $('rc-sw-marketing'), status = $('rc-status');
  if (!banner || !modal) return;
  var opener = null, inerted = [];

  function parse(raw) {
    try { var o = JSON.parse(raw); if (o && o.version === VERSION && typeof o.analytics === 'boolean' && typeof o.marketing === 'boolean') return o; } catch (e) {}
    return null;
  }
  function raw() {
    var m = d.cookie.match(new RegExp('(?:^|; )' + NAME + '=([^;]*)'));
    if (m) return decodeURIComponent(m[1]);
    try { return localStorage.getItem(NAME); } catch (e) { return null; }
  }
  function seen() { try { return sessionStorage.getItem(SEEN) === String(VERSION); } catch (e) { return false; } }
  function markSeen(on) { try { if (on) sessionStorage.setItem(SEEN, String(VERSION)); else sessionStorage.removeItem(SEEN); } catch (e) {} }
  function read() {
    var m = d.cookie.match(new RegExp('(?:^|; )' + NAME + '=([^;]*)')), c = m && parse(decodeURIComponent(m[1]));
    if (!c) try { c = parse(localStorage.getItem(NAME)); } catch (e) {}
    return c || null;
  }
  function cookie(name, value, maxAge, domain) {
    d.cookie = name + '=' + value + '; Max-Age=' + maxAge + '; Path=/; SameSite=Lax' + (domain ? '; Domain=' + domain : '') + (location.protocol === 'https:' ? '; Secure' : '');
  }
  function write(analytics, marketing) {
    var c = { version: VERSION, analytics: !!analytics, marketing: !!marketing, timestamp: new Date().toISOString() }, s = JSON.stringify(c);
    cookie(NAME, encodeURIComponent(s), MAX_AGE);
    try { localStorage.setItem(NAME, s); } catch (e) {}
    return c;
  }
  /* remove Google cookies for categories that are now off */
  function purge(c) {
    var host = location.hostname.replace(/^www\./, '');
    (c.analytics ? [] : ['_ga', '_ga_H8HS2R6NLS']).concat(c.marketing ? [] : ['_gcl_au', '_gcl_ls']).forEach(function (n) {
      cookie(n, '', 0); cookie(n, '', 0, host); cookie(n, '', 0, '.' + host);
    });
  }
  function signal(c) {
    var g = typeof w.gtag === 'function' ? w.gtag : function () { (w.dataLayer = w.dataLayer || []).push(arguments); };
    g('consent', 'update', { analytics_storage: c.analytics ? 'granted' : 'denied', ad_storage: c.marketing ? 'granted' : 'denied', ad_user_data: c.marketing ? 'granted' : 'denied', ad_personalization: 'denied' });
    if (typeof w.rcTags === 'function') w.rcTags(c); /* basic mode: the Google tag loads only after a "yes" (site-head.html) */
  }

  function showBanner() {
    banner.hidden = false;
    d.documentElement.classList.add('rc-banner-open');
    w.setTimeout(function () { banner.classList.add('rc-in'); }, 30);
  }
  function hideBanner() {
    banner.hidden = true;
    banner.classList.remove('rc-in');
    d.documentElement.classList.remove('rc-banner-open');
  }
  function words(c) { return 'analytics ' + (c.analytics ? 'on' : 'off') + ', marketing ' + (c.marketing ? 'on' : 'off'); }
  function render(c) {
    swA.setAttribute('aria-checked', c && c.analytics ? 'true' : 'false');
    swM.setAttribute('aria-checked', c && c.marketing ? 'true' : 'false');
    status.innerHTML = '<b>Your choice:</b> ' + (c ? words(c) + '. Saved ' + new Date(c.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '.'
      : 'none saved yet. Optional cookies stay off until you choose.');
  }
  function openDialog(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (!modal.hidden) return;
    opener = d.activeElement;
    render(read());
    if (!banner.hidden) hideBanner();
    modal.hidden = false;
    d.documentElement.classList.add('rc-dialog-open');
    d.documentElement.style.overflow = 'hidden';
    /* rest of the page: out of the tab order and the accessibility tree */
    inerted = Array.prototype.filter.call(d.body.children, function (el) { return el !== modal && el !== live && !el.hasAttribute('inert'); });
    inerted.forEach(function (el) { el.setAttribute('inert', ''); });
    dialog.focus();
  }
  function closeDialog() {
    if (modal.hidden) return;
    modal.hidden = true;
    d.documentElement.classList.remove('rc-dialog-open');
    d.documentElement.style.overflow = '';
    inerted.forEach(function (el) { el.removeAttribute('inert'); });
    inerted = [];
    if (!read()) showBanner();
    if (opener && opener.focus) opener.focus();
    opener = null;
  }
  function apply(c) {
    signal(c); purge(c); render(c.version ? c : null); closeDialog();
    d.dispatchEvent(new CustomEvent('roscap-consent', { detail: c.version ? c : null }));
  }
  function choose(analytics, marketing) {
    var c = write(analytics, marketing);
    hideBanner(); apply(c);
    if (live) { live.textContent = ''; w.setTimeout(function () { live.textContent = 'Preferences saved: ' + words(c) + '.'; }, 50); }
  }
  function reset() {
    markSeen(false);
    cookie(NAME, '', 0);
    try { localStorage.removeItem(NAME); } catch (e) {}
    apply({ analytics: false, marketing: false });
    showBanner();
  }

  d.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-rc]');
    if (!t) return;
    var act = t.getAttribute('data-rc');
    if (act === 'accept') choose(true, true);
    else if (act === 'reject') choose(false, false);
    else if (act === 'save') choose(swA.getAttribute('aria-checked') === 'true', swM.getAttribute('aria-checked') === 'true');
    else if (act === 'open') openDialog(e);
    else if (act === 'close') closeDialog();
    else if (act === 'switch') t.setAttribute('aria-checked', t.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
  });
  modal.addEventListener('click', function (e) { if (e.target === modal) closeDialog(); });
  modal.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeDialog(); return; }
    if (e.key !== 'Tab') return;
    var f = dialog.querySelectorAll('a[href],button:not([disabled])'), first = f[0], last = f[f.length - 1], a = d.activeElement;
    if (e.shiftKey && (a === first || a === dialog)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  });

  /* banner and dialog go first in <body>, after a skip link if there is one */
  var first = d.body.firstElementChild;
  var anchor = first && first.tagName === 'A' && /^#/.test(first.getAttribute('href') || '') ? first.nextSibling : d.body.firstChild;
  if (banner !== anchor) d.body.insertBefore(banner, anchor);
  if (modal !== banner.nextElementSibling) d.body.insertBefore(modal, banner.nextSibling);

  w.RoscapConsent = { open: openDialog, get: read, reset: reset, version: VERSION };
  /* first page of a visit: the banner. Later pages of the same visit: no banner if it was ignored (nothing optional runs without a yes;
     the footer link opens the choices at any time). A choice saved under an older version always asks again. */
  var stored = read(), stale = !stored && !!raw();
  render(stored);
  if (stored) hideBanner();
  else if (seen() && !stale) hideBanner();
  else { showBanner(); markSeen(true); }
})(window, document);
