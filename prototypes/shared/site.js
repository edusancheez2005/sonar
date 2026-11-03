/* Roscap prototype shared behaviour: nav, reveals, mock forms.
   Mirrors the owner's concept files so every prototype behaves the same. */
(function () {
  var root = document.documentElement;
  var G = window.gsap, ST = window.ScrollTrigger;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motion = !!(G && ST) && !reduce;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var nav = $('#nav');
  var lenis = null;

  window.RoscapProto = { motion: motion, reduce: reduce, get lenis() { return lenis; } };

  if (G && ST) G.registerPlugin(ST);
  if (motion) {
    root.classList.add('motion');
    ST.config({ ignoreMobileResize: true });
    if (window.Lenis && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
      lenis.on('scroll', ST.update);
      G.ticker.add(function (t) { lenis.raf(t * 1000); });
      G.ticker.lagSmoothing(0);
    }
  }

  /* nav: solid once scrolled, burger menu on small screens */
  if (nav) {
    var burger = $('.nav-burger', nav);
    var setScrolled = function () { nav.classList.toggle('is-scrolled', window.scrollY > 40); };
    window.addEventListener('scroll', setScrolled, { passive: true });
    setScrolled();
    /* computer, as on the live site: scrolling down fades the page links out (the logo and Speak to Us stay), scrolling up brings them back */
    var wide = window.matchMedia('(min-width: 992px)');
    var lastY = window.scrollY;
    var setLinks = function () {
      var y = window.scrollY, dy = y - lastY;
      if (!wide.matches || y <= 0) { nav.classList.remove('links-away'); lastY = y; return; }
      if (Math.abs(dy) < 3) return;
      nav.classList.toggle('links-away', dy > 0);
      lastY = y;
    };
    window.addEventListener('scroll', setLinks, { passive: true });
    var offWide = function () { if (!wide.matches) nav.classList.remove('links-away'); };
    if (wide.addEventListener) wide.addEventListener('change', offWide); else if (wide.addListener) wide.addListener(offWide);
    if (burger) burger.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    });
  }

  /* [data-reveal]: fade/rise once when scrolled into view; static when reduced motion */
  var items = $$('[data-reveal]');
  if (!motion) { items.forEach(function (el) { el.classList.add('is-in'); }); }
  else if (G) {
    items.forEach(function (el) {
      G.set(el, { autoAlpha: 0, y: 28 });
      ST.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () {
        G.to(el, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform' });
      } });
    });
  }

  /* forms are switched off in prototypes */
  $$('form[data-mock]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = $('.form-note', f) || $('.form-note', f.parentNode);
      if (note) note.textContent = 'Forms are switched off in this prototype, so nothing was sent.';
    });
  });
})();
