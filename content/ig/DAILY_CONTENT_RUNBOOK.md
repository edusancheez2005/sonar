# Daily content run — automation runbook

Executed by the scheduled Claude session each morning. Produces the day's post
pack + one Reel with zero manual steps except the final Instagram upload.
Follow `IG_CONTENT_PLAYBOOK.md` (design system, formats, §7 data integrity)
exactly. Deviating from it is how output regresses to slop.

## Inputs (all durable)

- Keys: `sonar-1/.env.local` → `OPENAI_API_KEY` (gpt-image-2), `FAL_KEY`
  (Seedance via fal.ai), Supabase keys, `CRON_SECRET`.
- Tools: `~/Desktop/Sonar/tools/` → static `ffmpeg`, `Anton-Regular.ttf`,
  reference copies of `gen_images.py` / `assemble*.sh` from the 21 Jul run.
- Templates: `content/ig/templates/` (copy the newest `pack-*.html` as base),
  built with `python3 content/ig/build.py <template> <out>`.
- Headless Chrome for slide/overlay rendering:
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new …`

## Cadence (Eduardo, 21 Jul): full Reels every OTHER day

- **Full-reel days** (odd days of the month): the complete pipeline below —
  gpt-image-2 stills → Seedance clips → assembled cinematic Reel (~$2).
- **Static days** (even days): carousel/stat/meme posts only via gpt-image-2 +
  templates — BUT still ship one **lite reel**: render the day's strongest
  slide(s) as a 6-8s vertical video with a slow ffmpeg zoompan (Ken Burns) and
  a 1.5s end card. Costs $0 (no Seedance), takes 2 min, and exists because
  static posts don't get Reels-tab distribution — this way every day has
  something that reaches non-followers.
- **Sound on reels**: bake in an OpenAI TTS voiceover when the story suits
  narration (model `gpt-4o-mini-tts`, voice `onyx`, documentary instructions —
  see `sonar-receipts-reel-VO.mp4`, 21 Jul). RULES: script must finish ≥1s
  before the video ends (TTS a draft, CHECK duration with ffmpeg, tighten and
  regenerate if long); ship BOTH versions (silent + `-VO`) so Eduardo can
  choose; trending in-app audio can still be layered over either at post
  time. Never synthesize music; never rip copyrighted tracks.
- **Every day ends with the email drop**: run
  `python3 ~/Desktop/Sonar/tools/send_daily_email.py` — uploads the day's
  files to the public bucket and emails download links + captions to
  Eduardo's gmail + KCL inboxes (Brevo). If it exits 2, BREVO_API_KEY is
  missing from .env.local — say so in the notification.

## The run (morning, ~25 min)

1. **Research** (30 min window max): WebSearch today's 2-3 crypto stories;
   pull Sonar ground truth (whale flows via Supabase REST with the $150M
   sanity cap, macro factors, Binance 7d candles for charted assets).
   Verify every number the day of posting (§7).
2. **Pick two stories**: midday = strongest news/data story (carousel or stat
   single); evening = shareable (meme single or meme Reel). Whale receipts
   with Sonar's own tape beats generic news whenever flows are interesting.
3. **Build the pack**: new `pack-YYYYMMDD` section(s) on the newest template;
   refresh `templates/data.js` candles; build HTML + PDF into
   `~/Desktop/Sonar/Content/YYYY-MM-DD/`. QA-render at
   `--force-device-scale-factor=2` before shipping (retina canvas bugs).
4. **Produce ONE Reel** (~$2/day budget): 1-2 gpt-image-2 stills in the
   playbook photo grade → Seedance i2v via fal queue (1080p, 5s) → Anton
   overlay PNGs (transparent Chrome screenshots; `-loop 1 -t 5` on every
   still overlay input or fades never appear) → ffmpeg assembly with the
   shared end card → `~/Desktop/Sonar/Reels/YYYY-MM-DD/`. QA extracted
   frames before calling it done. Reels ship silent — trending audio is
   added in the IG app at post time.
5. **Deliver**: publish/update the day's artifact with slides + captions
   (captions per playbook §8, always the WHALE keyword CTA). Write
   `CAPTIONS.md` into BOTH dated folders — the full set in
   `~/Desktop/Sonar/Content/YYYY-MM-DD/` and a reels-only copy next to the
   videos in `~/Desktop/Sonar/Reels/YYYY-MM-DD/` (Eduardo posts from the
   folder he's standing in; captions must be beside the files). Then push
   notification to Eduardo: story headlines + file paths + artifact link.
6. **Commit** new template/assets to the repo (never `.env.local`, never
   personal files — `git status` before `git add`).

## Budget & refills

~$0.25/still (gpt-image-2 high) + ~$0.62/clip (Seedance pro 5s 1080p)
≈ **$1.50-2.50/day**. fal $20 top-up ≈ 10-14 days. If a key is exhausted or
invalid, SKIP that asset class gracefully (carousel still ships — reuse
`content/ig/assets/` heroes) and say so in the notification.

## Variety system (Eduardo's rule: never the same content twice in a row)

Before choosing anything, read the last 5 days of `content/ig/daily/*.md` (the
run log each daily run appends) and actively avoid repeating:

- **Format rotation** — cycle across the week, no format on consecutive days:
  editorial carousel → whale receipts → stat single → meme single → explainer
  carousel ("what is a cloture vote / ETF flow / funding rate" — evergreen
  saves) → data leaderboard ("top 5 whale wallets this week") → poll/question
  post → **product pack** (Eduardo's favorite — see below).
- **Product-pack formats** (visual reference: the approved Batch 7 artifact,
  https://claude.ai/code/artifact/91170ea4-edff-4694-bb28-d60de9aea020 — the
  product IS the content; run at least 2 of these per week):
  1. *Divergence receipts carousel* — price says one thing, whale flows say
     the other, shown as a live product panel ("LINK fell 2.6%, whales spent
     $72M disagreeing"). Data from the public endpoints
     (`/api/whales/leaderboard`, `/api/v1/tokens/{sym}/whale-activity`).
  2. *Ask-Orca chat tile* — a rendered chat exchange (dark; occasionally the
     light-mode variant for grid contrast). Orca's voice: receipts, no
     advice, dry one-liners ("That's a tape. Read it.").
  3. *Live-feed tile* — timestamped whale txs as they landed.
  4. *Dashboard flex* — 4 big real numbers from 24h of tape.
  Captions for product packs point at sonartracker.io harder than usual —
  they double as product demos.
- **Typing-chat reel** ("professional product video" — Eduardo's ask): the
  Ask-Orca chat as VIDEO — messages appear one by one, Orca's reply types
  itself out character-by-character. Build: one HTML page that renders the
  chat state as a function of `?frame=N`, screenshot N=0..~80 frames with
  headless Chrome, assemble at 12-15fps with ffmpeg, add typing-dots pauses
  and the end card. $0 in API costs. Cap at ~2/week so it stays special.
- **Visual-world rotation** — never the same imagery two days running. Worlds
  to rotate: underwater/sonar · government/marble · trading floor/boardroom ·
  city night/macro · abstract data (charts as art) · illustration/mascot ·
  street-level human scenes. **The frog is capped at ~1 appearance per week**
  (Eduardo's explicit note) — memes must rotate other characters/styles:
  the orca mascot, soft-shaded illustration scenes, cinematic object shots,
  before/after chart contrasts.
- **Asset rotation** — check `content/ig/assets/`; if a hero was used in the
  last 7 days, generate a new one rather than reusing.
- **Headline pattern rotation** — don't open with the same construction two
  days in a row ("THE RECEIPTS:" is a weekly series title, not a daily one).

## Instagram growth playbook (research-backed, 2026)

- **Reels are the discovery surface; carousels are the conversion surface.**
  Reels reach non-followers; carousels earn saves/sends that convert profile
  visits into follows. Run both daily (midday static, evening Reel).
- **The first 1–1.5 seconds decide a Reel.** Open on motion or a visual
  contradiction, never a logo card. Overlay hook text must be readable on
  mute — ~85% of feed viewing is muted; captions/overlays carry the story.
- **Watch time > everything.** Target 7–15s Reels (completion + rewatch rate
  beat long Reels for small accounts). Loop-friendly endings help.
- **Sends/DM-shares are the heaviest-weighted signal** — build at least one
  post per week designed to be sent to a friend (memes, "the group chat"
  angles, sharp one-liners).
- **Comments compound**: the WHALE keyword CTA on every post; reply to every
  comment in the first hour (velocity window ~60-90 min decides distribution).
- **Caption SEO**: first line contains searchable phrasing ("bitcoin whale
  accumulation", "crypto regulation news") — IG indexes captions for search.
  5–7 hashtags, big + niche mix; hashtags matter less than keywords now.
- **Trending audio** at low volume on every Reel (added in-app at post time;
  API/auto-published Reels can't use licensed trending audio — one reason the
  final upload stays manual).
- **Consistency beats bursts**: 2/day sustained outperforms 6 posts one day
  and silence for three. Grid coherence (one design system) converts visits.
- **Series branding**: recurring intros/titles ("THE RECEIPTS", weekly
  leaderboard) train return viewers and give the algorithm a content cluster.

## Hard rules

- Real, verified numbers only; sources named on slides.
- One keyword CTA everywhere: comment "WHALE".
- Never post-process the repo's approved design system.
- If markets did nothing and no story clears the bar, ship ONE strong post
  instead of two weak ones — and say so in the notification.
- Append a short run log to `content/ig/daily/YYYY-MM-DD.md`: stories chosen,
  formats used, visual worlds used, assets created — this is what tomorrow's
  run reads to stay fresh.
