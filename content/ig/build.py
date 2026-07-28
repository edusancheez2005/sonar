#!/usr/bin/env python3
"""Build a self-contained Sonar IG content page from a template.

Inlines the Anton font, brand assets, and market data as base64 data URIs so
the output HTML works anywhere (phone, artifact, headless Chrome) with no
network access.

Usage:
  python3 build.py templates/first8.html out.html          # web/screenshot build
  python3 build.py templates/first8.html out.html --pdf    # adds print CSS for
                                                           # 1080x1350 PDF export

PDF export after --pdf build:
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless=new --no-pdf-header-footer --virtual-time-budget=10000 \
    --print-to-pdf=out.pdf "file://$PWD/out.html"

Fresh data (replace templates/data.js before building):
  BTC/ETH: https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=42
           -> rows [open, high, low, close] (floats, drop the rest)
  CRCL:    https://query1.finance.yahoo.com/v8/finance/chart/CRCL?range=1mo&interval=1d
           (browser User-Agent required) -> rows [timestamp, close]
"""
import base64, pathlib, sys, urllib.request

HERE = pathlib.Path(__file__).parent
ASSETS = HERE / "assets"
ANTON_CSS = "https://fonts.googleapis.com/css2?family=Anton"
# latin subset woff2 as served by Google Fonts (OFL licensed)
ANTON_WOFF2 = "https://fonts.gstatic.com/s/anton/v27/1Ptgg87LROyAm3Kz-C8CSKlv.woff2"

PRINT_CSS = """
<style>
@page{size:1080px 1350px;margin:0;}
html,body{margin:0;padding:0;background:#04070c;}
.app{padding:0 !important;background:none !important;min-height:0 !important;}
.wrap{max-width:none !important;margin:0 !important;}
.brandbar,h1.title,.sub,.howto,.chead,.caption,footer{display:none !important;}
.carousel{margin:0 !important;}
.slides{gap:0 !important;}
.slide{width:1080px !important;max-width:none !important;height:1350px !important;
  border-radius:0 !important;border:none !important;box-shadow:none !important;margin:0 !important;
  break-after:page;page-break-after:always;}
.big{text-shadow:none !important;}
.logoimg,.ctamid img{filter:none !important;}
.xcard,.qcard,.inset{box-shadow:none !important;}
</style>
"""

def uri(path: pathlib.Path, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"

def anton_data_uri() -> str:
    cache = HERE / ".anton-latin.woff2"
    if not cache.exists():
        req = urllib.request.Request(ANTON_WOFF2, headers={"User-Agent": "Mozilla/5.0"})
        cache.write_bytes(urllib.request.urlopen(req).read())
    return uri(cache, "font/woff2")

def main() -> None:
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    template, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    html = template.read_text()

    replacements = {
        "__ANTON__": anton_data_uri(),
        "__LOGO__": uri(ASSETS / "logo.png", "image/png"),
        "__ORCA__": uri(ASSETS / "orca-mascot.png", "image/png"),
        "__BG1__": uri(ASSETS / "hero1.jpg", "image/jpeg"),
        "__BG2__": uri(ASSETS / "hero2.jpg", "image/jpeg"),
        "__BG3__": uri(ASSETS / "hero3.jpg", "image/jpeg"),
        "__MEMEA__": uri(ASSETS / "memeA.jpg", "image/jpeg"),
        "__MEMEB__": uri(ASSETS / "memeB.jpg", "image/jpeg"),
        "__MEME7__": uri(ASSETS / "meme7.jpg", "image/jpeg"),
        "__ORCABANK__": uri(ASSETS / "orcabank.jpg", "image/jpeg"),
        "__CAPITOL__": uri(ASSETS / "hero-capitol.jpg", "image/jpeg"),
        "__WHALEOCEAN__": uri(ASSETS / "hero-whale-ocean.jpg", "image/jpeg"),
        "__BTCBULL__": uri(ASSETS / "hero-btc-bull.jpg", "image/jpeg"),
        "__MEMESOL__": uri(ASSETS / "meme-solexit.jpg", "image/jpeg"),
        "__HERORISK__": uri(ASSETS / "hero-riskoff.jpg", "image/jpeg"),
        "__HEROEXODUS__": uri(ASSETS / "hero-exodus.jpg", "image/jpeg"),
        "__HEROMSOL__": uri(ASSETS / "hero-msol.jpg", "image/jpeg"),
        "__MEMEREVOLV__": uri(ASSETS / "meme-revolving.jpg", "image/jpeg"),
        "__HERO7PENS__": uri(ASSETS / "hero-sevenpens.jpg", "image/jpeg"),
        "__MEMEPARTY__": uri(ASSETS / "meme-party.jpg", "image/jpeg"),
        "__HEROFED__": uri(ASSETS / "hero-fed.jpg", "image/jpeg"),
        "__INSETLINK__": uri(ASSETS / "inset-orcalink.jpg", "image/jpeg"),
        "__MEMEWHALESHOP__": uri(ASSETS / "meme-whaleshop.jpg", "image/jpeg"),
        "__MEMEFLINCH__": uri(ASSETS / "meme-flinch.jpg", "image/jpeg"),
        "__DATA__": (HERE / "templates" / "data.js").read_text(),
    }
    for key, value in replacements.items():
        html = html.replace(key, value)

    if "--pdf" in sys.argv:
        html = html.replace("</style>", "</style>" + PRINT_CSS, 1)

    leftover = [k for k in replacements if k in html]
    if leftover:
        sys.exit(f"unreplaced placeholders: {leftover}")
    out.write_text(html)
    print(f"wrote {out} ({len(html) // 1024} KB)")

if __name__ == "__main__":
    main()
