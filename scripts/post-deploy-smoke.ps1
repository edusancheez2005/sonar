# === Sonar post-deploy smoke test ===
# Run after Vercel redeploy with the 3 kill switches on.
# All checks should be GREEN. Any RED = halt and investigate.

$base = 'https://www.sonartracker.io'
$secret = $env:CRON_SECRET   # set this locally first; same value as Vercel

# 1. fetch-prices should now respond with providers + inserted>0
Write-Host '--- fetch-prices ---' -ForegroundColor Cyan
Invoke-RestMethod -Uri "$base/api/cron/fetch-prices" -Headers @{ Authorization = "Bearer $secret" } | ConvertTo-Json -Depth 5

# 2. accuracy endpoint should now return a freshness block
Write-Host '--- /api/signals/accuracy freshness ---' -ForegroundColor Cyan
(Invoke-RestMethod "$base/api/signals/accuracy?days=7").freshness | ConvertTo-Json -Depth 4

# 3. signals endpoint — count should be > 0 and computed_at should be < 30 min old
Write-Host '--- /api/signals freshness ---' -ForegroundColor Cyan
$sigs = Invoke-RestMethod "$base/api/signals?limit=5"
$sigs.signals | Select-Object token, signal, score, computed_at | Format-Table
