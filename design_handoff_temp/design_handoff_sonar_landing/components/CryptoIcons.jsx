// Crypto logos as inline SVG — all tinted teal/cyan for monochrome feel
// Original designs drawn from scratch (simple geometric marks, not copyrighted)

const BTC = ({ size = 36 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    <circle cx="32" cy="32" r="26" fill="rgba(8, 20, 32, 0.6)" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <text x="32" y="42" textAnchor="middle" fontSize="28" fontWeight="700" fill="currentColor" fontFamily="Inter, sans-serif">₿</text>
  </svg>
);

const ETH = ({ size = 36 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    <circle cx="32" cy="32" r="26" fill="rgba(8, 20, 32, 0.6)" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <g fill="currentColor">
      <path d="M32 12 L20 33 L32 40 L44 33 Z" opacity="0.6" />
      <path d="M32 12 L44 33 L32 40 Z" />
      <path d="M32 42 L20 35 L32 52 L44 35 Z" opacity="0.8" />
      <path d="M32 42 L44 35 L32 52 Z" />
    </g>
  </svg>
);

const SOL = ({ size = 36 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    <circle cx="32" cy="32" r="26" fill="rgba(8, 20, 32, 0.6)" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <g fill="currentColor">
      <path d="M20 22 L44 22 L48 18 L24 18 Z" />
      <path d="M20 32 L44 32 L48 36 L24 36 Z" opacity="0.75" />
      <path d="M20 46 L44 46 L48 42 L24 42 Z" opacity="0.9" />
    </g>
  </svg>
);

const XRP = ({ size = 36 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    <circle cx="32" cy="32" r="26" fill="rgba(8, 20, 32, 0.6)" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M18 22 L32 36 L46 22" />
      <path d="M18 42 L32 28 L46 42" opacity="0.7" />
    </g>
  </svg>
);

const BNB = ({ size = 36 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    <circle cx="32" cy="32" r="26" fill="rgba(8, 20, 32, 0.6)" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <g fill="currentColor" transform="translate(32 32) rotate(45)">
      <rect x="-5" y="-18" width="10" height="10" />
      <rect x="-5" y="8" width="10" height="10" />
      <rect x="-18" y="-5" width="10" height="10" />
      <rect x="8" y="-5" width="10" height="10" />
      <rect x="-5" y="-5" width="10" height="10" opacity="0.7" />
    </g>
  </svg>
);

const DOGE = ({ size = 36 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    <circle cx="32" cy="32" r="26" fill="rgba(8, 20, 32, 0.6)" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <text x="32" y="44" textAnchor="middle" fontSize="30" fontWeight="700" fill="currentColor" fontFamily="Inter, sans-serif" fontStyle="italic">Ð</text>
  </svg>
);

const COINS = [
  { id: 'BTC', name: 'Bitcoin',  symbol: 'BTC', Icon: BTC,  price: 108420.50, change: 2.41 },
  { id: 'ETH', name: 'Ethereum', symbol: 'ETH', Icon: ETH,  price: 4120.85,   change: 1.88 },
  { id: 'SOL', name: 'Solana',   symbol: 'SOL', Icon: SOL,  price: 248.12,    change: 4.12 },
  { id: 'XRP', name: 'XRP',      symbol: 'XRP', Icon: XRP,  price: 3.41,      change: -0.62 },
  { id: 'BNB', name: 'BNB',      symbol: 'BNB', Icon: BNB,  price: 712.30,    change: 0.94 },
  { id: 'DOGE',name: 'Dogecoin', symbol: 'DOGE',Icon: DOGE, price: 0.412,     change: 3.27 },
];

Object.assign(window, { BTC, ETH, SOL, XRP, BNB, DOGE, COINS });
