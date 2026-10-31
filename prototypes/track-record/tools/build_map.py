"""Build the light Track Record footprint map from the live SVG.
Input: the live map (https://roscap.s3.us-east-1.amazonaws.com/mapwithireee.svg, 6.66 MB).
Output: footprint-map.svg (same viewBox, colours, shapes and labels; paths simplified below a pixel;
pins redrawn from one shared symbol; popups removed, the page draws them in HTML) and map-data.json.
usage: python3 -I build_map.py live-map.svg footprint-map.svg map-data.json <folder holding simplify_map.py>"""
import re, sys, json, math
sys.path.insert(0, sys.argv[4])
from simplify_map import parse, encode  # noqa

SRC, OUT, DATA = sys.argv[1], sys.argv[2], sys.argv[3]
EPS = 0.5
s = open(SRC, encoding='utf-8').read()
ACTIVE = ['uk', 'ireland', 'france', 'spain', 'italy', 'albania', 'usa']

def group_span(src, gid):
    i = src.find('<g id="%s">' % gid)
    if i < 0: i = src.find('<g id="%s" ' % gid)
    if i < 0: return None
    depth = 0
    for m in re.finditer(r'<g[ >]|</g>', src[i:]):
        if m.group(0).startswith('<g'): depth += 1
        else:
            depth -= 1
            if depth == 0: return (i, i + m.end())
    return None

def pts_of(d):
    out = []
    for sp in parse(d): out += sp
    return out

# 1. pins: anchor (tip) and size from each live pin's marker shape ("Subtract" path)
pins = {}
for c in ACTIVE:
    a, b = group_span(s, 'pin-' + c)
    g = s[a:b]
    d = re.search(r'<path id="Subtract[^"]*" d="([^"]+)"', g).group(1)
    P = pts_of(d)
    xs = [p[0] for p in P]; ys = [p[1] for p in P]
    pins[c] = {'x': round((min(xs) + max(xs)) / 2, 1), 'tip': round(max(ys), 1), 'top': round(min(ys), 1),
               'h': round(max(ys) - min(ys), 1), 'w': round(max(xs) - min(xs), 1)}

# 2. pin artwork from the UK pin, moved so the tip sits at 0,0 (one <symbol>, used seven times)
a, b = group_span(s, 'pin-uk'); g = s[a:b]
ux, utip = pins['uk']['x'], pins['uk']['tip']
def shift_d(d, dx, dy):
    toks = re.findall(r'[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', d)
    out, cmd, k = [], None, 0
    for t in toks:
        if t.isalpha(): cmd = t; k = 0; out.append(t); continue
        v = float(t)
        if cmd in 'MLC': v = v + (dx if k % 2 == 0 else dy)
        elif cmd == 'H': v += dx
        elif cmd == 'V': v += dy
        k += 1
        out.append(('%.2f' % v).rstrip('0').rstrip('.'))
    return re.sub(r' ?([A-Za-z]) ?', r'\1', ' '.join(out))
marker = re.search(r'<path id="Subtract_6" d="([^"]+)"', g).group(1)
logo = re.findall(r'<path d="([^"]+)" fill="url\(#paint2[0-2]_linear_479_1954\)"', g)
circ = re.search(r'<circle[^>]*cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"', g)
sym = ('<symbol id="fp-pin" overflow="visible">'
       '<path d="%s" fill="url(#fp-gold)"/>' % shift_d(marker, -ux, -utip) +
       '<circle cx="%.2f" cy="%.2f" r="%.2f" fill="#034C4F"/>' % (float(circ.group(1)) - ux, float(circ.group(2)) - utip, float(circ.group(3))) +
       ''.join('<path d="%s" fill="url(#fp-gold)"/>' % shift_d(d, -ux, -utip) for d in logo) +
       '</symbol>')

# 3. drop pins and popups from the map body
for c in ACTIVE:
    for pre in ('popup-', 'pin-'):
        sp = group_span(s, pre + c)
        if sp: s = s[:sp[0]] + s[sp[1]:]
# drop the old gradient defs (only pins and popups used them)
s = re.sub(r'<linearGradient id="paint\d+_linear_479_1954".*?</linearGradient>\s*', '', s, flags=re.S)

