"""Snapshot the published Roscap site (production and Webflow staging) before or after a build step.

usage: python3 -I snapshot.py <out dir>

Saves, for every URL in the live sitemap plus /contact-us-success and a missing address (404):
  production/<name>.html   from https://www.roscap.co.uk
  staging/<name>.html      from https://roscap-site.webflow.io
plus the shared Webflow stylesheet of each, and manifest.json (sha256, size, Webflow "Last Published" stamp).
The custom code (site and page head/footer) is in each HTML file verbatim, so a code change can be undone
by copying the old block back. Read-only: plain GET requests, analytics not executed."""
import hashlib, json, os, re, sys, urllib.request

OUT = sys.argv[1]
HOSTS = {'production': 'https://www.roscap.co.uk', 'staging': 'https://roscap-site.webflow.io'}
UA = {'User-Agent': 'Mozilla/5.0 (compatible; roscap-snapshot/1.0)'}
here = os.path.dirname(os.path.abspath(__file__))
paths = [re.sub(r'^https://www\.roscap\.co\.uk', '', u.strip()) or '/' for u in open(os.path.join(OUT, 'urls.txt')) if u.strip()]
paths += ['/contact-us-success', '/this-page-does-not-exist']


def get(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


manifest = {}
for side, host in HOSTS.items():
    os.makedirs(os.path.join(OUT, side), exist_ok=True)
    css_done = set()
    for p in paths:
        name = 'home' if p == '/' else p.strip('/').replace('/', '__')
        status, body = get(host + p)
        open(os.path.join(OUT, side, name + '.html'), 'wb').write(body)
        text = body.decode('utf-8', 'replace')
        stamp = re.search(r'Last Published: ([^-]+?) GMT', text)
        manifest[f'{side}/{name}.html'] = {'url': host + p, 'status': status, 'bytes': len(body),
                                            'sha256': hashlib.sha256(body).hexdigest(),
                                            'last_published': stamp.group(1).strip() if stamp else None}
        for css in re.findall(r'href="(https://cdn\.prod\.website-files\.com/[^"]+\.css)"', text):
            if css in css_done:
                continue
            css_done.add(css)
            st, cb = get(css)
            fn = css.rsplit('/', 1)[1]
            open(os.path.join(OUT, side, fn), 'wb').write(cb)
            manifest[f'{side}/{fn}'] = {'url': css, 'status': st, 'bytes': len(cb), 'sha256': hashlib.sha256(cb).hexdigest()}
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
bad = {k: v['status'] for k, v in manifest.items() if v['status'] != 200 and 'this-page-does-not-exist' not in k}
print(len(manifest), 'files;', 'non-200:', bad or 'none')
