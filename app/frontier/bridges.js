// Known Solana bridge program IDs / vault addresses. When a row in
// tracked_address_transfers (chain='solana') has a `counterparty` matching
// one of these, we treat it as a "bridge event" — value entering or
// leaving Solana via the named bridge.
//
// IMPORTANT: these are program IDs / canonical vaults; we deliberately
// avoid matching on derived PDAs since those rotate per-mint. If a
// counterparty doesn't match here it's just a normal transfer.
//
// Sources: Wormhole/deBridge/Allbridge/Mayan public docs (May 2026).
// Add new bridges over time; the page degrades gracefully when no
// matches are present.
export const SOLANA_BRIDGES = {
  // Wormhole
  '3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5': 'Wormhole Token Bridge',
  'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb': 'Wormhole Core',
  // deBridge
  'DEbrdGj3HsRsAzx6uH4MKyREKxVAfBydijLUF3ygsFfh': 'deBridge',
  // Allbridge
  'BrdgN2RPzEMWF96ZbB4JkdEEhEPGiVKwiAk7apF2tbdH': 'Allbridge',
  // Mayan Finance (Wormhole-based intent layer)
  'FC4eXxkyrMPTjiYUpp4EAnkmwMbQyZ6NDCh1kfLn6vsf': 'Mayan',
  // Portal Bridge (Wormhole front-end vaults — extend as discovered)
}

export const BRIDGE_ADDRESSES = Object.keys(SOLANA_BRIDGES)

export function bridgeNameFor(counterparty) {
  if (!counterparty) return null
  return SOLANA_BRIDGES[counterparty] || null
}
