# Dashboard Improvements - Implementation Guide

## ✅ Completed
1. Added `TokenIcon` to Statistics page (with dynamic import)
2. Added `TokenIcon` to Top % of Buys table
3. Added `TokenIcon` to Top % of Sells table
4. Added `TokenIcon` to News page token badges
5. Added `TokenIcon` to Whale Activity Heatmap cards

## 🔄 Remaining Tasks

### 1. Remove Whale Activity Heatmap Section
**Location**: Lines ~948-1051 in `src/views/Dashboard.js`
**Action**: Delete the entire `<DashboardCard>` containing "Whale Activity Heatmap"

### 2. Remove Market Momentum Section
**Location**: Lines ~1052-1150 in `src/views/Dashboard.js`  
**Action**: Delete the entire `<DashboardCard>` containing "Market Momentum"

### 3. Transform "Most Traded Tokens" Section
**Current**: Simple table at lines ~1151-1200
**New Design**: Interactive card grid with:
- Title: "Most Traded Tokens by Institutional Whales (24h)"
- Card-based layout instead of table
- Each card shows:
  - Token logo (TokenIcon)
  - Token symbol
  - Trade count
  - Total volume
  - Buy/Sell ratio indicator
  - Click to go to token page

### 4. Add TokenIcon to Net Inflows/Outflows Bar Charts
**Location**: Lines ~846-886 in `src/views/Dashboard.js`
**Current**: Bar charts use `labels: tokenInflows.map(t => t.token)`
**Solution**: Need to create custom chart plugin or use HTML legend to show token logos

## Implementation Code Snippets

### For Most Traded Tokens (Replace existing section):

```jsx
<DashboardCard>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
      Most Traded Tokens by Institutional Whales
    </h2>
    <div style={{ 
      background: 'rgba(54, 166, 186, 0.15)',
      border: '1px solid rgba(54, 166, 186, 0.3)',
      borderRadius: '8px',
      padding: '0.5rem 1rem'
    }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
        Last 24 Hours
      </span>
    </div>
  </div>

  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
    gap: '1rem'
  }}>
    {tokenLeaders.slice(0, 12).map((t, idx) => {
      const buyRatio = t.buyCount / (t.buyCount + t.sellCount) * 100
      const isBuyHeavy = buyRatio > 60
      const isSellHeavy = buyRatio < 40
      
      return (
        <Link 
          key={t.token}
          href={`/token/${encodeURIComponent(t.token)}?sinceHours=24`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(54, 166, 186, 0.08) 0%, rgba(30, 57, 81, 0.6) 100%)',
            border: `1.5px solid ${isBuyHeavy ? 'rgba(46, 204, 113, 0.3)' : isSellHeavy ? 'rgba(231, 76, 60, 0.3)' : 'rgba(54, 166, 186, 0.3)'}`,
            textDecoration: 'none',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(54, 166, 186, 0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {/* Rank Badge */}
          <div style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'rgba(54, 166, 186, 0.2)',
            borderRadius: '6px',
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--primary)'
          }}>
            #{idx + 1}
          </div>

          {/* Token Logo & Symbol */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <TokenIcon symbol={t.token} size={32} />
            <span style={{ 
              fontSize: '1.2rem', 
              fontWeight: 700, 
              color: 'var(--text-primary)'
            }}>
              {t.token}
            </span>
          </div>

          {/* Trade Count */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Trades
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
              {t.count}
            </div>
          </div>

          {/* Volume */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Volume
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              ${formatCompact(t.totalUsd)}
            </div>
          </div>

          {/* Buy/Sell Ratio Bar */}
          <div style={{ marginTop: 'auto' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '0.7rem', 
              color: 'var(--text-secondary)',
              marginBottom: '0.25rem'
            }}>
              <span>Buy {buyRatio.toFixed(0)}%</span>
              <span>Sell {(100 - buyRatio).toFixed(0)}%</span>
            </div>
            <div style={{
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(30, 57, 81, 0.7)',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${buyRatio}%`,
                background: isBuyHeavy ? '#2ecc71' : isSellHeavy ? '#e74c3c' : 'var(--primary)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </Link>
      )
    })}
  </div>
</DashboardCard>
```

## Next Steps

1. Find and delete the Whale Activity Heatmap section (lines ~948-1051)
2. Find and delete the Market Momentum section (lines ~1052-1150)  
3. Replace the Most Traded Tokens table with the new card grid design above
4. Test the dashboard to ensure it's more readable and visually appealing
5. Consider adding spacing/margins between sections for better visual hierarchy

## Note on Bar Charts
For the Net Inflows/Outflows bar charts, Chart.js doesn't natively support images in labels. Options:
1. Keep as-is (just text labels)
2. Create a custom HTML legend with TokenIcon components
3. Use a different chart library that supports HTML in labels

Recommend keeping charts as-is for now since they're functional and the token symbols are clear.
