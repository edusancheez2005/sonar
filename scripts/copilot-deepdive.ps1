param([string]$Query = "")
$ErrorActionPreference = "Continue"
if (-not $env:COLOSSEUM_COPILOT_PAT) {
  $env:COLOSSEUM_COPILOT_PAT = (Get-Content .env.local | Select-String '^COLOSSEUM_COPILOT_PAT=').ToString().Split('=',2)[1]
}
if (-not $env:COLOSSEUM_COPILOT_API_BASE) {
  $env:COLOSSEUM_COPILOT_API_BASE = "https://copilot.colosseum.com/api/v1"
}
$h = @{ Authorization = "Bearer $env:COLOSSEUM_COPILOT_PAT"; "Content-Type" = "application/json" }
$base = $env:COLOSSEUM_COPILOT_API_BASE

function Search-Projects($q, $filters = $null, $limit = 8) {
  $body = @{ query = $q; limit = $limit }
  if ($filters) { $body.filters = $filters }
  Invoke-RestMethod -Uri "$base/search/projects" -Headers $h -Method POST -Body ($body | ConvertTo-Json -Depth 6 -Compress)
}
function Search-Archives($q, $limit = 5) {
  Invoke-RestMethod -Uri "$base/search/archives" -Headers $h -Method POST -Body (@{ query = $q; limit = $limit } | ConvertTo-Json -Compress)
}
function Show-Projects($label, $r) {
  "`n=== $label (n=$($r.results.Count)) ==="
  if (-not $r.results) { "  (no results)"; return }
  foreach ($p in $r.results | Select-Object -First 10) {
    $hk = if ($p.hackathon) { $p.hackathon.slug } else { "?" }
    $tr = if ($p.track) { $p.track.name } else { "" }
    $w  = if ($p.isWinner) { "[WIN]" } else { "" }
    $a  = if ($p.acceleratorCohort) { "[$($p.acceleratorCohort)]" } else { "" }
    $name = if ($p.name) { $p.name } else { $p.slug }
    "  [$hk/$tr] $($p.slug) -- $name $w $a"
    if ($p.tagline) { "    $($p.tagline)" }
  }
}
function Show-Archives($label, $r) {
  "`n=== ARCHIVE: $label (n=$($r.results.Count)) ==="
  if (-not $r.results) { "  (no results)"; return }
  foreach ($a in $r.results | Select-Object -First 5) {
    "  - $($a.title)  [$($a.source)]  id=$($a.documentId)"
    if ($a.snippet) { "    " + $a.snippet.Substring(0,[Math]::Min(180,$a.snippet.Length)).Replace("`n"," ") }
  }
}

# 1. PROJECT SEARCHES across Sonar's surfaces
$queries = @(
  "whale tracker on-chain intelligence dashboard",
  "smart money wallet copy trading signals",
  "AI trading signals crypto buy sell confidence",
  "social sentiment crypto Twitter influencer on-chain",
  "memecoin trading bot Solana sniper Telegram",
  "wallet tracker portfolio analytics multi-chain",
  "whale alert real time large transactions",
  "crypto news AI summarization market intelligence",
  "trader copy trading platform on-chain leaderboard",
  "MCP skill agent on-chain data API"
)
foreach ($q in $queries) {
  try { $r = Search-Projects $q; Show-Projects $q $r } catch { "ERR on '$q': $($_.Exception.Message)" }
}

# 2. ACCELERATOR + WINNER overlap (required quality check)
"`n`n##### ACCELERATOR-ONLY CHECK #####"
try { $r = Search-Projects "whale tracker on-chain analytics smart money signals" @{ acceleratorOnly = $true } 15; Show-Projects "Accelerator only" $r } catch { "ERR: $($_.Exception.Message)" }
"`n##### WINNERS-ONLY CHECK #####"
try { $r = Search-Projects "whale tracker on-chain analytics smart money signals" @{ winnersOnly = $true } 15; Show-Projects "Winners only" $r } catch { "ERR: $($_.Exception.Message)" }

# 3. ARCHIVE SEARCHES
$archiveQueries = @(
  "smart money on-chain intelligence whale behavior alpha",
  "calibrated probabilistic prediction signals trading",
  "social signals crypto influencer alpha leak",
  "information aggregation markets Hayek price discovery"
)
foreach ($q in $archiveQueries) {
  try { $r = Search-Archives $q; Show-Archives $q $r } catch { "ERR archive '$q': $($_.Exception.Message)" }
}
