# ORCA answer-quality battery

46 authenticated probes against production (`/api/chat`), covering every
failure cluster from the 2026-09-22 audit plus regression paths (long-form
notes, follow-up chains, wallets, personal, compliance) and the capabilities
added on 2026-09-23.

```
cd scripts/orca-battery
python3 -u battery.py          # ~6 min at concurrency 3; writes battery_results.json
python3 split_battery.py       # writes battery_batch_*.txt for the judge workflow
```

`orca_probe.py` mints a session for the founder account via the Supabase
admin `generate_link` → `/auth/v1/verify` exchange (service key from the
repo's gitignored `.env.local`; nothing is stored).

Then run the `orca-battery-judge` workflow (see memory note
`sonar-orca-answer-quality`): 5 judges → skeptic refute of every "good" →
synthesis. Pass bar: ≥90% good+acceptable and zero regressions.

**Never deploy while the battery runs** — alias flips cut in-flight SSE
streams and look like timeouts. Re-run failures sequentially afterwards.
