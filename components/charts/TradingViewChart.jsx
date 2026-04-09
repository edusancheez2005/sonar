/**
 * TradingView Advanced Chart (iframe embed) + Whale Activity Companion
 * 
 * Uses TradingView's iframe URL — no external scripts, no React DOM conflicts,
 * no CSP script-src needed. Just frame-src: *.tradingview.com
 */

'use client'

import { useEffect, useRef, useState, useMemo, memo } from 'react'
import styled from 'styled-components'

const MONO = "'JetBrains Mono', 'Fira Code', monospace"

const Wrapper = styled.div`width: 100%; position: relative;`

const ChartFrame = styled.iframe`
  width: 100%;
  height: ${p => p.$height || 500}px;
  border: none;
  border-radius: 6px;
  background: #131722;
  display: block;
`

const WhaleBar = styled.div`
  display: flex; align-items: center; gap: 0.4rem; margin-top: 0.5rem;
  flex-wrap: wrap; font-family: ${MONO}; font-size: 0.65rem;
`

const WhaleToggle = styled.button`
  padding: 0.3rem 0.65rem; border-radius: 4px; cursor: pointer;
  font-family: ${MONO}; font-size: 0.65rem; font-weight: 600;
  letter-spacing: 0.3px; transition: all 0.12s ease;
  border: 1px solid ${p => p.$active ? 'rgba(255, 171, 0, 0.4)' : 'rgba(255, 255, 255, 0.06)'};
  background: ${p => p.$active ? 'rgba(255, 171, 0, 0.1)' : 'transparent'};
  color: ${p => p.$active ? '#ffab00' : '#5a6a7a'};
  &:hover { border-color: rgba(255, 171, 0, 0.3); color: #ffab00; }
`

const DayBtn = styled.button`
  padding: 0.2rem 0.45rem; border-radius: 3px; cursor: pointer;
  font-family: ${MONO}; font-size: 0.6rem; font-weight: 600;
  border: 1px solid ${p => p.$active ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255, 255, 255, 0.06)'};
  background: ${p => p.$active ? 'rgba(0, 229, 255, 0.12)' : 'transparent'};
  color: ${p => p.$active ? '#00e5ff' : '#5a6a7a'};
  &:hover { border-color: rgba(0, 229, 255, 0.3); color: #00e5ff; }
`

const Stat = styled.span`color: ${p => p.$c || '#5a6a7a'}; font-weight: 600;`

const WhaleChartBox = styled.div`
  border-radius: 6px; overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: #0a0e17; margin-top: 0.35rem;
`

const WhaleLabel = styled.div`
  display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 0.6rem;
  font-family: ${MONO}; font-size: 0.55rem; color: #5a6a7a; letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
`

const ErrorMsg = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  font-family: ${MONO}; font-size: 0.7rem; color: #5a6a7a; padding: 2rem;
  height: 500px; background: #0a0e17; border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
`

const HoverBar = styled.div`
  display: flex; gap: 0.6rem; font-family: ${MONO}; font-size: 0.6rem;
  color: #5a6a7a; padding: 0.3rem 0.6rem; flex-wrap: wrap; min-height: 1.4em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  background: rgba(0, 229, 255, 0.02);
