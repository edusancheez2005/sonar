/**
 * TradingView-style Chart using Lightweight Charts
 * Professional candlestick + volume chart with crosshair, timeframes, and dark theme
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import styled from 'styled-components'

const MONO = "'JetBrains Mono', 'Fira Code', monospace"
const SANS = "'Inter', 'Segoe UI', system-ui, sans-serif"

const Wrapper = styled.div`
  width: 100%;
  position: relative;
`

const ToolBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
`

const TimeframeBar = styled.div`
  display: flex;
  gap: 0.3rem;
`

const TfBtn = styled.button`
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  border: 1px solid ${p => p.$active ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255, 255, 255, 0.08)'};
  background: ${p => p.$active ? 'rgba(0, 229, 255, 0.12)' : 'transparent'};
  color: ${p => p.$active ? '#00e5ff' : '#5a6a7a'};
  font-size: 0.7rem;
  font-weight: 600;
  font-family: ${MONO};
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: rgba(0, 229, 255, 0.3);
    color: #00e5ff;
  }
`

const ChartTypeBar = styled.div`
  display: flex;
  gap: 0.3rem;
`

const OHLCInfo = styled.div`
  display: flex;
  gap: 0.75rem;
  font-family: ${MONO};
  font-size: 0.65rem;
  color: #5a6a7a;
  padding: 0.25rem 0;
  flex-wrap: wrap;
`

const OHLCVal = styled.span`
  color: ${p => p.$color || '#e0e6ed'};
  font-weight: 600;
`

const ChartContainer = styled.div`
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: #0a0e17;
`

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 500px;
  font-family: ${MONO};
  font-size: 0.75rem;
  color: #5a6a7a;
  background: #0a0e17;
`

const TIMEFRAMES = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
]

const CHART_TYPES = [
  { label: 'Candles', value: 'candlestick' },
  { label: 'Line', value: 'line' },
  { label: 'Area', value: 'area' },
]

export default function TradingViewChart({ symbol, coingeckoId, height = 500 }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const candleSeriesRef = useRef(null)
  const volumeSeriesRef = useRef(null)
  const lineSeriesRef = useRef(null)
  const tooltipRef = useRef(null)

  const [selectedDays, setSelectedDays] = useState(30)
  const [chartType, setChartType] = useState('candlestick')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ohlcHover, setOhlcHover] = useState(null)
  const [lwcModule, setLwcModule] = useState(null)

  // Dynamically import lightweight-charts (client-only)
  useEffect(() => {
    import('lightweight-charts').then(mod => {
      setLwcModule(mod)
    })
  }, [])

  // Create chart instance
  useEffect(() => {
    if (!lwcModule || !chartContainerRef.current) return

    const { createChart, ColorType, CrosshairMode } = lwcModule

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0e17' },
        textColor: '#5a6a7a',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(0, 229, 255, 0.3)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#0d1420',
        },
        horzLine: {
          color: 'rgba(0, 229, 255, 0.3)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#0d1420',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        timeVisible: selectedDays <= 7,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: selectedDays <= 7 ? 8 : selectedDays <= 30 ? 6 : 4,
      },
      handleScroll: { vertTouchDrag: false },
    })

    chartRef.current = chart

    // Resize handler
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        chart.applyOptions({ width })
      }
    })
    resizeObserver.observe(chartContainerRef.current)

    // Crosshair move handler for OHLC tooltip
    chart.subscribeCrosshairMove(param => {
      if (!param.time || !param.seriesData) {
        setOhlcHover(null)
        return
      }
      const candleData = candleSeriesRef.current ? param.seriesData.get(candleSeriesRef.current) : null
      const volData = volumeSeriesRef.current ? param.seriesData.get(volumeSeriesRef.current) : null
      if (candleData) {
        setOhlcHover({
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volData?.value || null,
          change: candleData.close - candleData.open,
          changePct: ((candleData.close - candleData.open) / candleData.open * 100),
        })
      } else if (param.seriesData.size > 0) {
        // Line/area mode
        const lineData = lineSeriesRef.current ? param.seriesData.get(lineSeriesRef.current) : null
        if (lineData) {
          setOhlcHover({ close: lineData.value, volume: volData?.value || null })
        }
      }
    })

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      lineSeriesRef.current = null
    }
  }, [lwcModule, height])

  // Fetch data and update series
  useEffect(() => {
    if (!chartRef.current || !lwcModule) return
    fetchAndRender()
  }, [selectedDays, chartType, lwcModule, chartRef.current])

  const fetchAndRender = useCallback(async () => {
    if (!chartRef.current || !lwcModule) return
    const chart = chartRef.current

    setLoading(true)
    setError(null)

    try {
      // Fetch OHLC + volume in parallel
      const params = new URLSearchParams({ days: String(selectedDays) })
      if (coingeckoId) params.set('id', coingeckoId)
      else params.set('symbol', symbol)

      const [ohlcRes, chartRes] = await Promise.all([
        fetch(`/api/coingecko/ohlc?${params}`),
        fetch(`/api/coingecko/market-chart?${params}`),
      ])

      if (!ohlcRes.ok) throw new Error('Failed to fetch OHLC data')

      const ohlcJson = await ohlcRes.json()
      const chartJson = chartRes.ok ? await chartRes.json() : null

      // Remove old series
      if (candleSeriesRef.current) { chart.removeSeries(candleSeriesRef.current); candleSeriesRef.current = null }
      if (lineSeriesRef.current) { chart.removeSeries(lineSeriesRef.current); lineSeriesRef.current = null }
      if (volumeSeriesRef.current) { chart.removeSeries(volumeSeriesRef.current); volumeSeriesRef.current = null }

      // Prepare OHLC data
      const ohlcData = ohlcJson.data.map(d => ({
        time: Math.floor(d.timestamp / 1000),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })).sort((a, b) => a.time - b.time)

      // Deduplicate by time
      const seen = new Set()
      const dedupedOhlc = ohlcData.filter(d => {
        if (seen.has(d.time)) return false
        seen.add(d.time)
        return true
      })

      // Prepare volume data from market-chart
      let volumeData = []
      if (chartJson?.data?.total_volumes) {
        const volSeen = new Set()
        volumeData = chartJson.data.total_volumes
          .map(([ts, vol]) => ({
            time: Math.floor(ts / 1000),
            value: vol,
          }))
          .filter(d => {
            if (volSeen.has(d.time)) return false
            volSeen.add(d.time)
            return true
          })
          .sort((a, b) => a.time - b.time)
      }

      // Add volume series (always, as histogram at bottom)
      if (volumeData.length > 0) {
        const volSeries = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        })
        volSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
        })

        // Color volume bars based on price direction
        const ohlcMap = new Map(dedupedOhlc.map(d => [d.time, d]))
        const coloredVolume = volumeData.map(v => {
          const candle = ohlcMap.get(v.time)
          const bullish = candle ? candle.close >= candle.open : true
          return {
            ...v,
            color: bullish ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)',
          }
        })
        volSeries.setData(coloredVolume)
        volumeSeriesRef.current = volSeries
      }

      // Add price series based on chart type
      if (chartType === 'candlestick') {
        const series = chart.addCandlestickSeries({
          upColor: '#00e676',
          downColor: '#ff1744',
          borderDownColor: '#ff1744',
          borderUpColor: '#00e676',
          wickDownColor: 'rgba(255, 23, 68, 0.6)',
          wickUpColor: 'rgba(0, 230, 118, 0.6)',
        })
        series.setData(dedupedOhlc)
        candleSeriesRef.current = series
      } else if (chartType === 'line') {
        const series = chart.addLineSeries({
          color: '#00e5ff',
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          crosshairMarkerBackgroundColor: '#00e5ff',
        })
        series.setData(dedupedOhlc.map(d => ({ time: d.time, value: d.close })))
        lineSeriesRef.current = series
      } else if (chartType === 'area') {
        const series = chart.addAreaSeries({
          lineColor: '#00e5ff',
          topColor: 'rgba(0, 229, 255, 0.2)',
          bottomColor: 'rgba(0, 229, 255, 0.01)',
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          crosshairMarkerBackgroundColor: '#00e5ff',
        })
        series.setData(dedupedOhlc.map(d => ({ time: d.time, value: d.close })))
        lineSeriesRef.current = series
      }

      // Update time scale
      chart.timeScale().applyOptions({
        timeVisible: selectedDays <= 7,
        barSpacing: selectedDays <= 7 ? 8 : selectedDays <= 30 ? 6 : 4,
      })
      chart.timeScale().fitContent()

    } catch (err) {
      console.error('Chart fetch error:', err)
      setError('Failed to load chart data')
    } finally {
      setLoading(false)
    }
  }, [selectedDays, chartType, symbol, coingeckoId, lwcModule])

  const formatPrice = (v) => {
    if (v == null) return '—'
    if (v < 0.01) return `$${v.toFixed(6)}`
    if (v < 1) return `$${v.toFixed(4)}`
    return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatVol = (v) => {
    if (v == null) return '—'
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
    return `$${v.toFixed(0)}`
  }

  return (
    <Wrapper>
      <ToolBar>
        <TimeframeBar>
          {TIMEFRAMES.map(tf => (
            <TfBtn key={tf.days} $active={selectedDays === tf.days} onClick={() => setSelectedDays(tf.days)}>
              {tf.label}
            </TfBtn>
          ))}
        </TimeframeBar>
        <ChartTypeBar>
          {CHART_TYPES.map(ct => (
            <TfBtn key={ct.value} $active={chartType === ct.value} onClick={() => setChartType(ct.value)}>
              {ct.label}
            </TfBtn>
          ))}
        </ChartTypeBar>
      </ToolBar>

      {/* OHLC hover info */}
      {ohlcHover && (
        <OHLCInfo>
          {ohlcHover.open != null && (
            <>
              <span>O <OHLCVal>{formatPrice(ohlcHover.open)}</OHLCVal></span>
              <span>H <OHLCVal $color="#00e676">{formatPrice(ohlcHover.high)}</OHLCVal></span>
              <span>L <OHLCVal $color="#ff1744">{formatPrice(ohlcHover.low)}</OHLCVal></span>
              <span>C <OHLCVal $color={ohlcHover.change >= 0 ? '#00e676' : '#ff1744'}>{formatPrice(ohlcHover.close)}</OHLCVal></span>
              <span>Chg <OHLCVal $color={ohlcHover.change >= 0 ? '#00e676' : '#ff1744'}>
                {ohlcHover.change >= 0 ? '+' : ''}{ohlcHover.changePct?.toFixed(2)}%
              </OHLCVal></span>
            </>
          )}
          {ohlcHover.open == null && ohlcHover.close != null && (
            <span>Price <OHLCVal>{formatPrice(ohlcHover.close)}</OHLCVal></span>
          )}
          {ohlcHover.volume != null && (
            <span>Vol <OHLCVal>{formatVol(ohlcHover.volume)}</OHLCVal></span>
          )}
        </OHLCInfo>
      )}

      <ChartContainer>
        {!lwcModule ? (
          <LoadingState>Loading chart engine...</LoadingState>
        ) : loading && !chartRef.current ? (
          <LoadingState>Loading chart data...</LoadingState>
        ) : error ? (
          <LoadingState style={{ color: '#ff1744' }}>{error}</LoadingState>
        ) : null}
        <div ref={chartContainerRef} style={{ width: '100%', height: `${height}px` }} />
      </ChartContainer>
    </Wrapper>
  )
}
