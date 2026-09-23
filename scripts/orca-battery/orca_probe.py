"""Authenticated ORCA SSE probe: measures time-to-first-status, first token, complete."""
import json, sys, time, urllib.request

env = {}
for line in open('/Users/edu/Desktop/Sonar/sonar-1/.env.local'):
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1); env[k] = v
SB = env['SUPABASE_URL'].rstrip('/'); SRK = env['SUPABASE_SERVICE_ROLE_KEY']
ANON = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']


def get_jwt():
    req = urllib.request.Request(
        f'{SB}/auth/v1/admin/generate_link',
        data=json.dumps({'type': 'magiclink', 'email': 'eduardosanchez4848@gmail.com'}).encode(),
        headers={'apikey': SRK, 'Authorization': f'Bearer {SRK}', 'Content-Type': 'application/json'})
    j = json.load(urllib.request.urlopen(req, timeout=20))
    token_hash = j.get('hashed_token') or (j.get('properties') or {}).get('hashed_token')
    req2 = urllib.request.Request(
        f'{SB}/auth/v1/verify',
        data=json.dumps({'type': 'magiclink', 'token_hash': token_hash}).encode(),
        headers={'apikey': ANON, 'Content-Type': 'application/json'})
    j2 = json.load(urllib.request.urlopen(req2, timeout=20))
    return j2['access_token']


def probe(jwt, message, label, cap=70):
    body = json.dumps({'message': message, 'session_id': f'latency-probe-{int(time.time())}'}).encode()
    req = urllib.request.Request('https://www.sonartracker.io/api/chat', data=body, headers={
        'Authorization': f'Bearer {jwt}', 'Content-Type': 'application/json', 'Accept': 'text/event-stream'})
    t0 = time.time()
    first_status = first_token = complete_t = None
    ntokens = 0
    text_len = 0
    resp_preview = ''
    try:
        with urllib.request.urlopen(req, timeout=cap) as r:
            buf = b''
            while time.time() - t0 < cap:
                chunk = r.read(1)
                if not chunk:
                    break
                buf += chunk
                while b'\n\n' in buf:
                    part, buf = buf.split(b'\n\n', 1)
                    line = part.decode(errors='replace').strip()
                    if not line.startswith('data: '):
                        continue
                    try:
                        ev = json.loads(line[6:])
                    except Exception:
                        continue
                    now = time.time() - t0
                    if ev.get('type') == 'status' and first_status is None:
                        first_status = now
                    elif ev.get('type') == 'token':
                        if first_token is None:
                            first_token = now
                        ntokens += 1
                    elif ev.get('type') == 'complete':
                        complete_t = now
                        resp_preview = (ev.get('response') or '')[:140].replace('\n', ' ')
                        text_len = len(ev.get('response') or '')
                        raise StopIteration
                    elif ev.get('type') == 'error':
                        resp_preview = f"ERROR: {ev.get('message') or ev.get('error')}"
                        raise StopIteration
    except StopIteration:
        pass
    except Exception as e:
        resp_preview = resp_preview or f'transport: {e}'
    print(f'[{label}] first_status={None if first_status is None else round(first_status, 1)}s  '
          f'first_token={None if first_token is None else round(first_token, 1)}s  '
          f'complete={None if complete_t is None else round(complete_t, 1)}s  '
          f'token_events={ntokens}  chars={text_len}')
    print(f'   preview: {resp_preview}')


if __name__ == '__main__':
    jwt = get_jwt()
    print('JWT minted OK')
    probe(jwt, sys.argv[1] if len(sys.argv) > 1 else 'What are the biggest whale moves today?',
          sys.argv[2] if len(sys.argv) > 2 else 'q1')
