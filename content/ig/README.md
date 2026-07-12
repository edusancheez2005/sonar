# Sonar IG content — templates & build

Read [`IG_CONTENT_PLAYBOOK.md`](../../IG_CONTENT_PLAYBOOK.md) at the repo root first —
it contains the full design system, prompts, data rules, and posting schedule.
This folder is the working kit.

## Quickstart

```bash
cd content/ig

# 1. (optional) refresh market data — see header of build.py for the two API
#    endpoints and the row formats expected by templates/data.js

# 2. build a self-contained page (fonts/images/data inlined)
python3 build.py templates/first8.html out.html

# 3. preview: open out.html on a phone and screenshot each 4:5 slide,
#    or render with headless Chrome:
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --window-size=520,16000 --screenshot=preview.png "file://$PWD/out.html"

# 4. PDF (one 1080x1350 page per slide):
python3 build.py templates/first8.html out-print.html --pdf
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-pdf-header-footer --virtual-time-budget=10000 \
  --print-to-pdf=posts.pdf "file://$PWD/out-print.html"
```

## Templates

| File | Contents |
|---|---|
| `templates/ig-carousels-v4.html` | 3 editorial 4-slide carousels (BTC treasury dump, ETH tokenization, Circle charter) |
| `templates/trending-pack.html` | meme single + stat single + whale-receipts carousel (Anton headlines, quote card, comment-keyword CTA) |
| `templates/first8.html` | the first 8 posts assembled in posting order (4 days × 2/day) |
| `templates/data.js` | market data consumed by the chart canvases — refresh before posting |

To make a new post, copy the closest `<section class="carousel">…</section>` block,
swap the copy/data/art, and keep every rule from the playbook (exactly 4 slides for
carousels, ≤3 chart annotations, 3-section Orca card, green/red semantics).

New art: generate with `gpt-image-1` using the prompt scaffolding in playbook §5,
drop the file in `assets/`, add a `__PLACEHOLDER__` and a line in `build.py`.
