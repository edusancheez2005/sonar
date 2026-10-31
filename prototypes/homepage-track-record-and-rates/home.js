/* Roscap homepage glue: lazy hero video, stat counters, asset-class slider, and the IntersectionObserver
   fallback for reveals where CSS scroll-driven animations are not supported. Shared nav/forms live in site.js. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- hero video: a separate file, loaded after window load, desktop only, never under reduced motion ---------- */
  (function video() {
    var v = document.getElementById('hero-video');
    if (!v) return;
    var src = v.getAttribute('data-src');
    var wide = window.matchMedia('(min-width: 992px)').matches;
    if (!src || !wide || reduce || (navigator.connection && navigator.connection.saveData)) { v.remove(); return; }
    var start = function () {
      setTimeout(function () {
        v.src = src;
        v.addEventListener('playing', function () { v.classList.add('is-playing'); });
        var p = v.play(); if (p && p.catch) p.catch(function () {});
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (es) {
            if (es[0].isIntersecting) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } else v.pause();
          }).observe(v);
        }
      }, 250);
    };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
  })();

  /* ---------- stats count up once (screen readers get the final figure only) ---------- */
  (function stats() {
    var els = $$('[data-count]');
    if (!els.length) return;
    els.forEach(function (el) {
      var to = Number(el.getAttribute('data-count'));
      if (!isFinite(to)) return;
      var sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = String(to);
      el.parentNode.insertBefore(sr, el);
      el.setAttribute('aria-hidden', 'true');
      if (reduce || !('IntersectionObserver' in window)) return;
      el.textContent = '0';
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        var t0 = null;
        var step = function (ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, (ts - t0) / 2000);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = String(Math.round(to * e));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, { rootMargin: '0px 0px -10% 0px' });
      io.observe(el);
    });
  })();

  /* ---------- asset classes / sources of capital slider ---------- */
  (function slider() {
    var box = document.getElementById('asl');
    if (!box) return;
    var track = document.getElementById('asl-track'), tabs = $$('.asl-tab', box), arrows = $$('.asl-arrow', box), slides = $$('.asl-slide', box);
    var idx = 0;
    var go = function (i) {
      idx = Math.max(0, Math.min(slides.length - 1, i));
      track.style.transform = 'translateX(' + (-100 * idx) + '%)';
      tabs.forEach(function (t, k) { t.classList.toggle('is-active', k === idx); t.setAttribute('aria-selected', String(k === idx)); t.tabIndex = k === idx ? 0 : -1; });
      slides.forEach(function (s, k) {
        s.classList.toggle('is-in', k === idx);
        if (k === idx) { s.removeAttribute('aria-hidden'); s.removeAttribute('inert'); } else { s.setAttribute('aria-hidden', 'true'); s.setAttribute('inert', ''); }
      });
      if (arrows[0]) arrows[0].disabled = idx === 0;
      if (arrows[1]) arrows[1].disabled = idx === slides.length - 1;
    };
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { go(k); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var j = (k + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; tabs[j].focus(); go(j); }
      });
    });
    arrows.forEach(function (a) { a.addEventListener('click', function () { go(idx + Number(a.getAttribute('data-dir'))); }); });
    go(0);
  })();

  /* ---------- reveal fallback: only where CSS scroll-driven animations are missing ---------- */
  (function revealFallback() {
    var supports = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
    if (supports || reduce) return;
    var items = $$('[data-reveal], .dl-item, .rates-panel');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-vis'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-vis'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  })();
})();
