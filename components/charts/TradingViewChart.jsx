/**
 * TradingView Advanced Chart Widget + Whale Activity Companion
 * 
 * Main chart: Real TradingView embed (professional, real-time, all indicators/drawing tools)
 * Companion: Whale buy/sell histogram using Lightweight Charts (Sonar data)
 */

'use client'

import { useEffect, useRef, useState, memo } from 'react'
import styled from 'styled-components'

const MONO = "'JetBrains Mono', 'Fira Code', monospace"

const Wrapper = styled.div`width: 100%; position: relative;`

const TVChartBox = styled.div`
  width: 100%;
  height: ${p => p.$height || 500}px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: #0a0e17;
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

const LoadingOverlay = styled.div`
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: #0a0e17; z-index: 2; font-family: ${MONO}; font-size: 0.75rem;
  color: #5a6a7a; letter-spacing: 0.5px;
`

const ErrorMsg = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  font-family: ${MONO}; font-size: 0.7rem; color: #5a6a7a; padding: 0.5rem;
`

// ── TradingView symbol mapping ──────────────────────────────────────
const TV_MAP = {
  BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', BNB: 'BINANCE:BNBUSDT',
  SOL: 'BINANCE:SOLUSDT', XRP: 'BINANCE:XRPUSDT', ADA: 'BINANCE:ADAUSDT',
  DOGE: 'BINANCE:DOGEUSDT', AVAX: 'BINANCE:AVAXUSDT', DOT: 'BINANCE:DOTUSDT',
  MATIC: 'BINANCE:MATICUSDT', POL: 'BINANCE:POLUSDT', LINK: 'BINANCE:LINKUSDT',
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

// ── Component ───────────────────────────────────────────────────────
function TradingViewChart({ symbol, height = 500 }) {
  const tvRef = useRef(null)
  const whaleRef = useRef(null)
  const wrapRef = useRef(null)

  const [showWhales, setShowWhales] = useState(false)
  const [whaleData, setWhaleData] = useState([])
  const [whaleSummary, setWhaleSummary] = useState(null)
  const [whaleDays, setWhaleDays] = useState(7)
  const [lwc, setLwc] = useState(null)
  const [chartLoading, setChartLoading] = useState(true)
  const [chartError, setChartError] = useState(false)
  const [whaleError, setWhaleError] = useState(false)
  const [whaleLoading, setWhaleLoading] = useState(false)

  // Load lightweight-charts lazily (only when whale chart shown)
  useEffect(() => {
    if (showWhales && !lwc) {
      setWhaleLoading(true)
      import('lightweight-charts').then(m => { setLwc(m); setWhaleLoading(false) }).catch(() => setWhaleLoading(false))
    }
  }, [showWhales, lwc])

  // ── Embed TradingView Advanced Chart ──────────────────────────────
  useEffect(() => {
    const el = tvRef.current
    if (!el || !symbol) return
    setChartLoading(true)
    setChartError(false)

    // Remove previous widget safely
    if (wrapRef.current && el.contains(wrapRef.current)) {
      el.removeChild(wrapRef.current)
    }
    wrapRef.current = null

    const wrap = document.createElement('div')
    wrap.className = 'tradingview-widget-container'
    wrap.style.cssText = 'height:100%;width:100%'
    wrapRef.current = wrap

    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.cssText = 'height:calc(100% - 32px);width:100%'
    wrap.appendChild(inner)

    const script = document.createElement('script')
    script.src = 'https://s.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.onload = () => setChartLoading(false)
    script.onerror = () => { setChartLoading(false); setChartError(true) }
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: getTVSymbol(symbol),
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(10, 14, 23, 1)',
      gridColor: 'rgba(255, 255, 255, 0.025)',
      allow_symbol_change: false,
      calendar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    })
    wrap.appendChild(script)
    el.appendChild(wrap)

    return () => {
      // Safely remove the widget container without using innerHTML
      if (wrapRef.current && el.contains(wrapRef.current)) {
        try { el.removeChild(wrapRef.current) } catch {}
      }
      wrapRef.current = null
    }
  }, [symbol])

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

    const { createChart, ColorType } = lwc
    el.innerHTML = ''

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 160,
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
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: whaleDays <= 7,
        secondsVisible: false,
        rightOffset: 2,
        fixLeftEdge: true,
      },
    })

    // Buy histogram (green bars going up)
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

    // Sell histogram (red bars — negative values so bars go downward)
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
      {/* ─── Real TradingView Chart ──────────────────────────────── */}
      <TVChartBox ref={tvRef} $height={height}>
        {chartLoading && <LoadingOverlay>Loading TradingView chart...</LoadingOverlay>}
        {chartError && <LoadingOverlay>Chart unavailable — check back shortly</LoadingOverlay>}
      </TVChartBox>

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
        <ErrorMsg>Loading whale chart engine...</ErrorMsg>
      )}

      {showWhales && whaleError && (
        <ErrorMsg>⚠ Whale activity data unavailable for {symbol}</ErrorMsg>
      )}

      {showWhales && !whaleLoading && !whaleError && whaleData.length > 0 && (
        <WhaleChartBox>
          <WhaleLabel>
            <span><span style={{ color: '#00e676' }}>■</span> WHALE BUYS</span>
            <span><span style={{ color: '#ff1744' }}>■</span> WHALE SELLS</span>
          </WhaleLabel>
          <div ref={whaleRef} style={{ width: '100%', height: '160px' }} />
        </WhaleChartBox>
      )}
    </Wrapper>
  )
}

export default memo(TradingViewChart)
