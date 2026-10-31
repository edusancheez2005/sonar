# Footer "Cookie preferences" link (Webflow)

The Cookie Policy already says choices can be changed "using the cookie preference link in the website footer". This adds that link.

## Where
Footer Symbol (Component) > Legal column, between "Cookie Policy" and "Terms of Use". The footer is a site-wide Symbol, so one edit covers all 25 pages.

## Element
- Add a **Text Link** element (not a Button), text exactly `Cookie preferences`.
- Link settings: URL, value `#cookie-preferences`. Do not tick "open in new tab".
- Give it the same class as the other Legal links so it inherits their style, plus a combo class `cookie-preferences`.
- Custom attribute (Element settings > Custom attributes): name `data-rc`, value `open`.

The consent script listens for clicks on any element with `data-rc="open"`, opens the preferences dialog and cancels the `#cookie-preferences` jump, so the URL does not change. If the script failed to load for any reason the link is harmless: it points at an anchor that does not exist and the page stays where it is.

Rendered markup, for reference:

```html
<a class="footer-link cookie-preferences" href="#cookie-preferences" data-rc="open">Cookie preferences</a>
```

## Also exposed for other triggers
Any element can open the dialog the same way (for example a "Change your cookie choices" link inside the Cookie Policy rich text, added as an HTML Embed):

```html
<a href="#cookie-preferences" data-rc="open">Change your cookie choices</a>
```

Scripts can call `window.RoscapConsent.open()`, read the stored choice with `window.RoscapConsent.get()` (returns `{version, analytics, marketing, timestamp}` or `null`), and listen for `document.addEventListener('roscap-consent', e => e.detail)`.

## Check after publishing
1. The link appears in the Legal column on desktop and on a phone, with the same style as its neighbours.
2. Clicking it opens the dialog; Escape closes it; focus returns to the link.
3. The dialog shows "Your choice: ... Saved <date>." once a choice exists.
