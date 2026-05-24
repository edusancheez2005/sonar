# Workstream B — Forensic sweep (H1–H15)

Read-only diagnostic hypotheses for the production signal engine demote.
Spec: `PROMPT_SIGNAL_EXECUTION.md` §3.

## Running

Each script loads `.env.local` automatically (via `_lib.mjs`). Requires:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

```pwsh
node scripts/forensic/H8_band_distribution.mjs
node scripts/forensic/H9_buy_24h_ci.mjs
# ... etc
```

Each script:
- Writes a JSON result to `scripts/forensic/results/HX_<name>.json`.
- Appends a one-line verdict to `scripts/forensic/FINDINGS.md`.
- Prints `PASS` / `KILL` / `INCONCLUSIVE` to stdout.
- Exits 0 on success, 1 on supabase error, **2 on STUB** (not yet implemented).

## Status

| # | File | Status |
|---|---|---|
| H8  | `H8_band_distribution.mjs`  | **READY** |
| H9  | `H9_buy_24h_ci.mjs`         | **READY** |
| H4  | `H4_drop_tier4.mjs`         | stub |
| H5  | `H5_drop_tier3.mjs`         | stub |
| H1  | `H1_liquidity_strata.mjs`   | stub |
| H2  | `H2_three_tier_gate.mjs`    | stub |
| H3  | `H3_tier5_sign_flip.mjs`    | stub |
| H7  | `H7_empirical_bands.mjs`    | stub |
| H6  | `H6_logreg.py`              | stub (Python) |
| H12 | `H12_stablecoin_sign.mjs`   | stub |

Stubs implement only the header docstring + `exit 2`. The contracts are
fixed (filename, PASS/KILL/INCONCLUSIVE thresholds, output paths) — only
the body is missing.

## Day allocation (from spec)

- **Day 2 morning:** H8, H4, H5, H9
- **Day 2 afternoon:** H1, H2
- **Day 3 morning:** H3, H7
- **Day 3–4:** H6 (logistic regression)
- **Day 5:** H12 if budget remains, then write `FINDINGS_SUMMARY.md`

## Decision gate

After Day 5, aggregate per §3.4:
- **Delete** (tiers whose drop-test PASSED)
- **Recalibrate** (bands/weights whose test PASSED)
- **No-fix-found** (KILLs)

PASS overall: at least one repair lifts 24h SELL net above −5%.
KILL overall: nothing does → engine permanently demoted, all hope on Workstream C.
Either way: the diagnosis is the deliverable. Do not retreat from the demote.
