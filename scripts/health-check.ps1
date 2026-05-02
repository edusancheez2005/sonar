$h = @{ Authorization = "Bearer dffe68424286373c3fd6fd52222701058c21e6b12921506c164d515776e2768b" }

Write-Output "=== fetch-prices ==="
try { Invoke-RestMethod -Uri "https://www.sonartracker.io/api/cron/fetch-prices" -Headers $h | ConvertTo-Json -Depth 3 }
catch { $_.ErrorDetails.Message }

Write-Output "`n=== compute-signals (summary) ==="
try {
    $r = Invoke-RestMethod -Uri "https://www.sonartracker.io/api/cron/compute-signals" -Headers $h
    [pscustomobject]@{
        success    = $r.success
        processed  = $r.processed
        errors     = $r.errors
        elapsed_ms = $r.elapsed_ms
    } | Format-List | Out-String
    "first 5 signals:"
    $r.signals[0..4] | Format-Table -AutoSize | Out-String
} catch { $_.ErrorDetails.Message }

Write-Output "`n=== /api/signals (first 5) ==="
$s = Invoke-RestMethod "https://www.sonartracker.io/api/signals?limit=5"
$s.signals | Select-Object token, signal, score, confidence, computed_at | Format-Table -AutoSize | Out-String

Write-Output "`n=== /api/signals/accuracy?days=1 ==="
Invoke-RestMethod "https://www.sonartracker.io/api/signals/accuracy?days=1" | ConvertTo-Json -Depth 4
