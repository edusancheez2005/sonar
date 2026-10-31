/* Roscap prototype: Partner Program page behaviour.
   No libraries. Everything here is progressive enhancement: without JS the page is fully readable and static. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* hero entrance: one class on load; CSS does the rest (and nothing under reduced motion) */
  var loaded = function () { root.classList.add('is-loaded'); };
  if (document.readyState === 'complete') loaded(); else window.addEventListener('load', loaded);
  setTimeout(loaded, 900); /* never wait on a slow image */

  /* reveals: section blocks (.rv) and timeline steps (.step, fallback for browsers without scroll-driven animations) */
  var revealables = $$('.rv').concat($$('.step'));
  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* sticky step indicator: highlight the step nearest the middle of the viewport */
  var steps = $$('.step');
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
    if ('IntersectionObserver' in window) {
      var current = null;
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) current = e.target.id; });
        if (current) setActive(current);
      }, { rootMargin: '-40% 0px -45% 0px', threshold: 0 });
      steps.forEach(function (s) { io2.observe(s); });
    }
    setActive(steps[0].id);
  }

  /* brochure links: tick the checkbox, then let the anchor scroll to the form */
  var brochure = $('#pf-brochure');
  $$('[data-brochure]').forEach(function (a) {
    a.addEventListener('click', function () {
      if (brochure) brochure.checked = true;
    });
  });

  /* partner form: mock submit (data-mock). Validates with the browser, then shows the Webflow-style done state. */
  var form = $('.pform');
  if (form) {
    var done = $('.pform-done');
    var fail = $('.pform-fail');
    var doneBrochure = $('.pform-done-brochure');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        var bad = $(':invalid', form);
        if (bad && bad.focus) bad.focus();
        return;
      }
      /* honeypot filled: behave like success for the bot, send nothing */
      var hp = $('#pf-website');
      if (hp && hp.value) { form.reset(); return; }
      if (fail) fail.hidden = true;
      if (doneBrochure) doneBrochure.hidden = !(brochure && brochure.checked);
      form.hidden = true;
      if (done) { done.hidden = false; done.focus(); }
    }, true);
  }

  /* keep the nav solid when the page loads mid-way (site.js handles scroll) */
  if (window.scrollY > 40 && $('#nav')) $('#nav').classList.add('is-scrolled');
})();
