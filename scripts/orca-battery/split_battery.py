import json
rows = json.load(open('battery_results.json'))
rows.sort(key=lambda r: r['id'])
batches = [rows[i:i+10] for i in range(0, len(rows), 10)]
for bi, b in enumerate(batches):
    out = []
    for r in b:
        out.append(f"CASE {r['id']}  (cluster={r['cluster']}{', chain='+r['chain'] if r.get('chain') else ''})\n"
                   f"Q: {r['message']}\nEXPECTED: {r['expect']}\n"
                   f"TIMING: first_token={r['first_token_s']}s complete={r['complete_s']}s chars={r['chars']} error={r['error']}\n"
                   f"A: {r['response'][:1800]}\n")
    open(f'battery_batch_{bi}.txt', 'w').write('\n'.join(out))
print('batches:', len(batches), 'rows:', len(rows))
