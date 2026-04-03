/**
 * TradingView-style Chart using Lightweight Charts
 * Features:
 *  - Candlestick / Line / Area price chart
 *  - Market volume histogram
 *  - Whale Buy/Sell volume overlay (Sonar data)
 *  - Timeframes: 1H, 6H, 1D, 7D, 1M, 3M, 6M, 1Y
 *  - View presets: Price, Whale Activity, Full
 *  - OHLC crosshair tooltip with whale data
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import styled from 'styled-components'

const MONO = "'JetBrains Mono', 'Fira Code', monospace"

const Wrapper = styled.div`width: 100%; position: relative;`

const ToolBar = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap;
`

const BarGroup = styled.div`display: flex; gap: 0.25rem; align-items: center; flex-wrap: wrap;`

const Divider = styled.div`
  width: 1px; height: 18px; background: rgba(255,255,255,0.06); margin: 0 0.3rem;
`

const Btn = styled.button`
  padding: 0.25rem 0.55rem; border-radius: 4px;
  border: 1px solid ${p => p.$active ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255, 255, 255, 0.06)'};
  background: ${p => p.$active ? 'rgba(0, 229, 255, 0.12)' : 'transparent'};
  color: ${p => p.$active ? '#00e5ff' : '#5a6a7a'};
  font-size: 0.65rem; font-weight: 600; font-family: ${MONO};
  letter-spacing: 0.3px; cursor: pointer; transition: all 0.12s ease;
  white-space: nowrap;
  &:hover { border-color: rgba(0, 229, 255, 0.3); color: #00e5ff; }
`

const OverlayBtn = styled(Btn)`
  border-color: ${p => p.$active ? p.$color + '66' : 'rgba(255, 255, 255, 0.06)'};
  background: ${p => p.$active ? p.$color + '1a' : 'transparent'};
  color: ${p => p.$active ? p.$color : '#5a6a7a'};
  &:hover { color: ${p => p.$color}; border-color: ${p => p.$color + '44'}; }
`

const InfoBar = styled.div`
  display: flex; gap: 0.6rem; font-family: ${MONO}; font-size: 0.6rem;
  color: #5a6a7a; padding: 0.15rem 0; flex-wrap: wrap; min-height: 1.2em;
`

const Val = styled.span`color: ${p => p.$c || '#e0e6ed'}; font-weight: 600;`

const ChartBox = styled.div`
  width: 100%; border-radius: 6px; overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06); background: #0a0e17;
`

const Loading = styled.div`
  display: flex; align-items: center; justify-content: center;
  height: 500px; font-family: ${MONO}; font-size: 0.7rem; color: #5a6a7a; background: #0a0e17;
`

const SummaryBar = styled.div`
  display: flex; gap: 0.75rem; font-family: ${MONO}; font-size: 0.6rem;
  align-items: center; flex-wrap: wrap;
`

const TIMEFRAMES = [
  { label: '1H', days: 1/24 },
  { label: '6H', days: 6/24 },
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
]

const PRICE_TYPES = [
  { label: 'Candles', value: 'candlestick' },
  { label: 'Line', value: 'line' },
  { label: 'Area', value: 'area' },
]

export default function TradingViewChart({ symbol, coingeckoId, height = 500 }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRefs = useRef({})

  const [selectedDays, setSelectedDays] = useState(7)
  const [chartType, setChartType] = useState('candlestick')
  const [activeOverlays, setActiveOverlays] = useState({ volume: true, whaleBuys: false, whaleSells: false })
  const [loading, setLoading] = useState(true)
  const [hoverInfo, setHoverInfo] = useState(null)
  const [lwc, setLwc] = useState(null)
  const [whaleData, setWhaleData] = useState([])
  const [whaleSummary, setWhaleSummary] = useState(null)

  // Load lightweight-charts dynamically
  useEffect(() => { import('lightweight-charts').then(setLwc) }, [])

  const toggleOverlay = (key) => {
    setActiveOverlays(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Create chart instance once
  useEffect(() => {
    if (!lwc || !containerRef.current) return
    const { createChart, ColorType, CrosshairMode } = lwc

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0e17' },
        textColor: '#5a6a7a',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.025)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.025)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(0, 229, 255, 0.25)', width: 1, style: 2, labelBackgroundColor: '#0d1420' },
        horzLine: { color: 'rgba(0, 229, 255, 0.25)', width: 1, style: 2, labelBackgroundColor: '#0d1420' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        scaleMargins: { top: 0.05, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 3,
      },
      handleScroll: { vertTouchDrag: false },
    })
    chartRef.current = chart

    const ro = new ResizeObserver(entries => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width })
    })
    ro.observe(containerRef.current)

    // Crosshair tooltip
    chart.subscribeCrosshairMove(param => {
      if (!param.time || !param.seriesData) { setHoverInfo(null); return }
      const info = {}
      for (const [key, series] of Object.entries(seriesRefs.current)) {
        const d = param.seriesData.get(series)
        if (!d) continue
        if (d.open !== undefined) {
          info.open = d.open; info.high = d.high; info.low = d.low; info.close = d.close
          info.change = d.close - d.open; info.changePct = (d.close - d.open) / d.open * 100
        } else if (key === 'price') info.close = d.value
        else if (key === 'volume') info.volume = d.value
        else if (key === 'whaleBuys') info.whaleBuyVol = d.value
        else if (key === 'whaleSells') info.whaleSellVol = d.value
      }
      setHoverInfo(Object.keys(info).length > 0 ? info : null)
    })

    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; seriesRefs.current = {} }
  }, [lwc, height])

  // Fetch whale data
  useEffect(() => {
    if (!symbol) return
    const d = Math.max(1, Math.ceil(selectedDays))
    fetch(`/api/whales/timeseries?symbol=${symbol}&days=${d}`)
      .then(r => r.json())
      .then(j => { setWhaleData(j.data || []); setWhaleSummary(j.summary || null) })
      .catch(() => { setWhaleData([]); setWhaleSummary(null) })
  }, [symbol, selectedDays])

  // Render all series
  useEffect(() => {
    if (!chartRef.current || !lwc) return
    renderChart()
  }, [selectedDays, chartType, activeOverlays, lwc, whaleData])

  const renderChart = useCallback(async () => {
    const chart = chartRef.current
    if (!chart || !lwc) return
    setLoading(true)

    try {
      // Clear existing series
      for (const s of Object.values(seriesRefs.current)) {
        try { chart.removeSeries(s) } catch {}
      }
      seriesRefs.current = {}

      const apiDays = Math.max(1, Math.ceil(selectedDays))
      const interval = selectedDays <= 1 ? 'hourly' : 'daily'

      const ohlcParams = new URLSearchParams({ days: String(apiDays) })
      const mcParams = new URLSearchParams({ days: String(apiDays), interval })
      if (coingeckoId) { ohlcParams.set('id', coingeckoId); mcParams.set('id', coingeckoId) }
      else { ohlcParams.set('symbol', symbol); mcParams.set('symbol', symbol) }

      const [ohlcRes, mcRes] = await Promise.all([
        fetch(`/api/coingecko/ohlc?${ohlcParams}`),
        fetch(`/api/coingecko/market-chart?${mcParams}`),
      ])

      const ohlcJson = ohlcRes.ok ? await ohlcRes.json() : null
      const mcJson = mcRes.ok ? await mcRes.json() : null

      // Time cutoff for sub-day views
      const cutoffMs = selectedDays < 1 ? Date.now() - selectedDays * 24 * 60 * 60 * 1000 : 0

      // ── MARKET VOLUME ──────────────────────
      if (activeOverlays.volume && mcJson?.data?.total_volumes) {
        const volSeries = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: 'marketVol',
        })
        volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })

        const ohlcLookup = ohlcJson ? new Map(ohlcJson.data.map(d => [Math.floor(d.timestamp / 1000), d])) : new Map()
        const volData = dedup(
          mcJson.data.total_volumes
            .filter(([ts]) => ts >= cutoffMs)
            .map(([ts, v]) => {
              const t = Math.floor(ts / 1000)
              const c = ohlcLookup.get(t)
              const up = c ? c.close >= c.open : true
              return { time: t, value: v, color: up ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 23, 68, 0.12)' }
            })
        )
        volSeries.setData(volData)
        seriesRefs.current.volume = volSeries
      }

      // ── WHALE BUY VOLUME ──────────────────────
      if (activeOverlays.whaleBuys && whaleData.length > 0) {
        const s = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: 'whaleVol',
        })
        s.priceScale().applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } })
        const d = dedup(whaleData.filter(x => x.buyVolume > 0).map(x => ({
          time: x.timestamp, value: x.buyVolume, color: 'rgba(0, 230, 118, 0.5)',
        })))
        if (d.length > 0) s.setData(d)
        seriesRefs.current.whaleBuys = s
      }

      // ── WHALE SELL VOLUME ──────────────────────
      if (activeOverlays.whaleSells && whaleData.length > 0) {
        const s = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: 'whaleVol',
        })
        s.priceScale().applyOptions({ scaleMargins: { top: 0.7, bottom: 0 } })
        const d = dedup(whaleData.filter(x => x.sellVolume > 0).map(x => ({
          time: x.timestamp, value: x.sellVolume, color: 'rgba(255, 23, 68, 0.45)',
        })))
        if (d.length > 0) s.setData(d)
        seriesRefs.current.whaleSells = s
      }

      // ── PRICE SERIES ──────────────────────
      if (ohlcJson?.data) {
        const ohlc = dedup(
          ohlcJson.data
            .filter(d => d.timestamp >= cutoffMs)
            .map(d => ({ time: Math.floor(d.timestamp / 1000), open: d.open, high: d.high, low: d.low, close: d.close }))
        )

        if (chartType === 'candlestick') {
          const s = chart.addCandlestickSeries({
            upColor: '#00e676', downColor: '#ff1744',
            borderDownColor: '#ff1744', borderUpColor: '#00e676',
            wickDownColor: 'rgba(255, 23, 68, 0.5)', wickUpColor: 'rgba(0, 230, 118, 0.5)',
          })
          s.setData(ohlc)
          seriesRefs.current.price = s
        } else if (chartType === 'line') {
          const s = chart.addLineSeries({
            color: '#00e5ff', lineWidth: 2,
            crosshairMarkerVisible: true, crosshairMarkerRadius: 3,
          })
          s.setData(ohlc.map(d => ({ time: d.time, value: d.close })))
          seriesRefs.current.price = s
        } else {
          const s = chart.addAreaSeries({
            lineColor: '#00e5ff', topColor: 'rgba(0, 229, 255, 0.18)',
            bottomColor: 'rgba(0, 229, 255, 0.01)', lineWidth: 2,
            crosshairMarkerVisible: true, crosshairMarkerRadius: 3,
          })
          s.setData(ohlc.map(d => ({ time: d.time, value: d.close })))
          seriesRefs.current.price = s
        }
      }

      chart.timeScale().applyOptions({
        timeVisible: selectedDays <= 7,
        barSpacing: selectedDays <= 0.25 ? 14 : selectedDays <= 1 ? 8 : selectedDays <= 7 ? 6 : 4,
      })
      chart.timeScale().fitContent()

    } catch (err) {
      console.error('Chart error:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDays, chartType, activeOverlays, symbol, coingeckoId, lwc, whaleData])

  function dedup(arr) {
    const seen = new Set()
    return arr.filter(d => { if (seen.has(d.time)) return false; seen.add(d.time); return true })
      .sort((a, b) => a.time - b.time)
  }

  const fP = v => { if (v == null) return '—'; if (v < 0.01) return `$${v.toFixed(6)}`; if (v < 1) return `$${v.toFixed(4)}`; return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
  const fV = v => { if (v == null) return '—'; if (v >= 1e9) return `$${(v/1e9).toFixed(2)}B`; if (v >= 1e6) return `$${(v/1e6).toFixed(2)}M`; if (v >= 1e3) return `$${(v/1e3).toFixed(0)}K`; return `$${v.toFixed(0)}` }

  const setPreset = p => {
    if (p === 'price') { setActiveOverlays({ volume: true, whaleBuys: false, whaleSells: false }); setChartType('candlestick') }
    else if (p === 'whales') { setActiveOverlays({ volume: false, whaleBuys: true, whaleSells: true }); setChartType('line') }
    else if (p === 'full') { setActiveOverlays({ volume: true, whaleBuys: true, whaleSells: true }); setChartType('candlestick') }
  }

  return (
    <Wrapper>
      {/* Row 1: Timeframes + Presets */}
      <ToolBar>
        <BarGroup>
          {TIMEFRAMES.map(tf => (
            <Btn key={tf.label} $active={selectedDays === tf.days} onClick={() => setSelectedDays(tf.days)}>{tf.label}</Btn>
          ))}
        </BarGroup>
        <BarGroup>
          <Btn onClick={() => setPreset('price')} style={{ color: '#00e5ff', borderColor: 'rgba(0,229,255,0.15)' }}>💲 Price</Btn>
          <Btn onClick={() => setPreset('whales')} style={{ color: '#ffab00', borderColor: 'rgba(255,171,0,0.15)' }}>🐋 Whales</Btn>
          <Btn onClick={() => setPreset('full')} style={{ color: '#bb86fc', borderColor: 'rgba(187,134,252,0.15)' }}>📊 Full</Btn>
        </BarGroup>
      </ToolBar>

      {/* Row 2: Chart type + Overlay toggles + Whale summary */}
      <ToolBar style={{ marginBottom: '0.35rem' }}>
        <BarGroup>
          {PRICE_TYPES.map(ct => (
            <Btn key={ct.value} $active={chartType === ct.value} onClick={() => setChartType(ct.value)}>{ct.label}</Btn>
          ))}
          <Divider />
          <OverlayBtn $active={activeOverlays.volume} $color="#00e5ff" onClick={() => toggleOverlay('volume')}>
            {activeOverlays.volume ? '✓ ' : ''}Volume
          </OverlayBtn>
          <OverlayBtn $active={activeOverlays.whaleBuys} $color="#00e676" onClick={() => toggleOverlay('whaleBuys')}>
            {activeOverlays.whaleBuys ? '✓ ' : ''}Whale Buys
          </OverlayBtn>
          <OverlayBtn $active={activeOverlays.whaleSells} $color="#ff1744" onClick={() => toggleOverlay('whaleSells')}>
            {activeOverlays.whaleSells ? '✓ ' : ''}Whale Sells
          </OverlayBtn>
        </BarGroup>
        {whaleSummary && (activeOverlays.whaleBuys || activeOverlays.whaleSells) && (
          <SummaryBar>
            <span style={{ color: '#00e676' }}>Buys: {fV(whaleSummary.totalBuyVolume)} ({whaleSummary.totalBuyCount})</span>
            <span style={{ color: '#ff1744' }}>Sells: {fV(whaleSummary.totalSellVolume)} ({whaleSummary.totalSellCount})</span>
            <span style={{ color: whaleSummary.netFlow >= 0 ? '#00e676' : '#ff1744' }}>
              Net: {whaleSummary.netFlow >= 0 ? '+' : ''}{fV(whaleSummary.netFlow)}
            </span>
          </SummaryBar>
        )}
      </ToolBar>

      {/* OHLC + whale hover info */}
      <InfoBar>
        {hoverInfo?.open != null && (
          <>
            <span>O <Val>{fP(hoverInfo.open)}</Val></span>
            <span>H <Val $c="#00e676">{fP(hoverInfo.high)}</Val></span>
            <span>L <Val $c="#ff1744">{fP(hoverInfo.low)}</Val></span>
            <span>C <Val $c={hoverInfo.change >= 0 ? '#00e676' : '#ff1744'}>{fP(hoverInfo.close)}</Val></span>
            <span><Val $c={hoverInfo.change >= 0 ? '#00e676' : '#ff1744'}>{hoverInfo.change >= 0 ? '+' : ''}{hoverInfo.changePct?.toFixed(2)}%</Val></span>
          </>
        )}
        {hoverInfo?.open == null && hoverInfo?.close != null && <span>Price <Val>{fP(hoverInfo.close)}</Val></span>}
        {hoverInfo?.volume != null && <span>Vol <Val>{fV(hoverInfo.volume)}</Val></span>}
        {hoverInfo?.whaleBuyVol != null && <span>🐋Buy <Val $c="#00e676">{fV(hoverInfo.whaleBuyVol)}</Val></span>}
        {hoverInfo?.whaleSellVol != null && <span>🐋Sell <Val $c="#ff1744">{fV(hoverInfo.whaleSellVol)}</Val></span>}
      </InfoBar>

      {/* The chart */}
      <ChartBox>
        {!lwc && <Loading>Loading chart engine...</Loading>}
        {lwc && loading && !chartRef.current && <Loading>Loading data...</Loading>}
        <div ref={containerRef} style={{ width: '100%', height: `${height}px` }} />
      </ChartBox>
    </Wrapper>
  )
}
