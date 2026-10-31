/* Roscap Track Record: deal list with preview (approved option F).
   From 860px up the rows are tabs (role="tablist"/"tab", aria-selected, roving tabindex, arrow keys) and the
   pane is the tabpanel; hovering a row only previews it, clicking selects it. Up to 859px the list is an
   accordion: the pane sits under the open row (CSS order, no DOM move), rows are aria-expanded buttons
   controlling a region, and tapping the open row closes it.
   Rows carry the pane fields as data attributes (data-name, data-amount, data-product, data-asset, data-capital,
   data-terms, data-img, data-alt, data-w, data-h) so a Webflow Collection List can output them; rows may be
   <button> or <div role="tab" tabindex> (Enter and Space are handled here for non-buttons). */
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
  var out = { asset: document.getElementById('dl-asset'), capital: document.getElementById('dl-cap'), terms: document.getElementById('dl-terms') };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mq = window.matchMedia('(max-width: 859px)');
  var cur = Math.max(0, rows.map(function (r) { return r.getAttribute('aria-selected'); }).indexOf('true'));
  var shown = cur;   /* what the pane displays (a hover preview can differ from the selection on wide screens) */
  var open = true;   /* accordion state on small screens */
  var hoverTimer = 0, leaveTimer = 0, token = 0;

  rows.forEach(function (r, k) {
    r.parentNode.style.order = String(2 * k + 1);
    /* a CMS list cannot number its items: fill ids and the "01" counters when they are missing */
    if (!r.id) r.id = 'dl-tab-' + (k + 1);
    var n = r.querySelector('.dl-n');
    if (n && !n.textContent.trim()) n.textContent = (k + 1 < 10 ? '0' : '') + (k + 1);
  });
  if (cta) cta.style.order = '99';

  function tabsMode() { return !mq.matches; }
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
        r.removeAttribute('role');
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
    if (tabs) { open = true; if (shown !== cur) { shown = cur; render(cur, false); } }
    syncRows();
  }

  /* crossfades the photo: the new image is decoded first, then faded in over the old one */
  function swapImage(row) {
    var src = attr(row, 'img'), alt = attr(row, 'alt');
    var t = ++token;
    var current = photo.querySelector('.dl-img.is-on');
    if (current && current.getAttribute('src') === src) { current.alt = alt; return; }
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
      var olds = photo.querySelectorAll('.dl-img');
      photo.appendChild(next);
      next.alt = alt;
      next.removeAttribute('aria-hidden');
      for (var i = 0; i < olds.length; i++) { olds[i].classList.remove('is-on'); olds[i].setAttribute('aria-hidden', 'true'); olds[i].alt = ''; }
      requestAnimationFrame(function () { requestAnimationFrame(function () { next.classList.add('is-on'); }); });
      setTimeout(function () {
        for (var i = 0; i < olds.length; i++) if (olds[i].parentNode && !olds[i].classList.contains('is-on')) olds[i].parentNode.removeChild(olds[i]);
      }, reduce ? 0 : 700);
    };
    if (next.decode) next.decode().then(show, show); else if (next.complete) show(); else { next.onload = show; next.onerror = show; }
  }

  /* fills the pane from row i */
  function render(i, animate) {
    var row = rows[i];
    pane.setAttribute('aria-labelledby', row.id);
    if (out.asset) out.asset.textContent = attr(row, 'asset');
    if (out.capital) out.capital.textContent = attr(row, 'capital');
    if (out.terms) out.terms.textContent = attr(row, 'terms');
    if (heading) heading.textContent = [attr(row, 'name'), attr(row, 'amount'), attr(row, 'product')].filter(Boolean).join(', ');
    swapImage(row);
    if (animate && !reduce) { pane.classList.remove('is-swap'); void pane.offsetWidth; pane.classList.add('is-swap'); }
  }
  /* wide screens only: show a row in the pane without changing the selection */
  function preview(i) {
    if (!tabsMode() || i === shown) return;
    shown = i;
    render(i, true);
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
    render(i, changed);
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
      if (e.pointerType !== 'mouse' || !tabsMode()) return;
      clearTimeout(leaveTimer); clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { preview(i); }, 110);
    });
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
  }
})();
