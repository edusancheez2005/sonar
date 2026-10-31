/* The Capital Stack: state, keyboard and fallback choreography. No libraries.
   The visual build is CSS (scroll-driven animations) when the browser supports it; this script
   only (1) tracks which narration is current for aria-current and the live region,
   (2) makes the layer buttons scroll to their narration, and (3) in fallback mode toggles .is-on
   on the diagram parts so they build step by step. Mode is set on <html data-cs-mode> in <head>. */
(function () {
  'use strict';
  var root = document.documentElement;
  var cs = document.getElementById('capital-stack');
  if (!cs || !('IntersectionObserver' in window)) return;

  var notes = Array.prototype.slice.call(cs.querySelectorAll('.cs-note'));
  var layers = Array.prototype.slice.call(cs.querySelectorAll('.cs-layer'));
  var parts = Array.prototype.slice.call(cs.querySelectorAll('[data-on]'));
  var live = document.getElementById('cs-live');
  var active = 0;            /* 0 = nothing built yet, 1..4 = layers built so far */
  var announceTimer = 0;
  var observer = null;
  var lineFrac = 0.52;

  function mode() { return root.getAttribute('data-cs-mode') || 'static'; }
  function cssVar(name, fallback) {
    var v = parseFloat(getComputedStyle(cs).getPropertyValue(name));
    return isNaN(v) ? fallback : v;
  }

  /* ---------- state ---------- */
  function setActive(n, announce) {
    if (n === active) return;
    active = n;
    layers.forEach(function (b, i) {
      if (i + 1 === n) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    notes.forEach(function (li, i) { li.classList.toggle('is-active', i + 1 === n); });
    if (mode() === 'fallback') {
      parts.forEach(function (el) { el.classList.toggle('is-on', Number(el.getAttribute('data-on')) <= n); });
    }
    if (announce !== false && live && n > 0) {
      var name = layers[n - 1].textContent.trim();
      var h = notes[n - 1].querySelector('.cs-note-h');
      clearTimeout(announceTimer);
      announceTimer = setTimeout(function () {
        live.textContent = name + ', layer ' + n + ' of ' + layers.length + '. ' + (h ? h.textContent.trim() : '');
      }, 250);
    }
  }

  /* the current narration is the lowest one whose top has passed the trigger line */
  function compute() {
    var line = window.innerHeight * lineFrac + 2;
    var n = 0;
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].getBoundingClientRect().top <= line) n = i + 1;
    }
    setActive(n);
  }

  function observe() {
    if (observer) observer.disconnect();
    lineFrac = cssVar('--cs-line', 0.52);
    var top = Math.round(lineFrac * 100);
    /* a thin band whose bottom edge is the trigger line: a narration's top crossing the line, in
       either direction, changes its intersection state and we recompute from the live rects */
    observer = new IntersectionObserver(compute, {
      rootMargin: '-' + Math.max(0, top - 3) + '% 0px -' + Math.max(0, 100 - top) + '% 0px',
      threshold: 0
    });
    notes.forEach(function (li) { observer.observe(li); });
    compute();
  }
  /* settle after any scroll ends (where supported) so state never lags a fast scroll */
  if ('onscrollend' in window) window.addEventListener('scrollend', compute, { passive: true });

  /* ---------- layer buttons: scroll the narration into the trigger band ---------- */
  function goTo(i, focus) {
    var li = notes[i]; if (!li) return;
    var anchor = cssVar('--cs-anchor', 0.42);
    var top = li.getBoundingClientRect().top + window.pageYOffset - window.innerHeight * anchor;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, Math.round(top)), behavior: reduce ? 'auto' : 'smooth' });
    if (focus) layers[i].focus({ preventScroll: true });
    setTimeout(compute, reduce ? 50 : 1200);
  }

  layers.forEach(function (b, i) {
    b.addEventListener('click', function () { goTo(i, false); });
    b.addEventListener('keydown', function (e) {
      var k = e.key, j = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') j = Math.min(layers.length - 1, i + 1);
      else if (k === 'ArrowUp' || k === 'ArrowLeft') j = Math.max(0, i - 1);
      else if (k === 'Home') j = 0;
      else if (k === 'End') j = layers.length - 1;
      if (j === null) return;
      e.preventDefault();
      goTo(j, true);
    });
  });

  /* ---------- lifecycle ---------- */
  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(observe, 150);
  }, { passive: true });

  /* if the user switches reduced motion while the page is open, drop to the static path */
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  function onMotionChange() {
    if (mq.matches) { root.setAttribute('data-cs-mode', 'static'); parts.forEach(function (el) { el.classList.remove('is-on'); }); }
  }
  if (mq.addEventListener) mq.addEventListener('change', onMotionChange);

  observe();

  /* exposed for QA only */
  window.CapitalStack = { get active() { return active; }, goTo: goTo, mode: mode };
})();
