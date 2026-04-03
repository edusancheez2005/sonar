/**
 * SentimentChart — Sentiment + Interactions over time
 * Uses LunarCrush time-series data via /api/token/social-timeseries
 */

'use client'

import { useEffect, useState } from 'react'
import styled from 'styled-components'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
)

const MONO = "'JetBrains Mono', 'Fira Code', monospace"

const Wrapper = styled.div`
  margin-top: 1rem;
`

const ChartContainer = styled.div`
  width: 100%;
  height: 220px;
  position: relative;
`

const TimeframeBar = styled.div`
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
`

const TfBtn = styled.button`
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  border: 1px solid ${p => p.$active ? 'rgba(0, 229, 255, 0.4)' : 'rgba(0, 229, 255, 0.1)'};
  background: ${p => p.$active ? 'rgba(0, 229, 255, 0.12)' : 'rgba(0, 229, 255, 0.03)'};
  color: ${p => p.$active ? '#00e5ff' : '#5a6a7a'};
  font-size: 0.65rem;
  font-weight: 600;
  font-family: ${MONO};
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-transform: uppercase;

  &:hover {
    border-color: rgba(0, 229, 255, 0.3);
    color: #00e5ff;
  }
`

const Label = styled.div`
  font-family: ${MONO};
  font-size: 0.65rem;
  font-weight: 600;
  color: #5a6a7a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
`

const LoadingText = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220px;
  font-family: ${MONO};
  font-size: 0.7rem;
  color: #5a6a7a;
`

const INTERVALS = [
  { label: '24H', value: '1d' },
  { label: '7D', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
]

export default function SentimentChart({ symbol }) {
  const [interval, setInterval_] = useState('1w')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    fetch(`/api/token/social-timeseries?symbol=${symbol}&interval=${interval}`)
      .then(r => r.json())
      .then(json => {
        if (json.data && json.data.length > 0) {
          setData(json.data)
        } else {
          setData(null)
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [symbol, interval])

  if (loading) return <LoadingText>Loading sentiment data...</LoadingText>
  if (!data || data.length === 0) return null

  const formatLabel = (ts) => {
    const d = new Date(ts * 1000)
    if (interval === '1d') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    if (interval === '1w') return d.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' })
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const labels = data.map(p => formatLabel(p.timestamp))
  const sentimentValues = data.map(p => p.sentiment)
  const interactionValues = data.map(p => p.interactions)

  const avgSentiment = sentimentValues.filter(Boolean).reduce((a, b) => a + b, 0) / sentimentValues.filter(Boolean).length
  const sentimentColor = avgSentiment >= 60 ? '#00e676' : avgSentiment >= 40 ? '#ffab00' : '#ff1744'

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Sentiment',
        data: sentimentValues,
        borderColor: sentimentColor,
        backgroundColor: sentimentColor.replace(')', ', 0.08)').replace('rgb', 'rgba'),
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: sentimentColor,
        yAxisID: 'y',
      },
      {
        label: 'Interactions',
        data: interactionValues,
        borderColor: 'rgba(0, 229, 255, 0.4)',
        backgroundColor: 'rgba(0, 229, 255, 0.04)',
        borderWidth: 1,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        borderDash: [4, 4],
        yAxisID: 'y1',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(8, 15, 24, 0.95)',
        titleColor: '#e0e6ed',
        bodyColor: '#e0e6ed',
        borderColor: 'rgba(0, 229, 255, 0.2)',
        borderWidth: 1,
        padding: 10,
        titleFont: { family: MONO, size: 11 },
        bodyFont: { family: MONO, size: 11 },
        displayColors: true,
        callbacks: {
          label: (ctx) => {
            if (ctx.datasetIndex === 0) return `  Sentiment: ${ctx.parsed.y?.toFixed(1)}%`
            return `  Interactions: ${ctx.parsed.y?.toLocaleString()}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: {
          color: '#5a6a7a', font: { family: MONO, size: 9 },
          maxRotation: 0, autoSkipPadding: 30,
        },
      },
      y: {
        position: 'left',
        min: 0, max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: {
          color: sentimentColor, font: { family: MONO, size: 9 },
          callback: (v) => `${v}%`,
          stepSize: 25,
        },
      },
      y1: {
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: 'rgba(0, 229, 255, 0.5)', font: { family: MONO, size: 9 },
          callback: (v) => {
            if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
            if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
            return v
          },
        },
      },
    },
  }

  return (
    <Wrapper>
      <Label>Sentiment &amp; Interactions Over Time</Label>
      <TimeframeBar>
        {INTERVALS.map(tf => (
          <TfBtn key={tf.value} $active={interval === tf.value} onClick={() => setInterval_(tf.value)}>
            {tf.label}
          </TfBtn>
        ))}
      </TimeframeBar>
      <ChartContainer>
        <Line data={chartData} options={options} />
      </ChartContainer>
    </Wrapper>
  )
}
