/* Roscap Track Record: deal list with preview (approved option F).
   From 860px up the rows are tabs (role="tablist"/"tab", aria-selected, roving tabindex, arrow keys) and the
   pane is the tabpanel; hovering a row only previews it, clicking selects it. Up to 859px the list is an
   accordion: the pane sits under the open row (CSS order, no DOM move), rows are aria-expanded buttons
   (Div rows get role="button") controlling a region, and tapping the open row closes it.
   Rows carry the pane fields as data attributes (data-name, data-amount, data-product, data-asset, data-capital,
   data-terms, data-img, data-alt, data-w, data-h) so a Webflow Collection List can output them; rows may be
   <button> or <div role="tab" tabindex> (Enter and Space are handled here for non-buttons).
   Row 06 "All transactions" (static, after the five CMS rows) carries data-mosaic: while it is in the pane, the photo
   area shows .dl-mosaic (a second Collection List of all transactions) instead of a single photo, the pane gets
   .is-all (which swaps in the second facts card, .dl-facts.is-all) and the pane heading announces its data-label.
   The mosaic tiles are lazy images inside a display:none frame, so the browser does not fetch them with the page;
   they are switched to eager once the list is within 300px of the viewport, or on the first hover or focus of
   row 06, whichever comes first. */
(function () {
  'use strict';
  var dl = document.getElementById('dl');
  if (!dl) return;
  var list = dl.querySelector('.dl-list');
  var rows = Array.prototype.slice.call(dl.querySelectorAll('.dl-row'));
  var pane = document.getElementById('dl-pane');
  var cta = dl.querySelector('.dl-cta');
  if (!list || !rows.length || !pane) return;
  var photo = pane.querySelector('.dl-photo');
  var heading = pane.querySelector('.dl-pane-h');
  var mosaic = photo ? photo.querySelector('.dl-mosaic') : null;
  var tiles = mosaic ? Array.prototype.slice.call(mosaic.querySelectorAll('img')) : [];
  var out = { asset: document.getElementById('dl-asset'), capital: document.getElementById('dl-cap'), terms: document.getElementById('dl-terms') };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mq = window.matchMedia('(max-width: 859px)');
  var cur = Math.max(0, rows.map(function (r) { return r.getAttribute('aria-selected'); }).indexOf('true'));
  var shown = cur;   /* what the pane displays (a hover preview can differ from the selection on wide screens) */
  var open = true;   /* accordion state on small screens */
  var hoverTimer = 0, leaveTimer = 0, token = 0, woken = false;

  rows.forEach(function (r, k) {
    r.parentNode.style.order = String(2 * k + 1);
    /* a CMS list cannot number its items: fill ids and the "01" counters when they are missing */
    if (!r.id) r.id = 'dl-tab-' + (k + 1);
    var n = r.querySelector('.dl-n');
    if (n && !n.textContent.trim()) n.textContent = (k + 1 < 10 ? '0' : '') + (k + 1);
    /* Webflow wraps the CMS rows in .w-dyn-list > .w-dyn-items (role="list") while row 06 is a static sibling:
       neutral roles on those wrappers keep every row in the one tablist (or list on phones) */
    for (var el = r.parentNode.parentNode; el && el !== list && el !== dl; el = el.parentNode) el.setAttribute('role', 'none');
  });
  if (cta) cta.style.order = '99';
  if (mosaic) {
    mosaic.setAttribute('aria-hidden', 'true');
    /* a Collection List cannot give single items a class: the first two tiles get the double-width class here */
    var cells = mosaic.querySelectorAll('.dl-tile');
    if (cells.length > 1 && !mosaic.querySelector('.dl-tile.is-wide')) { cells[0].classList.add('is-wide'); cells[1].classList.add('is-wide'); }
  }

  function tabsMode() { return !mq.matches; }
  function isAll(row) { return row.hasAttribute('data-mosaic'); }
  function navH() { var n = document.getElementById('nav'); return (n ? n.offsetHeight : 72) + 16; }
  function attr(row, k) {
    var v = row.getAttribute('data-' + k) || '';
    if (v || (k !== 'img' && k !== 'alt')) return v;
    /* fallback for Webflow: a hidden <img data-pane-img> inside the row bound to the CMS photo */
    var im = row.querySelector('img[data-pane-img]');
    return im ? (k === 'img' ? (im.currentSrc || im.getAttribute('src') || '') : (im.getAttribute('alt') || '')) : '';
  }
  /* instant scroll even when the page uses scroll-behavior: smooth */
  function jump(y) {
    var root = document.documentElement, prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    root.style.scrollBehavior = prev;
  }

  /* mosaic tiles: lazy images in a display:none frame are left alone by the browser; switching them to eager
     starts the downloads (once) even before the frame is shown. Each tile fades in when it has loaded. */
  function wakeTiles() {
    if (woken || !mosaic) return;
    woken = true;
    tiles.forEach(function (im) {
      var done = function () { im.classList.add('is-loaded'); };
      if (im.complete && im.naturalWidth) done();
      else { im.addEventListener('load', done); im.addEventListener('error', done); }
      if (im.getAttribute('loading') === 'lazy') im.setAttribute('loading', 'eager');
    });
  }

  /* ---------- state to DOM ---------- */
  function syncRows() {
    var tabs = tabsMode();
    rows.forEach(function (r, k) {
      var li = r.parentNode;
      r.classList.toggle('is-active', tabs ? k === shown : (k === cur && open));
      li.classList.toggle('has-pane', !tabs && open && k === cur);
      if (tabs) {
        r.setAttribute('role', 'tab');
        r.setAttribute('aria-selected', k === cur ? 'true' : 'false');
        r.removeAttribute('aria-expanded');
        r.tabIndex = k === cur ? 0 : -1;
      } else {
        /* a <button> keeps its native role; a Webflow Div needs role="button" so aria-expanded is valid */
        if (r.tagName === 'BUTTON') r.removeAttribute('role'); else r.setAttribute('role', 'button');
        r.removeAttribute('aria-selected');
        r.setAttribute('aria-expanded', k === cur && open ? 'true' : 'false');
        r.tabIndex = 0;
      }
    });
    pane.hidden = !tabs && !open;
    pane.classList.toggle('is-last', !tabs && open && cur === rows.length - 1);
    pane.style.order = String(2 * cur + 2);
  }
  function applyRoles() {
    var tabs = tabsMode();
    list.setAttribute('role', tabs ? 'tablist' : 'list');
    if (tabs) list.setAttribute('aria-orientation', 'vertical'); else list.removeAttribute('aria-orientation');
    rows.forEach(function (r) { r.parentNode.setAttribute('role', tabs ? 'presentation' : 'listitem'); });
    pane.setAttribute('role', tabs ? 'tabpanel' : 'region');
    if (tabs) { open = true; if (shown !== cur) { shown = cur; render(cur, false, true); } }
    syncRows();
  }

  /* puts a layer (a new photo, or the mosaic) on top and fades it in; the layers under it fade out and are then
     removed (photos) or put back to display:none (the mosaic). Inactive photos are aria-hidden with an empty alt. */
  function reveal(layer) {
    var olds = Array.prototype.filter.call(photo.children, function (el) { return el !== layer && (el === mosaic || el.classList.contains('dl-img')); });
    if (photo.lastElementChild !== layer) { layer.classList.remove('is-on'); photo.appendChild(layer); }
    if (layer === mosaic) mosaic.classList.add('is-live');
    olds.forEach(function (el) { el.classList.remove('is-on'); if (el !== mosaic) { el.setAttribute('aria-hidden', 'true'); el.alt = ''; } });
    var on = function () { if (photo.lastElementChild === layer) layer.classList.add('is-on'); }; /* unless a newer layer came on top */
    if (reduce) on(); else requestAnimationFrame(function () { requestAnimationFrame(on); });
    setTimeout(function () {
      olds.forEach(function (el) {
        if (el.classList.contains('is-on') || el === photo.lastElementChild) return; /* brought back meanwhile */
        if (el === mosaic) mosaic.classList.remove('is-live');
        else if (el.parentNode) el.parentNode.removeChild(el);
      });
    }, reduce ? 0 : 700);
  }

  /* shows the row's photo (decoded first, then crossfaded over the old one) or, for row 06, the mosaic */
  function swapImage(row) {
    var t = ++token;
    if (isAll(row)) {
      if (!mosaic) return;
      wakeTiles();
      if (photo.lastElementChild !== mosaic || !mosaic.classList.contains('is-on')) reveal(mosaic);
      return;
    }
    /* phones: the frame changes ratio with the row, so the mosaic goes at once instead of fading under the photo */
    if (mosaic && !tabsMode()) mosaic.classList.remove('is-on', 'is-live');
    var src = attr(row, 'img'), alt = attr(row, 'alt');
    if (!src) return;
    var top = photo.lastElementChild;
    if (top && top.classList.contains('dl-img') && top.classList.contains('is-on') && top.getAttribute('src') === src) { top.alt = alt; return; }
    var next = document.createElement('img');
    next.className = 'dl-img';
    next.decoding = 'async';
    if (attr(row, 'w')) next.width = +attr(row, 'w');
    if (attr(row, 'h')) next.height = +attr(row, 'h');
    next.alt = '';
    next.setAttribute('aria-hidden', 'true');
    next.src = src;
    var show = function () {
      if (t !== token) return;
      next.alt = alt;
      next.removeAttribute('aria-hidden');
      reveal(next);
    };
    if (next.decode) next.decode().then(show, show); else if (next.complete) show(); else { next.onload = show; next.onerror = show; }
  }

  /* fills the pane from row i; the pane label and the polite live heading change only on a selection
     (announce = true), never on a hover preview, so screen readers are not read every row the mouse passes */
  function render(i, animate, announce) {
    var row = rows[i], all = isAll(row);
    pane.classList.toggle('is-all', all);
    if (!all) {
      if (out.asset) out.asset.textContent = attr(row, 'asset');
      if (out.capital) out.capital.textContent = attr(row, 'capital');
      if (out.terms) out.terms.textContent = attr(row, 'terms');
    }
    if (announce) {
      pane.setAttribute('aria-labelledby', row.id);
      if (heading) heading.textContent = attr(row, 'label') || [attr(row, 'name'), attr(row, 'amount'), attr(row, 'product')].filter(Boolean).join(', ');
    }
    swapImage(row);
    if (animate && !reduce) { pane.classList.remove('is-swap'); void pane.offsetWidth; pane.classList.add('is-swap'); }
  }
  /* wide screens only: show a row in the pane without changing the selection */
  function preview(i) {
    if (!tabsMode() || i === shown) return;
    shown = i;
    render(i, true, false);
    syncRows();
  }
  function select(i, opts) {
    opts = opts || {};
    var tabs = tabsMode();
    var row = rows[i];
    if (!tabs && opts.toggle && i === cur && open) { open = false; syncRows(); return; }
    var changed = i !== shown || !open;
    var before = row.getBoundingClientRect().top;
    cur = i; shown = i; open = true;
    render(i, changed, true);
    syncRows();
    if (!tabs) {
      /* the pane may have closed above this row: keep the row where the finger is, then bring it up with its photo */
      var delta = row.getBoundingClientRect().top - before;
      if (Math.abs(delta) > 1) jump(window.scrollY + delta);
      if (opts.scroll) {
        var top = row.getBoundingClientRect().top;
        if (top > window.innerHeight * 0.4 || top < navH()) window.scrollTo({ top: window.scrollY + top - navH() - 12, behavior: reduce ? 'auto' : 'smooth' });
      }
    }
  }

  /* ---------- events ---------- */
  rows.forEach(function (r, i) {
    r.addEventListener('click', function () { select(i, { scroll: true, toggle: true }); });
    r.addEventListener('pointerenter', function (e) {
      if (isAll(r)) wakeTiles();
      if (e.pointerType !== 'mouse' || !tabsMode()) return;
      clearTimeout(leaveTimer); clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { preview(i); }, 110);
    });
    if (isAll(r)) r.addEventListener('focus', wakeTiles);
    r.addEventListener('keydown', function (e) {
      var j;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (i + 1) % rows.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (i - 1 + rows.length) % rows.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = rows.length - 1;
      else if ((e.key === 'Enter' || e.key === ' ') && r.tagName !== 'BUTTON') { e.preventDefault(); select(i, { scroll: true, toggle: true }); return; }
      else return;
      if (!tabsMode()) return; /* accordion: arrows are left to the browser */
      e.preventDefault();
      rows[j].focus();
      select(j);
    });
  });
  list.addEventListener('pointerleave', function (e) {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(hoverTimer);
    leaveTimer = setTimeout(function () { preview(cur); }, 160);
  });
  var onMq = function () { applyRoles(); };
  if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  applyRoles();

  /* warm the other photos once the module is on screen, so previews do not wait on the network */
  function warm() {
    rows.forEach(function (r) { var s = attr(r, 'img'); if (!s) return; var im = new Image(); if ('fetchPriority' in im) im.fetchPriority = 'low'; im.src = s; });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); (window.requestIdleCallback || function (f) { setTimeout(f, 400); })(warm); }
    }, { rootMargin: '200px 0px' });
    io.observe(dl);
    /* the mosaic tiles: once the list is within 300px of the viewport (row 06 hover or focus also wakes them) */
    if (mosaic) {
      var tio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { tio.disconnect(); wakeTiles(); }
      }, { rootMargin: '300px 0px' });
      tio.observe(dl);
    }
  } else wakeTiles();
})();
