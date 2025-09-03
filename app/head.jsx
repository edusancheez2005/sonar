export default function Head() {
  return (
    <>
      {/* Preload critical resources */}
      <link rel="preload" as="image" href="/logo2.png" fetchpriority="high" />
      <link rel="preload" as="font" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />

      {/* DNS prefetch for external resources */}
      <link rel="preconnect" href="https://fwbwfvqzomipoftgodof.supabase.co" crossOrigin="" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="dns-prefetch" href="//vercel.com" />
      <link rel="dns-prefetch" href="//vercel-insights.com" />

      {/* Performance and caching */}
      <link rel="manifest" href="/manifest.json" />

      {/* Security headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />

      {/* Favicons and icons */}
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="icon" href="/logo2.png" type="image/png" sizes="32x32" />
      <link rel="apple-touch-icon" href="/logo2.png" />

      {/* Open Graph image preconnect for social sharing */}
      <link rel="preconnect" href="https://sonartracker.io" />

      {/* Performance hints */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Sonar Tracker" />

      {/* Search engine hints */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="bingbot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

      {/* Canonical URL */}
      <link rel="canonical" href="https://www.sonartracker.io" />
    </>
  )
} 