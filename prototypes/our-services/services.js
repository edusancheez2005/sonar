/* Roscap prototype v2: Our Services page behaviour. No libraries.
   Progressive enhancement only: without JS the page and the complete capital stack show, static. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var revealOnce = function (els, opts) {
    if (reduce || !hasIO) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, opts);
    els.forEach(function (el) { io.observe(el); });
  };

  /* 1. Live behaviour replicas (Webflow interactions that already exist on live; nothing to build):
     every .section slides in once as it enters; the process heading, text and button at a 15% offset.
     The CSS keeps all of it static under prefers-reduced-motion. */
  revealOnce($$('.section'), { threshold: 0 });
  revealOnce($$('.ix-15'), { rootMargin: '0px 0px -15% 0px', threshold: 0 });

  /* 3. ASSET CLASSES (paste-ready, see HANDOFF.md): the cards that come into view together fade up one after another, 70 ms apart.
     Without IntersectionObserver or with reduced motion they are simply shown. */
  var cards = $$('.assets-card');
  if (cards.length) {
    if (reduce || !hasIO) cards.forEach(function (c) { c.classList.add('is-in'); });
    else {
      cards[0].parentNode.classList.add('as-armed');
      var aio = new IntersectionObserver(function (entries) {
        entries.filter(function (e) { return e.isIntersecting; })
          .map(function (e) { return e.target; })
          .sort(function (a, b) { return cards.indexOf(a) - cards.indexOf(b); })
          .forEach(function (c, i) { c.style.setProperty('--d', (i * 70) + 'ms'); c.classList.add('is-in'); aio.unobserve(c); });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.25 });
      cards.forEach(function (c) { aio.observe(c); });
    }
  }

  /* 2. CAPITAL STACK (paste-ready, see HANDOFF.md): arm the card, then play the build once when 40% of it is visible.
     Without IntersectionObserver or with reduced motion the card is never armed, so the complete stack simply shows. */
  var cs = document.getElementById('capital-stack');
  if (cs && !reduce && hasIO) {
    cs.classList.add('cs-armed');
    var csio = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting && e.intersectionRatio >= 0.4; })) { cs.classList.add('is-in'); csio.disconnect(); }
    }, { threshold: [0, 0.4, 0.6] });
    csio.observe(cs);
  }
})();
