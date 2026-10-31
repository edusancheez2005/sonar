/* Roscap homepage glue: lazy hero video, stat counters (as live, smoother easing), the Asset Classes / Sources of Capital
   switch, and the IntersectionObserver
   fallback for reveals where CSS scroll-driven animations are not supported. Shared nav/forms live in site.js. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- hero video: the panther clip on every screen size. Portrait phones get the 576 x 1078 crop, everything
     else the 1280 px file. Starts straight after first paint at data-start (1.0 s, as the live embed's #t=1), pauses
     off screen and with the pause button; a close-up still replaces it under reduced motion, Save-Data, or when the
     browser refuses autoplay (for example iOS Low Power Mode). In the review bundle the two files travel inside the
     page as data blocks (#hero-video-desktop-data, #hero-video-portrait-data); in Webflow they are plain URLs. ---------- */
  (function video() {
    var hero = document.getElementById('hero'), v = document.getElementById('hero-video'), btn = document.getElementById('hero-pause');
    if (!hero || !v) return;
    function still() { hero.classList.add('is-still'); if (v.parentNode) v.parentNode.removeChild(v); if (btn) btn.hidden = true; }
    if (reduce || (navigator.connection && navigator.connection.saveData)) { still(); return; }
    var portrait = window.matchMedia('(max-width: 767px) and (orientation: portrait)').matches;
    var startAt = parseFloat(v.getAttribute('data-start')) || 0, userPaused = false;
    function embedded(id) {
      var el = document.getElementById(id); if (!el) return null;
      try { var bin = atob(el.textContent.trim()), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([u], { type: 'video/mp4' })); } catch (e) { return null; }
    }
    function play() { var p = v.play(); if (p && p.catch) p.catch(function (e) { if (e && e.name === 'NotAllowedError') still(); }); }
    function begin() {
      var blob = embedded(portrait ? 'hero-video-portrait-data' : 'hero-video-desktop-data');
      var chosen = v.querySelector(portrait ? 'source[media]' : 'source:not([media])');
      Array.prototype.slice.call(v.querySelectorAll('source')).forEach(function (s) { if (blob || s !== chosen) v.removeChild(s); });
      if (blob) v.src = blob; else if (chosen) { chosen.removeAttribute('media'); chosen.src = chosen.getAttribute('data-src'); }
      v.addEventListener('loadedmetadata', function () { if (startAt && v.currentTime < startAt) { try { v.currentTime = startAt; } catch (e) {} } }, { once: true });
      v.addEventListener('playing', function () { v.classList.add('is-playing'); if (btn) btn.hidden = false; }, { once: true });
      v.load();
      play();
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { if (!es[0].isIntersecting) v.pause(); else if (!userPaused && v.parentNode) play(); }).observe(hero);
      }
      if (btn) btn.addEventListener('click', function () {
        userPaused = !userPaused;
        btn.setAttribute('aria-pressed', String(userPaused));
        if (userPaused) v.pause(); else play();
      });
    }
    requestAnimationFrame(function () { setTimeout(begin, 0); });
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
      }, { rootMargin: '0px 0px -20% 0px' }); /* as live: starts when the figures reach 80% of the screen height */
      io.observe(el);
    });
  })();

  /* ---------- Asset Classes / Sources of Capital (live look and controls; paste-ready, see HANDOFF.md section 2.3).
     Two card sets in one grid cell, so the height never jumps. The arrows (both loop to the other set), the headings and a
     horizontal swipe switch sets. The switch: the four cards slide 24 px and fade out (0.22 s) while the new four slide in from
     the other side one after another (from 0.09 s, 55 ms apart, 0.44 s each), so there is never an empty frame; the headings swap
     as on live (fade and shift out, swap, back in).
     Reduced motion: instant switch. No library (live uses Swiper for this). ---------- */
  (function slider() {
    var box = document.getElementById('asl');
    if (!box) return;
    var slides = $$('.asl-slide', box), heads = $$('.slider-heading', box), btns = $$('.slider-heading-btn', box);
    var idx = 0, busy = false, canAnimate = !reduce && typeof Element.prototype.animate === 'function';
    function setOn(el, on) {
      el.classList.toggle('is-on', on);
      if (on) { el.removeAttribute('aria-hidden'); el.removeAttribute('inert'); } else { el.setAttribute('aria-hidden', 'true'); el.setAttribute('inert', ''); }
    }
    function markHeads(i) {
      heads.forEach(function (h, k) { h.classList.toggle('is-active', k === i); });
      btns.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); });
    }
    function go(i, dir) {
      i = (i + slides.length) % slides.length;
      if (i === idx || busy) return;
      var from = slides[idx], to = slides[i];
      dir = dir || (i > idx ? 1 : -1);
      if (!canAnimate) { setOn(from, false); setOn(to, true); markHeads(i); idx = i; return; }
      busy = true;
      var outItems = $$('.slider-item', from), inItems = $$('.slider-item', to);
      /* out: the current four slide 24 px and fade (0.22 s); the headings fade and shift as on live */
      outItems.forEach(function (el) { el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (-24 * dir) + 'px)' }], { duration: 220, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'forwards' }); });
      heads.forEach(function (h) { var act = h.classList.contains('is-active'); h.animate([{ opacity: act ? 1 : 0.55, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (act ? 10 : -10) + '%)' }], { duration: 170, easing: 'ease-in', fill: 'forwards' }); });
      /* in, overlapping the out (no empty frame): the new four arrive from the other side one after another */
      setTimeout(function () {
        setOn(to, true);
        inItems.forEach(function (el, k) { el.animate([{ opacity: 0, transform: 'translateX(' + (32 * dir) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 440, delay: k * 55, easing: 'cubic-bezier(.25,1,.5,1)', fill: 'backwards' }); });
      }, 90);
      setTimeout(function () {
        markHeads(i);
        heads.forEach(function (h) { h.getAnimations().forEach(function (an) { an.cancel(); }); var act = h.classList.contains('is-active'); h.animate([{ opacity: 0, transform: 'translateX(' + (act ? -10 : 10) + '%)' }, { opacity: act ? 1 : 0.55, transform: 'none' }], { duration: 250, easing: 'cubic-bezier(.25,1,.5,1)' }); });
      }, 170);
      setTimeout(function () {
        setOn(from, false);
        outItems.forEach(function (el) { el.getAnimations().forEach(function (an) { an.cancel(); }); });
        idx = i;
        busy = false;
      }, 240);
    }
    $$('.slider-arrow', box).forEach(function (a) { a.addEventListener('click', function () { var d = Number(a.getAttribute('data-dir')) || 1; go(idx + d, d); }); });
    btns.forEach(function (b, k) {
      b.addEventListener('click', function () { go(k); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault(); var d = e.key === 'ArrowRight' ? 1 : -1, t = (idx + d + btns.length) % btns.length; go(t, d); btns[t].focus();
      });
    });
    /* swipe on touch screens (vertical scrolling stays native: touch-action pan-y on the slider) */
    var view = box.querySelector('.swiper'), x0 = null, y0 = null;
    view.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') return; x0 = e.clientX; y0 = e.clientY; });
    view.addEventListener('pointerup', function (e) {
      if (x0 === null) return; var dx = e.clientX - x0, dy = e.clientY - y0; x0 = y0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) { var d = dx < 0 ? 1 : -1; go(idx + d, d); }
    });
    view.addEventListener('pointercancel', function () { x0 = y0 = null; });
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
