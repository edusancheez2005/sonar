$ErrorActionPreference = "Continue"
if (-not $env:COLOSSEUM_COPILOT_PAT) { $env:COLOSSEUM_COPILOT_PAT = (Get-Content .env.local | Select-String '^COLOSSEUM_COPILOT_PAT=').ToString().Split('=',2)[1] }
if (-not $env:COLOSSEUM_COPILOT_API_BASE) { $env:COLOSSEUM_COPILOT_API_BASE = "https://copilot.colosseum.com/api/v1" }
$h = @{ Authorization = "Bearer $env:COLOSSEUM_COPILOT_PAT"; "Content-Type" = "application/json" }
$base = $env:COLOSSEUM_COPILOT_API_BASE
$slugs = @('pine-analytics','trenches.top','daiko','stonksbot-ai','whalewise','solsignal.xyz','mywhale','solana-watch','tokenspy','blockvision','elfa-ai','signals','trixy-see-the-moves-before-the-news','koltrackingai','solanamcp','solquery','wallet-tracker','walletsense','butter-trade','solpulse','padt.ai','flashback-ai','marketwizard','alpha-hunter-agent','cabal','max')
foreach ($s in $slugs) {
  try {
    $p = Invoke-RestMethod -Uri "$base/projects/by-slug/$s" -Headers $h -TimeoutSec 20
    $hk = if ($p.hackathon) { $p.hackathon.slug } else { "?" }
    $tr = if ($p.track) { $p.track.name } else { "?" }
    $w = if ($p.isWinner) { "[WIN]" } else { "" }
    $a = if ($p.acceleratorCohort) { "[$($p.acceleratorCohort)]" } else { "" }
    "`n--- $s ($hk/$tr) $w $a ---"
    "  name: $($p.name)"
    if ($p.tagline) { "  tagline: $($p.tagline)" }
    if ($p.description) { "  desc: " + $p.description.Substring(0,[Math]::Min(400,$p.description.Length)).Replace("`n"," ").Replace("`r"," ") }
    if ($p.techStack)  { "  tech: $($p.techStack -join ', ')" }
    if ($p.problemTags){ "  problem: $($p.problemTags -join ', ')" }
    if ($p.verticals)  { "  verticals: $($p.verticals -join ', ')" }
  } catch { "ERR $s : $($_.Exception.Message)" }
}

# Hackathon analyze: trends in "intelligence/analytics/signals" cluster
"`n`n##### ANALYZE: cypherpunk DeFi + analytics #####"
try {
  $r = Invoke-RestMethod -Uri "$base/analyze" -Headers $h -Method POST -Body (@{ hackathonSlug = "cypherpunk"; query = "whale tracker analytics signals smart money on-chain intelligence" } | ConvertTo-Json -Compress)
  $r | ConvertTo-Json -Depth 6
} catch { "ERR analyze: $($_.Exception.Message)"; $_.ErrorDetails.Message }
