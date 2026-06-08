import SonarLoader from '@/components/wallet-tracker/SonarLoader'

// Navigation-level skeleton so the Polymarket terminal shows immediate
// feedback instead of a blank shell while the client component mounts and
// fetches markets/whales/activity.
export default function Loading() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SonarLoader />
    </div>
  )
}
