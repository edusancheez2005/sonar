/* Speak to us v2: mock form success (as Webflow does it) and one-open-at-a-time FAQ fallback.
   No libraries. Runs alongside ../shared/site.js (nav, mock forms). */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Contact form. As on live, the browser checks the required fields (Name, Email, Phone, Subject) before
        this runs. Prototype: nothing is sent. Webflow hides the form and shows its success block (.w-form-done);
        on the live site the redirect to /contact-us-success normally fires first. */
  var form = document.getElementById('wf-form-Contact-Form');
  var done = document.getElementById('form-done');
  if (form && done) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      /* On Webflow a filled honeypot ([name="website"]) drops the submission silently (see HANDOFF.md);
         a bot sees the same success state as a person, so it learns nothing. */
      var btn = form.querySelector('[type="submit"]');
      var label = btn.value;
      btn.value = btn.getAttribute('data-wait') || label;
      btn.disabled = true;
      window.setTimeout(function () {
        form.hidden = true;
        done.hidden = false;
        done.focus();
        btn.value = label;
        btn.disabled = false;
      }, reduce ? 0 : 400);
    });
  }

  /* 2. FAQ. <details name="faq"> keeps one answer open in current browsers; this covers older ones. */
  var items = Array.prototype.slice.call(document.querySelectorAll('.acc details'));
  items.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      items.forEach(function (o) { if (o !== d && o.open) o.open = false; });
    });
  });
})();
