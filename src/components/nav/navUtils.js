/** True when pathname should highlight the Wallet Tracker parent nav item. */
export function isWalletTrackerPath(pathname) {
  if (!pathname) return false;
  return (
    pathname === '/whale' ||
    pathname.startsWith('/whale/') ||
    pathname === '/polymarket' ||
    pathname.startsWith('/polymarket/') ||
    pathname === '/wallet-tracker' ||
    pathname.startsWith('/wallet-tracker/') ||
    pathname === '/entities' ||
    pathname.startsWith('/entities/') ||
    pathname === '/entity' ||
    pathname.startsWith('/entity/') ||
    pathname === '/figures' ||
    pathname.startsWith('/figures/') ||
    pathname === '/figure' ||
    pathname.startsWith('/figure/') ||
    pathname === '/watchlist' ||
    pathname.startsWith('/watchlist/')
  );
}
