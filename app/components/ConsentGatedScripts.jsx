'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { hasAnalyticsConsent } from '../../components/consent'

/**
 * Loads Google Tag Manager and Google Analytics 4 ONLY after the user has
 * granted analytics consent via the cookie banner. Required for GDPR /
 * PECR / CCPA compliance — see LEGAL_AUDIT_2026-04-21.md §1.A finding A4.
 *
 * Note: we deliberately do not include the <noscript> GTM iframe fallback
 * here because the client cannot conditionally load <noscript> content.
 * Users without JavaScript are therefore not tracked, which is the
 * GDPR-safe default.
 */
export default function ConsentGatedScripts() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const recompute = () => setAllowed(hasAnalyticsConsent())
    recompute()
    window.addEventListener('sonar:consent-changed', recompute)
    return () => window.removeEventListener('sonar:consent-changed', recompute)
  }, [])

  if (!allowed) return null

  return (
    <>
      <Script
        id="gtm-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GT-WB29592G');
          `,
        }}
      />
      <Script
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-FCN0KTJYLB"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-FCN0KTJYLB', {
              page_title: document.title,
              page_location: window.location.href,
              custom_map: {'dimension1': 'page_type'},
              send_page_view: true,
              anonymize_ip: true
            });

            const pageType = window.location.pathname.includes('/dashboard') ? 'dashboard' :
                           window.location.pathname.includes('/statistics') ? 'statistics' :
                           window.location.pathname.includes('/news') ? 'news' :
                           window.location.pathname.includes('/ai-advisor') ? 'ai_advisor' :
                           window.location.pathname === '/' ? 'homepage' : 'other';

            gtag('event', 'page_type', {
              page_type: pageType,
              custom_parameter_1: window.location.pathname
            });
          `,
        }}
      />
    </>
  )
}
