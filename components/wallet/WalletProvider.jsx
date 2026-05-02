'use client'
import React, { useMemo } from 'react'
import { WagmiProvider } from 'wagmi'
import { http } from 'viem'
import { mainnet, polygon, arbitrum, base, optimism } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'sonar-dev-fallback'

// getDefaultConfig is the canonical v2 setup. It wires connectors (MetaMask,
// WalletConnect, Coinbase, Rainbow, Injected, Safe), chains, transports, and
// safe SSR defaults in one call. Auto-reconnect is left enabled but wrapped in
// a try/catch by RainbowKit so a missing/locked MetaMask no longer blows up
// the page.
const config = getDefaultConfig({
  appName: 'Sonar Tracker',
  projectId: PROJECT_ID,
  chains: [mainnet, polygon, arbitrum, base, optimism],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
  },
  ssr: true,
})

const sonarTheme = darkTheme({
  accentColor: '#00e5ff',
  accentColorForeground: '#0a0e17',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
})

export default function WalletProvider({ children }) {
  const queryClient = useMemo(() => new QueryClient(), [])
  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={sonarTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