# 4. simplify every remaining path
def simp(m):
    enc = encode(parse(m.group(2)), EPS)
    return ('<path' + m.group(1) + ' d="' + enc + '"' + m.group(3) + '>') if enc else ''
s = re.sub(r'<path([^>]*?) d="([^"]+)"([^>]*)>', simp, s)

# 5. Balearic islands: six loose teal paths south-east of Spain belong to Spain
loose = ['Vector', 'Vector_3', 'Vector_12', 'Vector_58', 'Vector_59', 'Vector_60']
moved = []
for lid in loose:
    m = re.search(r'<path id="%s" d="[^"]+"[^>]*/>\s*' % re.escape(lid), s)
    if m and '#034C4F' in m.group(0):
        moved.append(m.group(0).strip()); s = s[:m.start()] + s[m.end():]
m = re.search(r'<path id="spain" d="[^"]+"[^>]*/>', s)
s = s[:m.start()] + '<g id="spain">' + m.group(0).replace('id="spain" ', '') + ''.join(moved) + '</g>' + s[m.end():]
for c in ('france', 'albania'):
    m = re.search(r'<path id="%s" d="[^"]+"[^>]*/>' % c, s)
    s = s[:m.start()] + '<g id="%s">' % c + m.group(0).replace('id="%s" ' % c, '') + '</g>' + s[m.end():]

# 6. classes: active countries, their teal paths, their labels; ids namespaced so they never clash on the page
for c in ACTIVE:
    s = s.replace('<g id="%s">' % c, '<g id="fp-%s" class="fp-c" data-c="%s">' % (c, c), 1)
s = s.replace('fill="#034C4F"', 'class="fp-t" fill="#034C4F"')
labs = {'FRANCE': 'france', 'SPAIN': 'spain', 'ITALY': 'italy', 'IRELAND': 'ireland', 'UNITED': 'uk', 'KINGDOM': 'uk', 'Albania': 'albania', 'USA': 'usa'}
def lab(m):
    tid = m.group(1)
    if tid in labs: return '<text class="fp-lab fp-lab-a" data-c="%s"' % labs[tid]
    return '<text class="fp-lab"'
s = re.sub(r'<text id="([^"]+)"', lab, s)
# strip Figma ids (dozens of "Vector_12" style ids that would pollute the page), keep fp-* and clip ids
s = re.sub(r' id="(?!fp-|clip)[^"]*"', '', s)
s = s.replace('xml:space="preserve" style="white-space: pre" ', '')
s = s.replace('letter-spacing="0em"', '')
# 7. root: responsive, decorative (the country list under the map carries the information)
s = re.sub(r'<svg width="1389" height="606" viewBox="0 0 1389 606" fill="none"',
           '<svg class="fp-svg" width="1389" height="606" viewBox="0 0 1389 606" fill="none" aria-hidden="true" focusable="false"', s, count=1)
defs = ('<linearGradient id="fp-gold" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFEBAA"/><stop offset="1" stop-color="#E1C979"/></linearGradient>' + sym)
s = s.replace('<defs>', '<defs>' + defs, 1)
# 8. pins layer on top: one <use> per country, scaled to the live pin size, inner group animates
scale_ref = pins['uk']['h']
layer = '<g class="fp-pins" opacity="0">'  # hidden in the file itself; the page shows one pin at a time, on hover
for c in ACTIVE:
    p = pins[c]; k = round(p['h'] / scale_ref, 3)
    layer += ('<g class="fp-pin" data-c="%s" data-x="%s" data-top="%s" transform="translate(%s %s) scale(%s)">'
              '<ellipse class="fp-ring" cx="0" cy="-1" rx="9" ry="3.2"/><g class="fp-pin-i"><use href="#fp-pin"/></g></g>'
              % (c, p['x'], p['top'], p['x'], p['tip'], k))
layer += '</g>'
s = s.replace('</svg>', layer + '</svg>')
s = re.sub(r'\n\s*', '', s)
s = re.sub(r'\s+/>', '/>', s)
s = re.sub(r'  +', ' ', s)
open(OUT, 'w', encoding='utf-8').write(s)
json.dump({'viewBox': [1389, 606], 'pins': pins}, open(DATA, 'w'), indent=1)
print(len(s), {c: pins[c] for c in ACTIVE})
