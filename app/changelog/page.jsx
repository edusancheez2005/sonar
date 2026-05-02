import ChangelogClient from './ChangelogClient'

export const metadata = {
  title: "What's new — Sonar Tracker",
  description:
    'Release notes, shipped features and what is coming next on Sonar Tracker. ' +
    'Whale tracking, AI signals, sentiment, multi-chain analytics.',
}

export default function ChangelogPage() {
  return <ChangelogClient />
}
