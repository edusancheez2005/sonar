import MemoryClient from './MemoryClient'

export const metadata = {
  title: 'ORCA memory \u2014 Sonar',
  description: 'View and delete the facts ORCA has remembered about you.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <MemoryClient />
}
