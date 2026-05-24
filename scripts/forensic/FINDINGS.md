# Forensic findings (Workstream B)

This file is appended by each H-script via `appendFinding()` in `_lib.mjs`.
Each line: `**HX — title** — VERDICT — short summary _(timestamp, results/HX_<name>.json)_`

Verdicts: PASS / KILL / INCONCLUSIVE — defined per-script in the header docstring against the Opus memo §3 criteria.

After Day 5 / Day 6, summarise into `FINDINGS_SUMMARY.md` per PROMPT_SIGNAL_EXECUTION.md §3.4.

---

<!-- findings appended below this line -->
- **H8 — STRONG band distribution** — PASS — STRONG combined share = 2.97% < 5% (n=1615) — tanh saturation confirmed _(2026-05-24T17:47:17.898Z, results/H8_band_distribution.json)_
- **H9 — 24h BUY win-rate CI** — PASS — BUY 24h win=5.7% n=159, 95% CI upper=10.5% < 30% _(2026-05-24T17:47:56.724Z, results/H9_buy_24h_ci.json)_