`
const HV = styled.span`color: ${p => p.$c || '#e0e6ed'}; font-weight: 600;`

// ── TradingView symbol mapping ──────────────────────────────────────
const TV_MAP = {
  BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', BNB: 'BINANCE:BNBUSDT',
  SOL: 'BINANCE:SOLUSDT', XRP: 'BINANCE:XRPUSDT', ADA: 'BINANCE:ADAUSDT',
  DOGE: 'BINANCE:DOGEUSDT', AVAX: 'BINANCE:AVAXUSDT', DOT: 'BINANCE:DOTUSDT',
  MATIC: 'BINANCE:POLUSDT', POL: 'BINANCE:POLUSDT', LINK: 'BINANCE:LINKUSDT',
  UNI: 'BINANCE:UNIUSDT', ATOM: 'BINANCE:ATOMUSDT', LTC: 'BINANCE:LTCUSDT',
  FIL: 'BINANCE:FILUSDT', NEAR: 'BINANCE:NEARUSDT', APT: 'BINANCE:APTUSDT',
  ARB: 'BINANCE:ARBUSDT', OP: 'BINANCE:OPUSDT', AAVE: 'BINANCE:AAVEUSDT',
  MKR: 'BINANCE:MKRUSDT', CRV: 'BINANCE:CRVUSDT', SNX: 'BINANCE:SNXUSDT',
  COMP: 'BINANCE:COMPUSDT', SUSHI: 'BINANCE:SUSHIUSDT', ALGO: 'BINANCE:ALGOUSDT',
  FTM: 'BINANCE:FTMUSDT', SAND: 'BINANCE:SANDUSDT', MANA: 'BINANCE:MANAUSDT',
  AXS: 'BINANCE:AXSUSDT', GRT: 'BINANCE:GRTUSDT', SHIB: 'BINANCE:SHIBUSDT',
  PEPE: 'BINANCE:PEPEUSDT', WLD: 'BINANCE:WLDUSDT', SUI: 'BINANCE:SUIUSDT',
  SEI: 'BINANCE:SEIUSDT', TIA: 'BINANCE:TIAUSDT', INJ: 'BINANCE:INJUSDT',
  STX: 'BINANCE:STXUSDT', IMX: 'BINANCE:IMXUSDT', RENDER: 'BINANCE:RENDERUSDT',
  FET: 'BINANCE:FETUSDT', RNDR: 'BINANCE:RNDRUSDT', JUP: 'BINANCE:JUPUSDT',
  WIF: 'BINANCE:WIFUSDT', BONK: 'BINANCE:BONKUSDT', FLOKI: 'BINANCE:FLOKIUSDT',
  JASMY: 'BINANCE:JASMYUSDT', ENA: 'BINANCE:ENAUSDT', PENDLE: 'BINANCE:PENDLEUSDT',
  TAO: 'BINANCE:TAOUSDT', ONDO: 'BINANCE:ONDOUSDT', TRX: 'BINANCE:TRXUSDT',
  TON: 'OKX:TONUSDT', ETC: 'BINANCE:ETCUSDT', XLM: 'BINANCE:XLMUSDT',
  HBAR: 'BINANCE:HBARUSDT', VET: 'BINANCE:VETUSDT', ICP: 'BINANCE:ICPUSDT',
  THETA: 'BINANCE:THETAUSDT', RUNE: 'BINANCE:RUNEUSDT', ENS: 'BINANCE:ENSUSDT',
  LDO: 'BINANCE:LDOUSDT', RPL: 'BINANCE:RPLUSDT', SSV: 'BINANCE:SSVUSDT',
  GMX: 'BINANCE:GMXUSDT', DYDX: 'BINANCE:DYDXUSDT', '1INCH': 'BINANCE:1INCHUSDT',
  BAL: 'BINANCE:BALUSDT', YFI: 'BINANCE:YFIUSDT', KAS: 'BINANCE:KASUSDT',
  W: 'BINANCE:WUSDT', PYTH: 'BINANCE:PYTHUSDT', JTO: 'BINANCE:JTOUSDT',
  STRK: 'BINANCE:STRKUSDT', MANTA: 'BINANCE:MANTAUSDT', DYM: 'BINANCE:DYMUSDT',
  PIXEL: 'BINANCE:PIXELUSDT', PORTAL: 'BINANCE:PORTALUSDT', ALT: 'BINANCE:ALTUSDT',
}

function getTVSymbol(symbol) {
  return TV_MAP[(symbol || '').toUpperCase()] || `BINANCE:${(symbol || '').toUpperCase()}USDT`
}

// Build the TradingView embed iframe URL with config in hash fragment
function buildTVUrl(symbol) {
  const config = {
    symbol: getTVSymbol(symbol),
    interval: 'D',
    timezone: 'Etc/UTC',
    theme: 'dark',
    style: '1',
    locale: 'en',
    gridColor: 'rgba(255, 255, 255, 0.025)',
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: false,
    hide_volume: false,
    allow_symbol_change: false,
    calendar: false,
    backgroundColor: 'rgba(19, 23, 34, 1)',
    studies: [],
    support_host: 'https://www.tradingview.com',
  }
  return `https://s.tradingview.com/embed-widget/advanced-chart/?locale=en#${encodeURIComponent(JSON.stringify(config))}`
}

