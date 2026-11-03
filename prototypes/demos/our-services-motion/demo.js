/* Our Services motion demos: option switching, replay, the in-view triggers and the Our Process alternative. No libraries. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var sda = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var body = document.body, note = $('#demo-note');
  var NOTES = {
    '1': 'Option 1, in turn: the heading, then each card one after another. Inside a card the icon, the title and the line arrive in that order, each sharpening from a soft blur. On a phone each card arrives as you reach it.',
    '2': sda ? 'Option 2, with the scroll: the cards are tied to your scrolling. They come in one by one as you scroll down (left to right on a computer) and go back if you scroll up.'
             : 'Option 2, with the scroll: this browser cannot tie animation to scrolling, so here it plays like option 1. In Chrome and Edge the cards follow your scrolling.',
    '3': 'Option 3, signature: the gold Roscap R draws itself above the first heading, then the cards arrive in turn and each icon is revealed from the bottom up. The second section has no R, so it happens once.',
    '4': 'Option 4, light pass: the cards arrive in turn, then a thin gold light runs once around each card, handing over from card to card. On a computer a soft glow follows the pointer over a card.'
  };
  var io = null;
  var setD = function (el, ms) { el.style.setProperty('--d', ms + 'ms'); };

  function arm() {
    if (io) { io.disconnect(); io = null; }
    var opt = body.getAttribute('data-opt');
    $$('.cards').forEach(function (s) { s.classList.remove('armed'); });
    $$('.cards .is-in').forEach(function (el) { el.classList.remove('is-in'); });
    void body.offsetWidth; /* restart the CSS animations */
    if (reduce || !hasIO) return;
    if (opt === '2' && sda) return; /* scroll-linked: the CSS does it all */
    $$('.cards').forEach(function (s) { s.classList.add('armed'); });
    var targets = $$('.cards .sig, .cards .cover-h, .cards .rs-cover-card-og, .cards .cover-end');
    io = new IntersectionObserver(function (entries) {
      var ins = entries.filter(function (e) { return e.isIntersecting; })
        .map(function (e) { return e.target; })
        .sort(function (a, b) { return targets.indexOf(a) - targets.indexOf(b); });
      var t = 0, beam = 0;
      ins.forEach(function (el) {
        if (el.classList.contains('sig')) { setD(el, t); t += 1150; }
        else if (el.classList.contains('cover-h')) { setD(el, t); t += 260; }
        else if (el.classList.contains('rs-cover-card-og')) {
          setD(el, t);
          el.style.setProperty('--b', (t + 600 + beam * 420) + 'ms'); /* option 4: the light hands over from card to card */
          beam++; t += 160;
        } else setD(el, t + 300);
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.25 });
    targets.forEach(function (el) { io.observe(el); });
  }

  function replay() {
    var top = $('#debt-intro');
    window.scrollTo(0, Math.max(0, top.getBoundingClientRect().top + window.scrollY - 64));
    arm();
  }
  $$('.demo-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      var opt = b.getAttribute('data-opt');
      body.setAttribute('data-opt', opt);
      $$('.demo-tabs button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      note.textContent = NOTES[opt];
      replay();
    });
  });
  $('.demo-replay').addEventListener('click', replay);
  note.textContent = NOTES['1'];
  arm();

  /* option 4: the glow follows the pointer */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.rs-cover-card-og').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* Our Process alternative: scroll-linked on computers (CSS); on tablets the line runs once and the steps light in turn;
     on phones the steps are cards you swipe through, all lit */
  var row = $('.pa-row');
  var wide = window.matchMedia('(min-width: 992px)').matches, phone = window.matchMedia('(max-width: 767px)').matches;
  if (row && !reduce && hasIO && !phone && !(sda && wide)) {
    var steps = $$('.pa-step', row);
    row.classList.add('pa-armed');
    var pio = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      pio.disconnect();
      row.classList.add('pa-play');
      steps.forEach(function (s, i) { setTimeout(function () { s.classList.add('is-on'); }, 300 + i * 380); });
    }, { threshold: 0.4 });
    pio.observe(row.parentNode);
  }
})();
