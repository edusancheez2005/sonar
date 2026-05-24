# Forensic findings (Workstream B)

This file is appended by each H-script via `appendFinding()` in `_lib.mjs`.
Each line: `**HX — title** — VERDICT — short summary _(timestamp, results/HX_<name>.json)_`

Verdicts: PASS / KILL / INCONCLUSIVE — defined per-script in the header docstring against the Opus memo §3 criteria.

After Day 5 / Day 6, summarise into `FINDINGS_SUMMARY.md` per PROMPT_SIGNAL_EXECUTION.md §3.4.

---

<!-- findings appended below this line -->
- **H8 — STRONG band distribution** — PASS — STRONG combined share = 2.97% < 5% (n=1615) — tanh saturation confirmed _(2026-05-24T17:47:17.898Z, results/H8_band_distribution.json)_
- **H9 — 24h BUY win-rate CI** — PASS — BUY 24h win=5.7% n=159, 95% CI upper=10.5% < 30% _(2026-05-24T17:47:56.724Z, results/H9_buy_24h_ci.json)_
- **H4 — Drop Tier 4** — KILL — |Δρ|=0.1148 > 0.03 (ρ_base=-0.1412 ρ_dropT4=-0.2560 n=1592) — T4 carries info _(2026-05-24T18:04:17.108Z, results/H4_drop_tier4.json)_
- **H5 — Drop Tier 3** — KILL — |Δρ|=0.1409 > 0.03 (ρ_base=-0.1412 ρ_dropT3=-0.2821 n=1592) — T3 carries info _(2026-05-24T18:04:19.907Z, results/H5_drop_tier3.json)_
- **H7 — Empirical bands** — INCONCLUSIVE — current STRONG_SELL n=47, total n=1592 insufficient _(2026-05-24T18:06:24.537Z, results/H7_empirical_bands.json)_
- **H2 — 3-tier sign-agreement gate** — PASS — 3-tier-agree lifts mean α_norm by 11.72pp (agree=-0.42, disagree=-12.14, n_a=348, n_d=1244) _(2026-05-24T18:07:11.391Z, results/H2_three_tier_gate.json)_
- **H1 — Liquidity strata** — PASS — top-2 quintile mean α_norm=0.49pp ≥ -2.0 (per-quintile means: 0.2, -0.0, -0.4, 0.6, 0.4) _(2026-05-24T18:07:48.875Z, results/H1_liquidity_strata.json)_
- **H3 — Tier 5 sign flip** — INCONCLUSIVE — tier5_score not persisted as a column on token_signals; would require schema change or top_factors JSON parsing pass to execute. Deferred — see H3 header docstring for remediation paths. _(2026-05-24T18:08:32.148Z, results/H3_tier5_sign_flip.json)_
- **H12 — Stablecoin-vs-native sign asymmetry** — INCONCLUSIVE — tier1_factors does not carry stablecoin/native flow breakdown. Requires PR-1c (writer extension) or transaction-level backfill — see H12 header for remediation paths. _(2026-05-24T18:10:10.723Z, results/H12_stablecoin_sign.json)_