// ── Component ───────────────────────────────────────────────────────
function TradingViewChart({ symbol, height = 500 }) {
  const whaleRef = useRef(null)

  const [showWhales, setShowWhales] = useState(false)
  const [whaleData, setWhaleData] = useState([])
  const [whaleSummary, setWhaleSummary] = useState(null)
  const [whaleDays, setWhaleDays] = useState(7)
  const [lwc, setLwc] = useState(null)
  const [whaleError, setWhaleError] = useState(false)
  const [whaleLoading, setWhaleLoading] = useState(false)
  const [whaleHover, setWhaleHover] = useState(null)

  // Memoize the iframe URL so it doesn't recreate on every render
  const iframeSrc = useMemo(() => symbol ? buildTVUrl(symbol) : null, [symbol])

  // Load lightweight-charts lazily (only when whale chart shown)
  useEffect(() => {
    if (showWhales && !lwc) {
      setWhaleLoading(true)
      import('lightweight-charts').then(m => { setLwc(m); setWhaleLoading(false) }).catch(() => setWhaleLoading(false))
    }
  }, [showWhales, lwc])

  // ── Fetch whale timeseries ────────────────────────────────────────
  useEffect(() => {
    if (!symbol || !showWhales) return
    setWhaleError(false)
    fetch(`/api/whales/timeseries?symbol=${symbol}&days=${whaleDays}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(j => { setWhaleData(j.data || []); setWhaleSummary(j.summary || null) })
      .catch(() => { setWhaleData([]); setWhaleSummary(null); setWhaleError(true) })
  }, [symbol, whaleDays, showWhales])

  // ── Render whale activity chart ───────────────────────────────────
  useEffect(() => {
    const el = whaleRef.current
    if (!showWhales || !lwc || !el || whaleData.length === 0) return

    const { createChart, ColorType, CrosshairMode } = lwc
    el.innerHTML = ''

    // Build a lookup map for tooltip data
    const dataLookup = new Map()
    for (const d of whaleData) {
      dataLookup.set(d.timestamp, d)
    }

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 220,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0e17' },
        textColor: '#5a6a7a',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(0, 229, 255, 0.2)', width: 1, style: 2, labelBackgroundColor: '#0d1420' },
        horzLine: { color: 'rgba(0, 229, 255, 0.2)', width: 1, style: 2, labelBackgroundColor: '#0d1420' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        scaleMargins: { top: 0.08, bottom: 0.02 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 2,
        fixLeftEdge: true,
        barSpacing: whaleDays <= 1 ? 12 : whaleDays <= 7 ? 8 : 5,
      },
    })

    const buySeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'whale',
    })
    const buyData = dedup(
      whaleData
        .filter(x => x.buyVolume > 0)
        .map(x => ({ time: x.timestamp, value: x.buyVolume, color: 'rgba(0, 230, 118, 0.55)' }))
    )
    if (buyData.length) buySeries.setData(buyData)

    const sellSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'whale',
    })
    const sellData = dedup(
      whaleData
        .filter(x => x.sellVolume > 0)
        .map(x => ({ time: x.timestamp, value: -x.sellVolume, color: 'rgba(255, 23, 68, 0.50)' }))
    )
    if (sellData.length) sellSeries.setData(sellData)

    // ── Crosshair tooltip ─────────────────────────────────────────
    chart.subscribeCrosshairMove(param => {
      if (!param.time) { setWhaleHover(null); return }
      const d = dataLookup.get(param.time)
      if (!d) { setWhaleHover(null); return }
      const total = (d.buyVolume || 0) + (d.sellVolume || 0)
      const buyPct = total > 0 ? ((d.buyVolume || 0) / total * 100).toFixed(1) : '0'
      const net = (d.buyVolume || 0) - (d.sellVolume || 0)
      setWhaleHover({
        time: new Date(param.time * 1000).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        buyVol: d.buyVolume || 0,
        sellVol: d.sellVolume || 0,
        buyCount: d.buyCount || 0,
        sellCount: d.sellCount || 0,
        buyPct,
        net,
        total,
      })
    })

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(entries => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width })
    })
    ro.observe(el)

    return () => { ro.disconnect(); chart.remove() }
  }, [lwc, whaleData, showWhales, whaleDays])

  // ── Helpers ───────────────────────────────────────────────────────
  const fV = v => {
    if (v == null) return '—'
    const a = Math.abs(v)
    if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
    if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
    if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
    return `$${v.toFixed(0)}`
  }

  function dedup(arr) {
    const seen = new Set()
    return arr
      .filter(d => { if (seen.has(d.time)) return false; seen.add(d.time); return true })
      .sort((a, b) => a.time - b.time)
  }

  // ── Render ────────────────────────────────────────────────────────
  if (!symbol) return <ErrorMsg>No token symbol provided</ErrorMsg>

  return (
    <Wrapper>
      {/* ─── TradingView Chart via iframe (no scripts, no DOM conflicts) ── */}
      {iframeSrc ? (
        <ChartFrame
          src={iframeSrc}
          $height={height}
          title={`${symbol} Chart`}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          loading="lazy"
          referrerPolicy="no-referrer"
          allowFullScreen
        />
      ) : (
        <ErrorMsg>Unable to load chart</ErrorMsg>
      )}

      {/* ─── Whale Activity Toggle + Mini Chart ──────────────────── */}
      <WhaleBar>
        <WhaleToggle $active={showWhales} onClick={() => setShowWhales(!showWhales)}>
          🐋 {showWhales ? 'Hide' : 'Show'} Whale Activity
        </WhaleToggle>

        {showWhales && (
          <>
            {[1, 7, 30, 90].map(d => (
              <DayBtn key={d} $active={whaleDays === d} onClick={() => setWhaleDays(d)}>
                {d === 1 ? '24H' : d === 7 ? '7D' : d === 30 ? '1M' : '3M'}
              </DayBtn>
            ))}
            {whaleSummary && (
              <>
                <Stat $c="#00e676">Buy: {fV(whaleSummary.totalBuyVolume)} ({whaleSummary.totalBuyCount})</Stat>
                <Stat $c="#ff1744">Sell: {fV(whaleSummary.totalSellVolume)} ({whaleSummary.totalSellCount})</Stat>
                <Stat $c={whaleSummary.netFlow >= 0 ? '#00e676' : '#ff1744'}>
                  Net: {whaleSummary.netFlow >= 0 ? '+' : ''}{fV(whaleSummary.netFlow)}
                </Stat>
              </>
            )}
          </>
        )}
      </WhaleBar>

      {showWhales && whaleLoading && (
        <ErrorMsg style={{ height: 'auto', padding: '1rem' }}>Loading whale chart engine...</ErrorMsg>
      )}

      {showWhales && whaleError && (
        <ErrorMsg style={{ height: 'auto', padding: '1rem' }}>⚠ Whale activity data unavailable for {symbol}</ErrorMsg>
      )}

      {showWhales && !whaleLoading && !whaleError && whaleData.length > 0 && (
        <WhaleChartBox>
          <WhaleLabel>
            <span><span style={{ color: '#00e676' }}>■</span> WHALE BUYS</span>
            <span><span style={{ color: '#ff1744' }}>■</span> WHALE SELLS</span>
          </WhaleLabel>
          {whaleHover && (
            <HoverBar>
              <span>🕐 <HV>{whaleHover.time}</HV></span>
              <span>Buy <HV $c="#00e676">{fV(whaleHover.buyVol)}</HV> <span style={{opacity:0.5}}>({whaleHover.buyCount} txs)</span></span>
              <span>Sell <HV $c="#ff1744">{fV(whaleHover.sellVol)}</HV> <span style={{opacity:0.5}}>({whaleHover.sellCount} txs)</span></span>
              <span>Net <HV $c={whaleHover.net >= 0 ? '#00e676' : '#ff1744'}>{whaleHover.net >= 0 ? '+' : ''}{fV(whaleHover.net)}</HV></span>
              <span>Buy% <HV $c={whaleHover.buyPct >= 55 ? '#00e676' : whaleHover.buyPct <= 45 ? '#ff1744' : '#ffab00'}>{whaleHover.buyPct}%</HV></span>
              <span>Total <HV>{fV(whaleHover.total)}</HV></span>
            </HoverBar>
          )}
          <div ref={whaleRef} style={{ width: '100%', height: '220px' }} />
        </WhaleChartBox>
      )}
    </Wrapper>
  )
}

export default memo(TradingViewChart)
