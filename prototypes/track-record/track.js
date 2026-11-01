/* Roscap prototype: Track Record page behaviour. No libraries.
   Progressive enhancement only: without JS the static map (noscript) and all 22 cards show. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 0. Live behaviour replica (a Webflow interaction that already exists on live; nothing to build):
     every .section slides in once as it enters. The CSS keeps the map and deals sections still. */
  (function () {
    var els = $$('.section');
    if (reduce || !hasIO) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ===== FOOTPRINT MAP START (paste-ready, see HANDOFF.md section 1) ===== */
  var fp = document.getElementById('footprint');
  if (fp) (function () {
    var box = $('.fp-map', fp), pop = $('.fp-pop', fp), popV = $('.fp-pop-v', fp);
    /* the figures live in a list that only screen readers get (the map is a picture to them); its order is the entrance order */
    var items = $$('.fp-sr li', fp);
    var ORDER = items.map(function (li) { return li.getAttribute('data-c'); });
    var STEP = 150, ATLANTIC = 250;  /* ms between countries; the USA waits a little longer, it is across the Atlantic */
    var svg = null, W = 1389, H = 606, pins = {}, on = null, pinned = null, started = false;
    var itemOf = function (c) { return $('.fp-sr li[data-c="' + c + '"]', fp); };

    function show(c) {
      if (c === on) return;
      on = c;
      $$('.is-on', fp).forEach(function (el) { if (el !== pop) el.classList.remove('is-on'); });
      fp.classList.toggle('has-on', !!c);
      if (!c) { pop.classList.remove('is-on', 'is-moving'); return; }
      /* the country, its name and its pin (hidden until now) */
      $$('[data-c="' + c + '"]', fp).forEach(function (el) { el.classList.add('is-on'); });
      var p = pins[c];
      if (!p) return;
      var glide = pop.classList.contains('is-on');
      pop.classList.toggle('no-glide', !glide);  /* first appearance: rise in over the pin, just after it lands */
      pop.classList.toggle('is-moving', glide);  /* already showing: glide across to the next country */
      pop.style.left = (p.x / W * 100) + '%';
      pop.style.top = (p.top / H * 100) + '%';
      popV.textContent = itemOf(c).getAttribute('data-n');
      void pop.offsetWidth;
      pop.classList.add('is-on');
    }
    /* pointer hover: going from one country to the next across a border or a strip of sea, the label glides across
       instead of blinking off; it only goes once the pointer has been off every country for 160 ms */
    var hideT = null;
    function hoverTo(c) {
      clearTimeout(hideT);
      if (c) show(c);
      else hideT = setTimeout(function () { show(pinned); }, 160);
    }
    function pin(c) {  /* tap or click: the country stays shown until tapped again, another is tapped, or Escape */
      pinned = c;
      show(c);
    }
    function start() {
      if (started) return;
      started = true;
      requestAnimationFrame(function () { requestAnimationFrame(function () { fp.classList.add('is-in'); }); });
      var total = (ORDER.length - 1) * STEP + ATLANTIC + 1500;
      setTimeout(function () { fp.classList.add('fp-done'); }, total);
    }

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (pinned || on)) { pin(null); } });

    function setup() {
      var vb = svg.viewBox && svg.viewBox.baseVal;
      if (vb && vb.width) { W = vb.width; H = vb.height; }
      $$('.fp-pin', svg).forEach(function (g) {
        pins[g.getAttribute('data-c')] = { x: +g.getAttribute('data-x'), top: +g.getAttribute('data-top') };
      });
      ORDER.forEach(function (c, i) {
        var d = (i * STEP + (c === 'usa' ? ATLANTIC : 0)) + 'ms';
        $$('[data-c="' + c + '"]', fp).forEach(function (el) { el.style.setProperty('--d', d); });
      });
      /* hover and tap on the map itself */
      svg.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var g = e.target.closest ? e.target.closest('[data-c]') : null; /* a country, its label or its pin */
        hoverTo(g ? g.getAttribute('data-c') : null);
      });
      svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hoverTo(null); });
      svg.addEventListener('click', function (e) {
        var g = e.target.closest ? e.target.closest('[data-c]') : null;
        var c = g ? g.getAttribute('data-c') : null;
        pin(c && c !== pinned ? c : null);
      });
      /* entrance: armed only when motion is allowed; plays once when a third of the map is on screen
         (or straight away if the visitor has already scrolled past it) */
      if (!reduce && hasIO) {
        fp.classList.add('fp-armed');
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if ((e.isIntersecting && e.intersectionRatio >= 0.33) || e.boundingClientRect.bottom < 0) { io.disconnect(); start(); }
          });
        }, { threshold: [0, 0.33, 0.66] });
        io.observe(box);
      }
    }
    function fallback(url) {
      var img = new Image();
      img.className = 'fp-svg'; img.alt = ''; img.width = 1389; img.height = 606; img.src = url;
      box.insertBefore(img, box.firstChild);
    }
    function load() {
      var url = box.getAttribute('data-img');
      if (!url) return;
      if (!window.fetch) { fallback(url); return; }
      fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (txt) {
        var holder = document.createElement('div');
        holder.innerHTML = txt;
        svg = holder.querySelector('svg');
        if (!svg) throw new Error('no svg');
        box.insertBefore(svg, box.firstChild);
        setup();
      }).catch(function () { fallback(url); });
    }
    /* fetch the map when it is near (about a screen away), not with the page */
    if (hasIO) {
      var near = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { near.disconnect(); load(); }
      }, { rootMargin: '900px 0px' });
      near.observe(box);
    } else load();
  })();
  /* ===== FOOTPRINT MAP END ===== */

  /* ===== SELECTED TRANSACTIONS START (paste-ready, see HANDOFF.md section 2) ===== */
  var deals = document.getElementById('deals');
  if (deals) (function () {
    var grid = $('.deal-grid', deals), cards = $$('.deal', grid), btns = $$('.deal-f', deals);
    var more = $('.deal-more', deals), status = $('.deal-status', deals);
    var phone = window.matchMedia('(max-width: 767px)');
    var region = 'all', expanded = false, timer = null;
    var motion = !reduce && hasIO && typeof Element.prototype.animate === 'function';
    var limit = function () { return phone.matches ? 4 : 6; };
    /* region from the CMS field if the item carries one (data-region), otherwise from the location line:
       "..., UK" or "London" is UK, "..., USA" is North America, everything else is Europe */
    cards.forEach(function (c) {
      if (c.getAttribute('data-region')) return;
      var loc = (($('.st-loc', c) || c).textContent || '').trim();
      c.setAttribute('data-region', /(,\s*UK|London)$/.test(loc) ? 'uk' : /,\s*USA$/.test(loc) ? 'na' : 'europe');
    });
    var matches = function (c) { return region === 'all' || c.getAttribute('data-region') === region; };

    function wanted() {
      var n = 0, L = limit();
      return cards.map(function (c) { var m = matches(c); if (m) n++; return m && (expanded || n <= L); });
    }
    function render() {
      var w = wanted(), total = cards.filter(matches).length;
      cards.forEach(function (c, i) { c.hidden = !w[i]; });
      more.hidden = total <= limit();
      more.textContent = expanded ? 'Show fewer' : 'View all transactions';
      more.setAttribute('aria-expanded', String(expanded));
    }
    function announce() {
      var shown = cards.filter(function (c) { return !c.hidden; }).length, total = cards.filter(matches).length;
      status.textContent = shown + ' of ' + total + ' transactions shown';
    }

    /* cards that come into view together fade up one after another, 90 ms apart */
    if (motion) {
      deals.classList.add('deals-armed');
      var rio = new IntersectionObserver(function (entries) {
        entries.filter(function (e) { return e.isIntersecting; })
          .map(function (e) { return e.target; })
          .sort(function (a, b) { return cards.indexOf(a) - cards.indexOf(b); })
          .forEach(function (c, i) { c.style.setProperty('--d', (i * 90) + 'ms'); c.classList.add('is-in'); rio.unobserve(c); });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
      cards.forEach(function (c) { rio.observe(c); });
    } else cards.forEach(function (c) { c.classList.add('is-in'); });

    /* filter: the cards that stay glide to their new places, the new ones fade in (FLIP with the Web Animations API) */
    function change(mutate) {
      var before = new Map();
      cards.forEach(function (c) { if (!c.hidden) before.set(c, c.getBoundingClientRect()); });
      mutate();
      var next = wanted();
      var leaving = cards.filter(function (c, i) { return !c.hidden && !next[i]; });
      var entering = cards.filter(function (c, i) { return c.hidden && next[i]; });
      if (!motion) { render(); announce(); return; }
      clearTimeout(timer);
      cards.forEach(function (c) { c.getAnimations().forEach(function (a) { a.cancel(); }); });
      var outs = leaving.map(function (c) {
        return c.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
      });
      timer = setTimeout(function () {
        render();
        outs.forEach(function (a) { a.cancel(); });
        cards.forEach(function (c) {
          if (c.hidden || !before.has(c)) return;
          var a = before.get(c), b = c.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
          c.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)' });
        });
        /* new cards already seen once fade up here; cards never seen yet are revealed by the scroll reveal above */
        entering.filter(function (c) { return c.classList.contains('is-in'); }).forEach(function (c, i) {
          c.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
            { duration: 560, delay: 90 + i * 60, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
        });
        announce();
      }, leaving.length ? 180 : 0);
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var r = b.getAttribute('data-f');
        if (r === region) return;
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        change(function () { region = r; expanded = false; });
      });
    });

    /* View all / Show fewer. Collapsing keeps the button where it was on screen, so the visitor is not left in the footer. */
    more.addEventListener('click', function () {
      if (!expanded) { expanded = true; render(); announce(); return; }
      var y0 = more.getBoundingClientRect().top, root = document.documentElement;
      root.style.overflowAnchor = 'none';
      expanded = false; render(); announce();
      window.scrollBy(0, more.getBoundingClientRect().top - y0);
      root.style.overflowAnchor = '';
    });
    var onBp = function () { render(); };
    if (phone.addEventListener) phone.addEventListener('change', onBp); else if (phone.addListener) phone.addListener(onBp);

    render();
    deals.classList.add('js-ready');
  })();
  /* ===== SELECTED TRANSACTIONS END ===== */
})();
