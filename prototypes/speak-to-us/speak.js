/* Speak to us prototype: reveal on scroll, accessible form validation, mock submission.
   No libraries. Works alongside ../shared/site.js (nav + footer mock). */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 1. Reveal: one gentle rise per block, once. Static when reduced motion or no IntersectionObserver. */
  var rv = $$('.rv');
  if (reduce || !('IntersectionObserver' in window)) {
    rv.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach(function (el) { io.observe(el); });
    /* anything already in view on load shows straight away */
    window.addEventListener('load', function () {
      rv.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
      });
    });
  }

  /* 2. Form validation (mirrors what Webflow's native required/type checks do, but with visible, announced errors). */
  var form = $('#wf-form-Speak-to-Us');
  if (!form) return;
  var status = $('#form-status');
  var done = $('#form-done');
  var fail = $('#form-fail');
  var attempted = false;

  var rules = [
    { id: 'f-name', label: 'Name', test: function (v) { return v.trim().length > 0 ? '' : 'Please enter your name.'; } },
    { id: 'f-email', label: 'Email', test: function (v) {
      v = v.trim();
      if (!v) return 'Please enter an email address we can reply to.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Please check the email address, for example name@company.co.uk.';
    } },
    { id: 'f-phone', label: 'Phone', test: function (v) {
      v = v.trim();
      if (!v) return '';
      var digits = v.replace(/\D/g, '');
      return digits.length >= 7 && /^[\d\s()+.-]+$/.test(v) ? '' : 'Please check the phone number, or leave it blank.';
    } },
    { id: 'f-msg', label: 'Message', test: function (v) { return v.trim().length > 0 ? '' : 'Please tell us a little about your enquiry.'; } }
  ];

  function fieldOf(rule) {
    var input = document.getElementById(rule.id);
    return { input: input, wrap: input.closest('.fld'), err: document.getElementById(rule.id.replace('f-', 'e-')) };
  }

  function setError(rule, msg) {
    var f = fieldOf(rule);
    if (msg) {
      f.wrap.classList.add('is-err');
      f.input.setAttribute('aria-invalid', 'true');
      f.err.textContent = msg;
      f.err.hidden = false;
    } else {
      f.wrap.classList.remove('is-err');
      f.input.removeAttribute('aria-invalid');
      f.err.textContent = '';
      f.err.hidden = true;
    }
  }

  function validate() {
    var bad = [];
    rules.forEach(function (rule) {
      var msg = rule.test(document.getElementById(rule.id).value || '');
      setError(rule, msg);
      if (msg) bad.push(rule);
    });
    return bad;
  }

  function joinLabels(list) {
    var names = list.map(function (r) { return r.label; });
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  /* live re-check after the first attempt, so errors clear as people fix them */
  rules.forEach(function (rule) {
    var input = document.getElementById(rule.id);
    var recheck = function () {
      if (!attempted) return;
      setError(rule, rule.test(input.value || ''));
      var left = rules.filter(function (r) { return r.test(document.getElementById(r.id).value || ''); });
      if (!left.length) { status.textContent = ''; status.classList.remove('is-on'); }
    };
    input.addEventListener('input', recheck);
    input.addEventListener('blur', recheck);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault(); /* prototype: nothing is sent */
    attempted = true;
    var bad = validate();
    if (bad.length) {
      status.innerHTML = '';
      var b = document.createElement('b');
      b.textContent = bad.length === 1 ? '1 field needs attention: ' : bad.length + ' fields need attention: ';
      status.appendChild(b);
      status.appendChild(document.createTextNode(joinLabels(bad) + '.'));
      status.classList.add('is-on');
      var first = document.getElementById(bad[0].id);
      first.focus({ preventScroll: true });
      first.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    /* honeypot filled: behave like success but do nothing (bots get no signal) */
    status.textContent = '';
    status.classList.remove('is-on');
    var btn = $('[type="submit"]', form);
    var label = btn.textContent;
    btn.textContent = btn.getAttribute('data-wait') || 'Please wait';
    btn.disabled = true;
    window.setTimeout(function () {
      form.hidden = true;
      fail.hidden = true;
      done.hidden = false;
      done.focus();
      btn.textContent = label;
      btn.disabled = false;
    }, reduce ? 0 : 450);
  });
})();
