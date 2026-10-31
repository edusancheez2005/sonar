/* Roscap market-rates panel: odometer digits, movement chips and the gold wave lines.
   Reads https://edusancheez2005.github.io/roscap-rates/rates.json (CORS *, refreshed by GitHub Actions).
   No dependencies. The static placeholders in the HTML stay in place whenever the feed is missing or fails
   validation (values outside 0 to 25, malformed display strings or dates), and the "Checked" line is hidden.
   Elements (same ids the live Home footer script writes to):
     #rates-panel            the dark card (data-feed overrides the feed URL)
     #baserate-{key}         the number; data-from holds the digits the odometer rolls in from ("0.00")
     #changerate-{key}       the movement chip ("Cut 25 bps", "Raised 25 bps", "Up 2.5 bps")
     #changedate-{key}       the line under the chip ("since 18 Dec 2025", "fixing of 29 Oct 2026")
     #asof-{key}             the data date ("As of 31 Oct 2026"; "Last data 21 Oct 2026, awaiting update" when stale)
     #rates-updated          "Checked 31 Oct 2026" (the feed's check time); shown only once the feed validated
   key = boe | fed | euribor
   #rates-panel carries data-state = loading | live | stale | error for styling hooks. */
(function () {
  'use strict';
  var panel = document.getElementById('rates-panel');
  if (!panel) return;
  window.addEventListener('error', function () { var ns = panel.querySelectorAll('.num'); for (var i = 0; i < ns.length; i++) ns[i].classList.add('is-built'); });
  var FEED = panel.getAttribute('data-feed') || 'https://edusancheez2005.github.io/roscap-rates/rates.json';
  var KEYS = ['boe', 'fed', 'euribor'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DASH = '–';
  var STALE_DAYS = 10;
  /* 'zero' rolls in from the data-from digits (the approved look); 'previous' rolls from value minus the last change.
     'zero' is the default because a pre-set previous value would show an out-of-date rate until the roll triggers. */
  var ROLL_FROM = panel.getAttribute('data-roll-from') === 'previous' ? 'previous' : 'zero';
  var RE_DISPLAY = /^\d+(\.\d+)?%( - \d+(\.\d+)?%)?$/;
  var RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
  var RE_LONG_DATE = /^\d{1,2} [A-Z][a-z]+ \d{4}$/;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var motion = !reduce;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- helpers ---------- */
  function isoParts(iso) {
    if (typeof iso !== 'string' || !RE_DATE.test(iso)) return null;
    var y = +iso.slice(0, 4), mo = +iso.slice(5, 7), d = +iso.slice(8, 10);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var t = Date.UTC(y, mo - 1, d);
    if (t > Date.now() + 2 * 864e5 || y < 2000) return null;
    return { y: y, mo: mo, d: d, t: t };
  }
  function fmtDate(iso) { var p = isoParts(iso); return p ? p.d + ' ' + MONTHS[p.mo - 1] + ' ' + p.y : ''; }
  function daysOld(iso) { var p = isoParts(iso); return p ? (Date.now() - p.t) / 864e5 : Infinity; }
  function num(v, lo, hi) {
    var n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? +v : NaN);
    return isFinite(n) && n >= lo && n <= hi ? n : null;
  }
  function bps(change, decimals) {
    var b = Math.abs(change) * 100;
    return decimals ? (Math.round(b * 10) / 10).toFixed(1) : String(Math.round(b));
  }
  function span(cls) { var s = document.createElement('span'); if (cls) s.className = cls; return s; }

  /* ---------- odometer ---------- */
  function Odo(el) {
    this.el = el;
    this.target = el.textContent.trim();
    this.fromAttr = el.getAttribute('data-from') || '';
    el.textContent = '';
    this.sr = span('sr');
    this.vis = span('odo');
    this.vis.setAttribute('aria-hidden', 'true');
    el.appendChild(this.sr);
    el.appendChild(this.vis);
    this.cols = [];
    this.build(this.target, this.fromAttr);
    el.classList.add('is-built');
  }
  Odo.prototype.srText = function (s) { return s.split(DASH).join(' to '); };
  Odo.prototype.build = function (target, from) {
    var fromDigits = String(from || '').replace(/\D/g, '');
    this.vis.textContent = '';
    this.cols = [];
    this.target = target;
    this.sr.textContent = this.srText(target);
    var di = 0;
    for (var i = 0; i < target.length; i++) {
      var ch = target.charAt(i);
      if (/\d/.test(ch)) {
        var col = span('odo-col'), strip = span('odo-strip');
        for (var k = 0; k < 20; k++) { var d = span(); d.setAttribute('data-d', String(k % 10)); strip.appendChild(d); }
        col.appendChild(strip);
        this.vis.appendChild(col);
        var start = fromDigits.length > di && !isNaN(+fromDigits.charAt(di)) ? +fromDigits.charAt(di) : 0;
        strip.style.transform = 'translateY(' + (-5 * start) + '%)';
        this.cols.push({ strip: strip, pos: start, to: +ch });
        di++;
      } else {
        var t = span('odo-ch');
        t.setAttribute('data-d', ch);
        this.vis.appendChild(t);
      }
    }
  };
  /* Re-targets the digits; rebuilds the columns when the shape changes (e.g. a different number of decimals). */
  Odo.prototype.setTarget = function (target, from) {
    var shape = function (s) { return s.replace(/\d/g, '0'); };
    if (shape(target) !== shape(this.target)) { this.build(target, from || this.fromAttr); return; }
    this.target = target;
    this.sr.textContent = this.srText(target);
    var digits = target.replace(/\D/g, '');
    var fromDigits = String(from || '').replace(/\D/g, '');
    for (var i = 0; i < this.cols.length; i++) {
      this.cols[i].to = +digits.charAt(i);
      if (fromDigits.length === digits.length) this.jump(this.cols[i], +fromDigits.charAt(i));
    }
  };
  Odo.prototype.jump = function (c, digit) {
    c.strip.classList.add('no-anim');
    c.strip.style.transform = 'translateY(' + (-5 * digit) + '%)';
    c.pos = digit;
    void c.strip.offsetHeight;
    c.strip.classList.remove('no-anim');
  };
  Odo.prototype.roll = function (immediate, delay) {
    var self = this;
    this.cols.forEach(function (c, i) {
      if (immediate) { self.jump(c, c.to); return; }
      if (c.pos >= 10) self.jump(c, c.pos % 10);
      if (c.pos % 10 === c.to) return;
      var dest = c.pos + (((c.to - (c.pos % 10)) + 10) % 10);
      var dur = 1.6 + i * 0.12, del = (delay || 0) + i * 0.07;
      c.strip.style.setProperty('--odo-dur', dur.toFixed(2) + 's');
      c.strip.style.setProperty('--odo-delay', del.toFixed(2) + 's');
      c.strip.style.transform = 'translateY(' + (-5 * dest) + '%)';
      c.pos = dest;
      clearTimeout(c.timer);
      c.timer = setTimeout(function () { if (c.pos >= 10) self.jump(c, c.pos % 10); }, (dur + del) * 1000 + 80);
    });
  };

  panel.setAttribute('data-state', 'loading');
  var odos = {};
  KEYS.forEach(function (k) { var el = $('baserate-' + k); if (el) odos[k] = new Odo(el); });
  var moves = panel.querySelectorAll('.rate-move');
  for (var m = 0; m < moves.length; m++) moves[m].style.setProperty('--i', String(m));

  /* ---------- feed ---------- */
  var feed = { data: null, done: false };
  var pending = (function () {
    if (!window.fetch) { feed.done = true; return Promise.resolve(); }
    return fetch(FEED, { cache: 'default', credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { if (!d || typeof d !== 'object' || !d.rates || typeof d.rates !== 'object') throw new Error('unexpected shape'); feed.data = d; })
      .catch(function (e) { if (window.console) console.warn('Rates feed unavailable; showing placeholders.', e && e.message); })
      .then(function () { feed.done = true; });
  })();

  function setChip(key, text, dir) {
    var chip = $('changerate-' + key);
    if (!chip) return;
    var label = chip.querySelector('.chip-t') || chip;
    label.textContent = text;
    var path = chip.querySelector('path');
    if (path) path.setAttribute('d', dir > 0 ? 'M0 8h10L5 1z' : dir < 0 ? 'M0 2h10L5 9z' : 'M1 4h8v2H1z');
  }
  function setText(id, text, stale) {
    var el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    el.classList.toggle('is-stale', !!stale);
  }

  /* Validates one rate against the feed contract. Returns a plain view model or null (placeholder kept). */
  function readRate(key, rate, staleList) {
    if (!rate || typeof rate !== 'object') return null;
    if (typeof rate.display !== 'string' || !RE_DISPLAY.test(rate.display)) return null;
    var asOf = isoParts(rate.as_of) ? rate.as_of : null;
    if (!asOf) return null;
    var change = num(rate.change, -5, 5);
    var view = { stale: rate.stale === true || (staleList && staleList.indexOf(key) !== -1) || daysOld(asOf) > STALE_DAYS, asOf: asOf, from: null };
    if (key === 'fed') {
      var lo = num(rate.range_low, 0, 25), hi = num(rate.range_high, 0, 25);
      if (lo === null || hi === null || hi < lo) return null;
      view.display = lo.toFixed(2) + DASH + hi.toFixed(2);
      if (change !== null && lo - change >= 0) view.from = (lo - change).toFixed(2) + DASH + (hi - change).toFixed(2);
    } else {
      var val = num(rate.value, 0, 25);
      if (val === null) return null;
      var dec = key === 'euribor' ? 3 : 2;
      view.display = val.toFixed(dec);
      if (change !== null && val - change >= 0) view.from = (val - change).toFixed(dec);
    }
    if (key === 'euribor') {
      if (change === null) return null;
      view.chip = change === 0 ? 'Unchanged' : (change > 0 ? 'Up ' : 'Down ') + bps(change, true) + ' bps';
      view.dir = change > 0 ? 1 : change < 0 ? -1 : 0;
      view.date = 'fixing of ' + fmtDate(asOf);
      view.asOfLine = '';
    } else {
      /* change = size of the last move; changed_on = the date it took effect (FRED effective date for the Fed) */
      if (change === null || change === 0 || !isoParts(rate.changed_on)) return null;
      view.chip = (change > 0 ? 'Raised ' : 'Cut ') + bps(change) + ' bps';
      view.dir = change > 0 ? 1 : -1;
      view.date = 'since ' + fmtDate(rate.changed_on);
      view.asOfLine = 'As of ' + fmtDate(asOf);
    }
    if (view.stale) view.asOfLine = 'Last data ' + fmtDate(asOf) + ', awaiting update';
    return view;
  }
  function applyView(key, v) {
    setChip(key, v.chip, v.dir);
    setText('changedate-' + key, v.date);
    setText('asof-' + key, v.asOfLine, v.stale);
    if (odos[key]) odos[key].setTarget(v.display, ROLL_FROM === 'previous' ? v.from : null);
  }
  /* Applies the whole feed; the "Checked" line is shown only when every rate validated. */
  function applyFeed(d) {
    var views = {}, ok = true;
    KEYS.forEach(function (k) { views[k] = readRate(k, d.rates[k], Array.isArray(d.stale) ? d.stale : []); if (!views[k]) ok = false; });
    KEYS.forEach(function (k) { if (views[k]) applyView(k, views[k]); });
    var upd = $('rates-updated');
    if (upd) {
      var label = upd.querySelector('.upd-t') || upd;
      /* the check time: "31 Oct 2026" from the ISO `updated` stamp (same date style as the rate lines), else updated_display */
      var checked = typeof d.updated === 'string' ? fmtDate(d.updated.slice(0, 10)) : '';
      if (!checked && typeof d.updated_display === 'string' && RE_LONG_DATE.test(d.updated_display)) checked = d.updated_display;
      if (ok && checked) { label.textContent = 'Checked ' + checked; upd.hidden = false; upd.classList.add('is-live'); }
      else { upd.hidden = true; upd.classList.remove('is-live'); }
    }
    var anyStale = KEYS.some(function (k) { return views[k] && views[k].stale; });
    panel.setAttribute('data-state', !ok ? 'error' : anyStale ? 'stale' : 'live');
    if (!ok && window.console) console.warn('Rates feed failed validation for one or more rates; placeholders kept.');
    return ok;
  }
  function hideUpdated() { var upd = $('rates-updated'); if (upd) { upd.hidden = true; upd.classList.remove('is-live'); } panel.setAttribute('data-state', 'error'); }

  /* ---------- apply the feed as soon as it arrives; roll once when the panel enters the viewport ---------- */
  var rolled = false;
  function rollAll(immediate) {
    KEYS.forEach(function (k, i) { if (odos[k]) odos[k].roll(immediate, 0.2 + i * 0.18); });
    panel.classList.add('is-rolled');
  }
  function settle() {
    if (feed.data) applyFeed(feed.data);
    else hideUpdated();
  }
  pending.then(function () {
    settle();                      /* start digits, chips and dates are set before anything is visible */
    if (rolled) rollAll(!motion);  /* the panel rolled on placeholders before the feed answered: roll on to the live value */
  });
  function arm() {
    if (rolled) return;
    rolled = true;
    var wait = feed.done ? Promise.resolve() : Promise.race([pending, new Promise(function (r) { setTimeout(r, 1200); })]);
    wait.then(function () { rollAll(!motion); });
  }
  if (!motion) {
    /* reduced motion: final values at once, no roll */
    rolled = true;
    pending.then(function () { rollAll(true); });
  } else {
    panel.classList.add('is-armed');
    if (window.__RATES_HOLD) { /* test hook: roll on demand via RoscapRates.roll() */ }
    else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        for (var i = 0; i < es.length; i++) if (es[i].isIntersecting) { io.disconnect(); arm(); break; }
      }, { rootMargin: '0px 0px -22% 0px' });
      io.observe(panel);
    } else arm();
  }
  window.RoscapRates = { roll: arm, feed: feed, readRate: readRate };

  /* ---------- gold wave lines: drawn once; animated only on fine-pointer devices while on screen ---------- */
  (function waves() {
    var c = panel.querySelector('canvas.waves');
    if (!c) { c = document.createElement('canvas'); c.className = 'waves'; c.setAttribute('aria-hidden', 'true'); panel.insertBefore(c, panel.firstChild); }
    var ctx = c.getContext && c.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, grad = null;
    var m = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, k: 0, tk: 0 };
    /* the edge fade (was a CSS mask) is baked into the stroke: transparent at the left, gold towards the right */
    function makeGrad() {
      var a = 105 * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
      var len = Math.abs(W * dx) + Math.abs(H * dy), cx = W / 2, cy = H / 2;
      var g = ctx.createLinearGradient(cx - dx * len / 2, cy - dy * len / 2, cx + dx * len / 2, cy + dy * len / 2);
      g.addColorStop(0, 'rgba(225,201,121,0)');
      g.addColorStop(0.18, 'rgba(225,201,121,0)');
      g.addColorStop(0.72, 'rgba(225,201,121,0.17)');
      g.addColorStop(1, 'rgba(225,201,121,0.17)');
      return g;
    }
    function draw(t) {
      var slope = -0.16, gap = 15;
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = grad || 'rgba(225,201,121,0.17)';
      var lines = Math.ceil((H - slope * W + 60) / gap);
      for (var i = 0; i < lines; i++) {
        var base = i * gap - 30;
        ctx.beginPath();
        for (var x = 0; x <= W + 12; x += 12) {
          var y = base + slope * x + Math.sin(x * 0.0062 + t * 0.00042 + i * 0.33) * 13 + Math.sin(x * 0.014 - t * 0.0003 + i * 0.11) * 5;
          if (m.k > 0.01) { var dx = x - m.x, dy = y - m.y; var g = Math.exp(-(dx * dx) / 36000 - (dy * dy) / 14000) * m.k; y += (dy >= 0 ? 1 : -1) * g * 38; }
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    function size() {
      var r = panel.getBoundingClientRect();
      if (!r.width) return;
      W = r.width; H = r.height;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      grad = makeGrad();
      draw(0);
    }
    var resizeTimer;
    var onResize = function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(size, 120); };
    size();
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(panel); else window.addEventListener('resize', onResize);

    /* animation: fine pointers only, 30 fps, while on screen, and stops after 8 s without pointer movement */
    var onScreen = false, running = false, lastDraw = 0, lastActive = 0, IDLE_MS = 8000, FRAME_MS = 1000 / 30;
    function loop(now) {
      if (!onScreen || !W || now - lastActive > IDLE_MS) { running = false; return; }
      if (now - lastDraw >= FRAME_MS) {
        lastDraw = now;
        m.x += (m.tx - m.x) * 0.2; m.y += (m.ty - m.y) * 0.2; m.k += (m.tk - m.k) * 0.12;
        draw(now);
      }
      requestAnimationFrame(loop);
    }
    function start() { lastActive = performance.now(); if (running) return; running = true; requestAnimationFrame(loop); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        onScreen = es[0].isIntersecting;
        panel.classList.toggle('is-on', onScreen);
        if (onScreen && motion && finePointer) start();
      }).observe(panel);
    } else { panel.classList.add('is-on'); }
    if (!(motion && finePointer)) return;
    panel.addEventListener('pointermove', function (e) {
      var r = panel.getBoundingClientRect();
      m.tx = e.clientX - r.left; m.ty = e.clientY - r.top; m.tk = 1;
      if (m.x < -9e3) { m.x = m.tx; m.y = m.ty; }
      if (onScreen) start();
    });
    panel.addEventListener('pointerleave', function () { m.tk = 0; });
  })();
})();
