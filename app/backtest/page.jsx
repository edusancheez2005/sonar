'use client'
import React, { useState } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1621 0%, #0f1922 50%, #0a1621 100%);
  padding: 2rem;
`

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #36a6ba 0%, #2ecc71 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`

const Subtitle = styled.p`
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 2rem;
  line-height: 1.6;
`

const ConfigCard = styled.div`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
`

const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const Label = styled.label`
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.95rem;
`

const Input = styled.input`
  background: rgba(30, 57, 81, 0.5);
  border: 1px solid rgba(54, 166, 186, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: var(--text-primary);
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`

const RunButton = styled(motion.button)`
  width: 100%;
  padding: 1.25rem 2rem;
  background: linear-gradient(135deg, #2ecc71 0%, #36a6ba 100%);
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(46, 204, 113, 0.3);

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ResultsCard = styled(motion.div)`
  background: rgba(13, 33, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 16px;
  padding: 2rem;
  margin-top: 2rem;
`

const SummaryBox = styled.div`
  background: linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, rgba(54, 166, 186, 0.1) 100%);
  border-left: 4px solid ${props => props.$positive ? '#2ecc71' : props.$negative ? '#e74c3c' : '#f39c12'};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  white-space: pre-line;
  font-family: 'Courier New', monospace;
  color: var(--text-primary);
  line-height: 1.8;
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`

const MetricCard = styled.div`
  background: rgba(30, 57, 81, 0.5);
  border: 1px solid rgba(54, 166, 186, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
`

const MetricLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`

const MetricValue = styled.div`
  color: ${props => props.$positive ? '#2ecc71' : props.$negative ? '#e74c3c' : 'var(--primary)'};
  font-size: 1.8rem;
  font-weight: 700;
`

const SectionTitle = styled.h2`
  color: var(--primary);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 2rem 0 1rem 0;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;

  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(54, 166, 186, 0.2);
  }

  th {
    color: var(--primary);
    font-weight: 700;
  }

  td {
    color: var(--text-primary);
  }
`

const LoadingSpinner = styled.div`
  border: 3px solid rgba(54, 166, 186, 0.3);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  margin-right: 0.75rem;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`

export default function BacktestPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [config, setConfig] = useState({
    hours: 24,
    allocation_per_signal_gbp: 100,
    taker_fee_bps: 10,
    slippage_bps: 5
  })

  async function runBacktest() {
    setLoading(true)
    setResults(null)

    try {
      const res = await fetch('/api/backtest/signal-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (res.ok) {
        const data = await res.json()
        setResults(data)
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Backtest failed:', error)
      alert('Backtest failed. Check console.')
    } finally {
      setLoading(false)
    }
  }

  const totalPnl = results?.aggregate?.cumulative_pnl_gbp ? Number(results.aggregate.cumulative_pnl_gbp) : 0

  return (
    <>
      <Navbar />
      <PageWrapper>
        <Container>
          <Title>🧪 Signal Validation Backtest</Title>
          <Subtitle>
            Test if our Bullish/Bearish signals are profitable. This algorithm simulates £100 trades for each signal over 24 hours,
            tracking real price movements and calculating total P&L with fees and slippage.
          </Subtitle>

          <ConfigCard>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Configuration</h3>
            <ConfigGrid>
              <InputGroup>
                <Label>Time Window (hours)</Label>
                <Input
                  type="number"
                  value={config.hours}
                  onChange={(e) => setConfig({ ...config, hours: Number(e.target.value) })}
                  min="1"
                  max="168"
                />
              </InputGroup>
              <InputGroup>
                <Label>Allocation per Signal (£)</Label>
                <Input
                  type="number"
                  value={config.allocation_per_signal_gbp}
                  onChange={(e) => setConfig({ ...config, allocation_per_signal_gbp: Number(e.target.value) })}
                  min="10"
                  step="10"
                />
              </InputGroup>
              <InputGroup>
                <Label>Taker Fee (bps)</Label>
                <Input
                  type="number"
                  value={config.taker_fee_bps}
                  onChange={(e) => setConfig({ ...config, taker_fee_bps: Number(e.target.value) })}
                  min="0"
                  step="1"
                />
              </InputGroup>
              <InputGroup>
                <Label>Slippage (bps)</Label>
                <Input
                  type="number"
                  value={config.slippage_bps}
                  onChange={(e) => setConfig({ ...config, slippage_bps: Number(e.target.value) })}
                  min="0"
                  step="1"
                />
              </InputGroup>
            </ConfigGrid>
            <RunButton
              onClick={runBacktest}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  Running Backtest... (may take 30-60 seconds)
                </>
              ) : (
                '🚀 Run Backtest'
              )}
            </RunButton>
          </ConfigCard>

          {results && (
            <ResultsCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <SummaryBox $positive={totalPnl > 0} $negative={totalPnl < -50}>
                {results.summary}
              </SummaryBox>

              <SectionTitle>📊 Performance Metrics</SectionTitle>
              <MetricsGrid>
                <MetricCard>
                  <MetricLabel>Total P&L</MetricLabel>
                  <MetricValue $positive={totalPnl > 0} $negative={totalPnl < 0}>
                    £{results.aggregate.cumulative_pnl_gbp}
                  </MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Hit Rate</MetricLabel>
                  <MetricValue>{results.aggregate.hit_rate_pct}%</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Total Trades</MetricLabel>
                  <MetricValue>{results.aggregate.total_trades}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Avg Return</MetricLabel>
                  <MetricValue $positive={results.aggregate.avg_return_pct > 0} $negative={results.aggregate.avg_return_pct < 0}>
                    {results.aggregate.avg_return_pct}%
                  </MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Sharpe (Hourly)</MetricLabel>
                  <MetricValue>{results.aggregate.sharpe_hourly}</MetricValue>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Max Drawdown</MetricLabel>
                  <MetricValue $negative>{results.aggregate.max_drawdown_pct}%</MetricValue>
                </MetricCard>
              </MetricsGrid>

              <SectionTitle>📈 Bullish vs Bearish Signals</SectionTitle>
              <MetricsGrid>
                <MetricCard>
                  <MetricLabel>Bullish Signals</MetricLabel>
                  <MetricValue $positive={results.aggregate.bullish_vs_bearish.bullish.cumulative_pnl_gbp > 0}>
                    £{results.aggregate.bullish_vs_bearish.bullish.cumulative_pnl_gbp}
                  </MetricValue>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    {results.aggregate.bullish_vs_bearish.bullish.trades} trades | {results.aggregate.bullish_vs_bearish.bullish.avg_return_pct}% avg
                  </div>
                </MetricCard>
                <MetricCard>
                  <MetricLabel>Bearish Signals</MetricLabel>
                  <MetricValue $positive={results.aggregate.bullish_vs_bearish.bearish.cumulative_pnl_gbp > 0}>
                    £{results.aggregate.bullish_vs_bearish.bearish.cumulative_pnl_gbp}
                  </MetricValue>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    {results.aggregate.bullish_vs_bearish.bearish.trades} trades | {results.aggregate.bullish_vs_bearish.bearish.avg_return_pct}% avg
                  </div>
                </MetricCard>
              </MetricsGrid>

              <SectionTitle>🏆 Top 5 Trades</SectionTitle>
              <Table>
                <thead>
                  <tr>
                    <th>Coin</th>
                    <th>Signal</th>
                    <th>Entry Time</th>
                    <th>Return %</th>
                    <th>P&L (£)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.diagnostics.top_worst_trades.top.map((trade, idx) => (
                    <tr key={idx}>
                      <td>{trade.coin}</td>
                      <td>
                        <span style={{ 
                          color: trade.signal === 'BULLISH' ? '#2ecc71' : '#e74c3c',
                          fontWeight: 700
                        }}>
                          {trade.signal}
                        </span>
                      </td>
                      <td>{new Date(trade.entry_time).toLocaleString()}</td>
                      <td style={{ color: Number(trade.return_pct) > 0 ? '#2ecc71' : '#e74c3c', fontWeight: 700 }}>
                        {trade.return_pct}%
                      </td>
                      <td style={{ color: Number(trade.pnl_gbp) > 0 ? '#2ecc71' : '#e74c3c', fontWeight: 700 }}>
                        £{trade.pnl_gbp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <SectionTitle>💔 Worst 5 Trades</SectionTitle>
              <Table>
                <thead>
                  <tr>
                    <th>Coin</th>
                    <th>Signal</th>
                    <th>Entry Time</th>
                    <th>Return %</th>
                    <th>P&L (£)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.diagnostics.top_worst_trades.worst.map((trade, idx) => (
                    <tr key={idx}>
                      <td>{trade.coin}</td>
                      <td>
                        <span style={{ 
                          color: trade.signal === 'BULLISH' ? '#2ecc71' : '#e74c3c',
                          fontWeight: 700
                        }}>
                          {trade.signal}
                        </span>
                      </td>
                      <td>{new Date(trade.entry_time).toLocaleString()}</td>
                      <td style={{ color: Number(trade.return_pct) > 0 ? '#2ecc71' : '#e74c3c', fontWeight: 700 }}>
                        {trade.return_pct}%
                      </td>
                      <td style={{ color: Number(trade.pnl_gbp) > 0 ? '#2ecc71' : '#e74c3c', fontWeight: 700 }}>
                        £{trade.pnl_gbp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <SectionTitle>🪙 Per-Coin Performance</SectionTitle>
              <Table>
                <thead>
                  <tr>
                    <th>Coin</th>
                    <th>Trades</th>
                    <th>Hit Rate</th>
                    <th>Avg Return</th>
                    <th>Total P&L</th>
                    <th>Max DD</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(results.perCoin)
                    .filter(([_, data]) => data.summary.trades_count > 0)
                    .sort((a, b) => Number(b[1].summary.cumulative_pnl_gbp) - Number(a[1].summary.cumulative_pnl_gbp))
                    .map(([coin, data]) => (
                      <tr key={coin}>
                        <td style={{ fontWeight: 700 }}>{coin}</td>
                        <td>{data.summary.trades_count}</td>
                        <td>{data.summary.hit_rate_pct}%</td>
                        <td style={{ color: Number(data.summary.avg_trade_return_pct) > 0 ? '#2ecc71' : '#e74c3c' }}>
                          {data.summary.avg_trade_return_pct}%
                        </td>
                        <td style={{ color: Number(data.summary.cumulative_pnl_gbp) > 0 ? '#2ecc71' : '#e74c3c', fontWeight: 700 }}>
                          £{data.summary.cumulative_pnl_gbp}
                        </td>
                        <td style={{ color: '#e74c3c' }}>{data.summary.max_drawdown_pct}%</td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </ResultsCard>
          )}
        </Container>
      </PageWrapper>
      <Footer />
    </>
  )
}

