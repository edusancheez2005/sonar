/**
 * Token display names shared by /trending and its routes.
 */
export const TOKEN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana',
  XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin', AVAX: 'Avalanche',
  DOT: 'Polkadot', LINK: 'Chainlink', UNI: 'Uniswap', ATOM: 'Cosmos',
  LTC: 'Litecoin', FIL: 'Filecoin', NEAR: 'NEAR Protocol', APT: 'Aptos',
  ARB: 'Arbitrum', OP: 'Optimism', AAVE: 'Aave', MKR: 'Maker',
  CRV: 'Curve', SNX: 'Synthetix', COMP: 'Compound', SUSHI: 'SushiSwap',
  ALGO: 'Algorand', FTM: 'Fantom', SAND: 'The Sandbox', MANA: 'Decentraland',
  AXS: 'Axie Infinity', GRT: 'The Graph', SHIB: 'Shiba Inu', PEPE: 'Pepe',
  WLD: 'Worldcoin', SUI: 'Sui', SEI: 'Sei', TIA: 'Celestia',
  INJ: 'Injective', STX: 'Stacks', IMX: 'Immutable', RENDER: 'Render',
  FET: 'Fetch.ai', JUP: 'Jupiter', WIF: 'dogwifhat', BONK: 'Bonk',
  FLOKI: 'Floki', JASMY: 'JasmyCoin', ENA: 'Ethena', PENDLE: 'Pendle',
  TAO: 'Bittensor', ONDO: 'Ondo', TRX: 'Tron', TON: 'Toncoin',
  ETC: 'Ethereum Classic', XLM: 'Stellar', HBAR: 'Hedera', VET: 'VeChain',
  ICP: 'Internet Computer', THETA: 'Theta', RUNE: 'THORChain', ENS: 'ENS',
  MATIC: 'Polygon', POL: 'Polygon',
}

/** A name for a symbol, falling back to the symbol itself. */
export function tokenName(symbol: string): string {
  const s = String(symbol || '').toUpperCase()
  return TOKEN_NAMES[s] || EXTRA_NAMES[s] || s
}

const EXTRA_NAMES: Record<string, string> = {
  ETHFI: 'ether.fi', LDO: 'Lido DAO', CVX: 'Convex', APE: 'ApeCoin', QNT: 'Quant', STRK: 'Starknet',
  USDC: 'USD Coin', USDT: 'Tether', WLFI: 'World Liberty Financial', HYPE: 'Hyperliquid', ZEC: 'Zcash',
  BAL: 'Balancer', '1INCH': '1inch', SKY: 'Sky', MORPHO: 'Morpho', RPL: 'Rocket Pool', SSV: 'SSV Network',
  ENS: 'ENS', BLUR: 'Blur', IMX: 'Immutable', AXL: 'Axelar', W: 'Wormhole', EIGEN: 'EigenLayer',
}
