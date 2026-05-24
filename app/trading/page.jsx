import TradingComingSoon from '@/components/trading/TradingComingSoon'

export const metadata = {
  title: 'Automated trading — coming soon | Sonar',
  description:
    'Sonar is currently a research and information tool. The automated trading feature is not live yet.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-static'

export default function TradingPage() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 20px',
        background:
          'radial-gradient(circle at 30% 0%, rgba(0,229,255,0.05), transparent 60%), #0a0f1a',
      }}
    >
      <TradingComingSoon variant="page" />
    </main>
  )
}
