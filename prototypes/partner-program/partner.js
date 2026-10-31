/* Roscap prototype v2: Partner Program page behaviour. No libraries.
   Everything here is progressive enhancement: without JS the page is fully readable and the marquee still runs
   (CSS only, pauses on hover and focus). */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var revealOnce = function (els, opts) {
    if (reduce || !hasIO) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, opts);
    els.forEach(function (el) { io.observe(el); });
  };

  /* 1. Live behaviour replica: each .section slides in once when it enters the viewport
     (the live Webflow interaction on .section; nothing to build). CSS keeps it static under reduced motion. */
  revealOnce($$('.section'), { threshold: 0 });

  /* 2. How it works (from prototype v1): reveal fallback for browsers without scroll-driven animations,
     and the sticky step indicator that highlights the step nearest the middle of the viewport. */
  var steps = $$('.step');
  revealOnce(steps, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  var navItems = $$('.how-nav li');
  var setActive = function (id) {
    navItems.forEach(function (li) {
      var a = $('a', li);
      var on = a && a.getAttribute('href') === '#' + id;
      li.classList.toggle('is-active', on);
      if (a) { if (on) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); }
    });
  };
  if (steps.length && navItems.length) {
    if (hasIO) {
      var current = null;
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) current = e.target.id; });
        if (current) setActive(current);
      }, { rootMargin: '-40% 0px -45% 0px', threshold: 0 });
      steps.forEach(function (s) { io2.observe(s); });
    }
    setActive(steps[0].id);
  }

  /* 3. Our Partners marquee: CSS does the motion and pauses it on hover and while the strip has focus (keyboard or tap).
     No pause button (owner's choice). */
  var strip = $('[data-marquee]');
  /* logos stay lazy, but load all of them once the strip is within 800px of the viewport: native lazy loading never
     starts a logo that is still outside the strip's horizontal clip, so it would pop in while sliding into view */
  if (strip) {
    var logos = $$('img[loading="lazy"]', strip);
    var eager = function () { logos.forEach(function (im) { im.loading = 'eager'; }); };
    if (hasIO) {
      var io3 = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { eager(); io3.disconnect(); }
      }, { rootMargin: '800px 0px' });
      io3.observe(strip);
    } else eager();
  }

  /* keep the nav solid when the page loads mid-way (site.js handles scroll) */
  if (window.scrollY > 40 && $('#nav')) $('#nav').classList.add('is-scrolled');
})();
