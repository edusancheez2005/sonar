/**
 * Line Chart Component for Market Data
 * Uses Chart.js for rendering
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface LineChartProps {
  symbol: string
  coingeckoId?: string
  days?: number
  interval?: 'daily' | 'hourly'
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

export default function LineChart({
  symbol,
  coingeckoId,
  days = 7,
  interval = 'daily',
  height = 400,
}: LineChartProps) {
  const [selectedDays, setSelectedDays] = useState(days)
  const [chartData, setChartData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChartData()
  }, [symbol, coingeckoId, selectedDays, interval])

  const fetchChartData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        days: String(selectedDays),
        interval,
      })

      if (coingeckoId) params.set('id', coingeckoId)
      else params.set('symbol', symbol)

      const response = await fetch(`/api/coingecko/market-chart?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch chart data')
      }

      const result = await response.json()

      // Transform data for Chart.js
      const prices = result.data.prices || []
      const volumes = result.data.total_volumes || []

      const labels = prices.map(([timestamp]: [number, number]) => {
        const date = new Date(timestamp)
        if (selectedDays === 1) {
          return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        } else if (selectedDays <= 7) {
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' })
        } else {
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
      })

      const priceData = prices.map(([, price]: [number, number]) => price)
      const isPositive = priceData[priceData.length - 1] >= priceData[0]

      setChartData({
        labels,
        datasets: [
          {
            label: 'Price (USD)',
            data: priceData,
            borderColor: isPositive ? '#10b981' : '#ef4444',
            backgroundColor: isPositive
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: isPositive ? '#10b981' : '#ef4444',
          },
        ],
      })
    } catch (err) {
      console.error('Chart fetch error:', err)
      setError('Failed to load chart data')
    } finally {
      setLoading(false)
    }
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
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
        displayColors: false,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y ?? 0
            return `$${value.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: value < 1 ? 6 : 2,
            })}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          maxRotation: 0,
          autoSkipPadding: 20,
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
    { label: '24H', days: 1 },
    { label: '7D', days: 7 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
    { label: '1Y', days: 365 },
    { label: 'MAX', days: 'max' as any },
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
        {loading && <LoadingState>Loading chart...</LoadingState>}
        {error && <ErrorState>{error}</ErrorState>}
        {!loading && !error && chartData && (
          <Line data={chartData} options={options} />
        )}
      </ChartContainer>
    </div>
  )
}
