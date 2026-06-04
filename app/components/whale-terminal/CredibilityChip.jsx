// "Verified entity" credibility chip. Pure presentation, server-safe —
// renders entirely from credibility stats derived upstream via
// computeAddressCredibility(). No data fetching here.
//
//   full variant (detail header):
//     verifiedCount > 0  -> green  "✓ N verified · C chain(s) · S sourced"
//     communityOnly      -> amber  "COMMUNITY-ATTRIBUTED"
//     no addresses       -> muted  "COVERAGE IN PROGRESS"
//   compact variant (directory cards):
//     verifiedCount > 0  -> green  "✓ N"
//     communityOnly      -> amber  "COMMUNITY"
//     no addresses       -> nothing (chip absent, no layout shift)
import React from 'react'
import { Badge, ChainBadge } from './primitives'

const VERIFIED_TIP = 'Addresses verified against public/self-disclosed sources.'
const COMMUNITY_TIP = 'Community-attributed via OSINT — lower confidence.'

export default function CredibilityChip({ stats, compact = false }) {
  if (!stats) return null
  const { addressCount, verifiedCount, chainCount, sourcedCount, communityOnly } = stats

  if (verifiedCount > 0) {
    const chainLabel = `${chainCount} chain${chainCount === 1 ? '' : 's'}`
    return (
      <Badge className="in" title={VERIFIED_TIP}>
        {compact
          ? `✓ ${verifiedCount}`
          : `✓ ${verifiedCount} verified · ${chainLabel} · ${sourcedCount} sourced`}
      </Badge>
    )
  }

  if (communityOnly) {
    return (
      <Badge className="neutral" title={COMMUNITY_TIP}>
        {compact ? 'COMMUNITY' : 'COMMUNITY-ATTRIBUTED'}
      </Badge>
    )
  }

  // No addresses at all.
  if (compact) return null
  if (addressCount === 0) {
    return <ChainBadge title="No verified addresses yet — coverage in progress.">COVERAGE IN PROGRESS</ChainBadge>
  }
  return null
}
