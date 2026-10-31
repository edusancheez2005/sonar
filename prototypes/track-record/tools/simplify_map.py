"""Simplify the live Track Record map SVG (6.66 MB) into a light, animatable SVG.
Keeps the same viewBox, colours, country shapes and labels. Coordinates are reduced with
Ramer-Douglas-Peucker at a sub-pixel tolerance and written as rounded relative moves.
Pins and popups are dropped (the page draws its own, accessible ones)."""
import re, sys, json, math


tok_re = re.compile(r'[MLHVCZmlhvcz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')

def parse(d):
    toks = tok_re.findall(d)
    subs, cur, i, cmd = [], None, 0, None
    x = y = 0.0
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t; i += 1
            if cmd in 'Zz':
                if cur: subs.append(cur); cur = None
                continue
            continue
        if cmd == 'M':
            x, y = float(toks[i]), float(toks[i+1]); i += 2
            if cur: subs.append(cur)
            cur = [(x, y)]; cmd = 'L'
        elif cmd == 'L':
            x, y = float(toks[i]), float(toks[i+1]); i += 2; cur.append((x, y))
        elif cmd == 'H':
            x = float(toks[i]); i += 1; cur.append((x, y))
        elif cmd == 'V':
            y = float(toks[i]); i += 1; cur.append((x, y))
        elif cmd == 'C':
            # keep a mid point of the curve for fidelity, then the end point
            x1, y1, x2, y2, x3, y3 = map(float, toks[i:i+6]); i += 6
            px, py = cur[-1]
            t = 0.5
            mx = (1-t)**3*px + 3*(1-t)**2*t*x1 + 3*(1-t)*t**2*x2 + t**3*x3
            my = (1-t)**3*py + 3*(1-t)**2*t*y1 + 3*(1-t)*t**2*y2 + t**3*y3
            if math.hypot(x3-px, y3-py) > 2.0: cur.append((mx, my))
            x, y = x3, y3; cur.append((x, y))
        else:
            raise ValueError('unsupported ' + cmd)
    if cur: subs.append(cur)
    return subs

def rdp(pts, eps):
    if len(pts) < 3: return pts
    # iterative RDP
    keep = [False]*len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts)-1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx-ax, by-ay; L = math.hypot(dx, dy)
        dmax, idx = 0.0, -1
        for k in range(a+1, b):
            px, py = pts[k]
            d = abs(dy*px - dx*py + bx*ay - by*ax)/L if L > 1e-9 else math.hypot(px-ax, py-ay)
            if d > dmax: dmax, idx = d, k
        if dmax > eps and idx > 0:
            keep[idx] = True; stack.append((a, idx)); stack.append((idx, b))
    return [p for p, k in zip(pts, keep) if k]

def fmt(v):
    r = round(v, 1)
    if r == int(r): return str(int(r))
    s = ('%.1f' % r)
    return s.replace('0.', '.') if s.startswith('0.') else s.replace('-0.', '-.')

def encode(subs, eps):
    out = []
    for sp in subs:
        # closed ring: drop duplicate end
        if len(sp) > 2 and math.hypot(sp[0][0]-sp[-1][0], sp[0][1]-sp[-1][1]) < 1e-6: sp = sp[:-1]
        xs = [p[0] for p in sp]; ys = [p[1] for p in sp]
        if (max(xs)-min(xs)) < 0.9 and (max(ys)-min(ys)) < 0.9: continue  # sub-pixel specks
        pts = rdp(sp + [sp[0]], eps)[:-1]
        if len(pts) < 3: continue
        # quantise to 0.1 and emit relative
        q = [(round(px, 1), round(py, 1)) for px, py in pts]
        dd = ['M' + fmt(q[0][0]) + ' ' + fmt(q[0][1])]
        segs = []
        for (ax, ay), (bx, by) in zip(q, q[1:]):
            rx, ry = round(bx-ax, 1), round(by-ay, 1)
            if rx == 0 and ry == 0: continue
            segs.append(fmt(rx) + (' ' if not fmt(ry).startswith('-') else '') + fmt(ry))
        if not segs: continue
        dd.append('l' + ' '.join(segs).replace(' -', '-'))
        dd.append('z')
        out.append(''.join(dd))
    return ''.join(out)

if __name__ == '__main__':
    SRC, OUT, EPS = sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 0.35
    s = open(SRC, encoding='utf-8').read()
    stats = {'before': len(s)}
    def repl(m):
        attrs_before, d, attrs_after = m.group(1), m.group(2), m.group(3)
        try:
            enc = encode(parse(d), EPS)
        except Exception as e:
            return m.group(0)
        if not enc: return ''
        return '<path' + attrs_before + ' d="' + enc + '"' + attrs_after + '>'
    s2 = re.sub(r'<path([^>]*?) d="([^"]+)"([^>]*)>', repl, s)
    open(OUT, 'w', encoding='utf-8').write(s2)
    stats['after'] = len(s2)
    print(json.dumps(stats))
