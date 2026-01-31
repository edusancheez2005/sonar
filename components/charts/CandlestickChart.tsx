/**
 * Candlestick Chart Component for OHLC Data
 * Uses Chart.js with candlestick controller
 */

'use client'

import { useEffect, useState } from 'react'
import styled from 'styled-components'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial'
import 'chartjs-adapter-date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
)

interface CandlestickChartProps {
  symbol: string
  coingeckoId?: string
  days?: number
  height?: number
}

const ChartContainer = styled.div<{ $height: number }>`
  width: 100%;
  height: ${props => props.$height}px;
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
`

const ErrorState = styled(LoadingState)`
  color: #ef4444;
`

const TimeframeButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

const TimeframeButton = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.$active ? '#667eea' : 'rgba(255, 255, 255, 0.2)'};
  background: ${props => props.$active ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$active ? '#667eea' : 'rgba(255, 255, 255, 0.8)'};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(102, 126, 234, 0.15);
    border-color: #667eea;
  }
`

export default function CandlestickChart({
  symbol,
  coingeckoId,
  days = 7,
  height = 400,
}: CandlestickChartProps) {
  const [selectedDays, setSelectedDays] = useState(days)
  const [chartData, setChartData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChartData()
  }, [symbol, coingeckoId, selectedDays])

  const fetchChartData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        days: String(selectedDays),
      })

      if (coingeckoId) params.set('id', coingeckoId)
      else params.set('symbol', symbol)

      const response = await fetch(`/api/coingecko/ohlc?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch OHLC data')
      }

      const result = await response.json()

      // Transform data for Chart.js candlestick
      const candleData = result.data.map((item: any) => ({
        x: item.timestamp,
        o: item.open,
        h: item.high,
        l: item.low,
        c: item.close,
      }))

      setChartData({
        datasets: [
          {
            label: symbol,
            data: candleData,
            borderColor: {
              up: '#10b981',
              down: '#ef4444',
              unchanged: '#6b7280',
            },
            backgroundColor: {
              up: 'rgba(16, 185, 129, 0.5)',
              down: 'rgba(239, 68, 68, 0.5)',
              unchanged: 'rgba(107, 114, 128, 0.5)',
            },
          },
        ],
      })
    } catch (err) {
      console.error('OHLC fetch error:', err)
      setError('Failed to load candlestick data')
    } finally {
      setLoading(false)
    }
  }

  const options: ChartOptions<'candlestick'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: any) => {
            const { o, h, l, c } = context.raw
            return [
              `Open: $${o.toFixed(2)}`,
              `High: $${h.toFixed(2)}`,
              `Low: $${l.toFixed(2)}`,
              `Close: $${c.toFixed(2)}`,
            ]
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: selectedDays <= 7 ? 'day' : selectedDays <= 90 ? 'week' : 'month',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          callback: (value) => {
            const num = Number(value)
            if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`
            if (num < 1) return `$${num.toFixed(6)}`
            return `$${num.toFixed(2)}`
          },
        },
      },
    },
  }

  const timeframes = [
    { label: '7D', days: 7 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
    { label: '180D', days: 180 },
    { label: '1Y', days: 365 },
  ]

  return (
    <div>
      <TimeframeButtons>
        {timeframes.map((tf) => (
          <TimeframeButton
            key={tf.label}
            $active={selectedDays === tf.days}
            onClick={() => setSelectedDays(tf.days)}
          >
            {tf.label}
          </TimeframeButton>
        ))}
      </TimeframeButtons>

      <ChartContainer $height={height}>
        {loading && <LoadingState>Loading candlestick chart...</LoadingState>}
        {error && <ErrorState>{error}</ErrorState>}
        {!loading && !error && chartData && (
          <Chart type="candlestick" data={chartData} options={options} />
        )}
      </ChartContainer>
    </div>
  )
}
