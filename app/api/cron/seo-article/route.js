// CRON: SEO Article Generator - Daily AI blog posts with images
// Schedule: Daily at 8am UTC
// Generates long-form, SEO-optimized articles with DALL-E images,
// internal links, external references, tables, FAQs, and key takeaways.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// SEO topic pool - rotates through these keyword-targeted topics
const TOPIC_POOL = [
  { keyword: 'crypto whale tracking', slug: 'crypto-whale-tracking-guide', angle: 'Complete guide to tracking crypto whale wallets in real-time: tools, techniques, and actionable strategies' },
  { keyword: 'on-chain analysis crypto', slug: 'on-chain-analysis-crypto-trading', angle: 'How on-chain analysis gives crypto traders an institutional edge: metrics, tools, and real examples' },
  { keyword: 'whale wallet tracker', slug: 'whale-wallet-tracker-tools-compared', angle: 'Best whale wallet trackers compared: features, accuracy, pricing, and which one actually works' },
  { keyword: 'crypto market signals', slug: 'crypto-market-signals-explained', angle: 'Understanding crypto market signals: from whale movements to AI-generated buy/sell indicators' },
  { keyword: 'bitcoin whale accumulation', slug: 'bitcoin-whale-accumulation-indicators', angle: 'Bitcoin whale accumulation indicators: how to detect when smart money is buying before price moves' },
  { keyword: 'ethereum whale activity', slug: 'ethereum-whale-activity-analysis', angle: 'Ethereum whale activity analysis: tracking large ETH movements and what they signal for price' },
  { keyword: 'crypto sentiment analysis', slug: 'crypto-sentiment-analysis-trading', angle: 'Crypto sentiment analysis for trading: combining social data, news scoring, and whale behavior' },
  { keyword: 'defi whale tracking', slug: 'defi-whale-tracking-strategies', angle: 'DeFi whale tracking strategies: how to monitor large positions across lending, DEXs, and yield protocols' },
  { keyword: 'crypto exchange inflows outflows', slug: 'crypto-exchange-inflows-outflows-guide', angle: 'Crypto exchange inflows and outflows: the definitive guide to reading net flow signals' },
  { keyword: 'institutional crypto trading', slug: 'institutional-crypto-trading-signals', angle: 'Institutional crypto trading signals: ETF flows, OTC activity, and custody movements explained' },
  { keyword: 'crypto portfolio risk management', slug: 'crypto-portfolio-risk-management', angle: 'Crypto portfolio risk management: using whale data and on-chain metrics to protect your positions' },
  { keyword: 'solana whale tracker', slug: 'solana-whale-tracker-real-time', angle: 'Solana whale tracker: real-time SOL whale movements, top holders, and price implications' },
  { keyword: 'crypto trading automation', slug: 'crypto-trading-automation-alerts', angle: 'Crypto trading automation: setting up whale alerts, signal-based entries, and risk rules' },
  { keyword: 'blockchain data analysis', slug: 'blockchain-data-analysis-tools', angle: 'Blockchain data analysis tools: from raw transactions to actionable trading intelligence' },
  { keyword: 'crypto whale detection', slug: 'crypto-whale-detection-methods', angle: 'Crypto whale detection methods: wallet clustering, behavioral analysis, and pattern recognition' },
  { keyword: 'nansen alternative free', slug: 'nansen-alternative-free-tools', angle: 'Free Nansen alternatives: whale tracking and on-chain analytics tools that cost nothing' },
  { keyword: 'crypto data aggregation', slug: 'crypto-data-aggregation-workflow', angle: 'Crypto data aggregation: building a multi-source workflow for higher-confidence trades' },
  { keyword: 'whale alert crypto', slug: 'whale-alert-crypto-how-it-works', angle: 'Whale Alert crypto: how large transaction monitoring works and which alerts actually matter' },
  { keyword: 'crypto market microstructure', slug: 'crypto-market-microstructure-analysis', angle: 'Crypto market microstructure: order flow, liquidity, and how whales exploit thin markets' },
  { keyword: 'ai crypto signals', slug: 'ai-crypto-signals-accuracy', angle: 'AI crypto signals: how machine learning generates buy/sell signals and what accuracy to expect' },
  { keyword: 'meme coin whale tracking', slug: 'meme-coin-whale-tracking', angle: 'Meme coin whale tracking: how to spot early accumulation in DOGE, PEPE, SHIB, and new launches' },
  { keyword: 'crypto fear greed index', slug: 'crypto-fear-greed-index-trading', angle: 'Using the crypto fear and greed index for trading: when to buy fear and sell greed' },
  { keyword: 'whale watching crypto strategy', slug: 'whale-watching-crypto-strategy', angle: 'Whale watching crypto strategy: building a systematic approach to following smart money' },
  { keyword: 'crypto liquidity analysis', slug: 'crypto-liquidity-analysis-guide', angle: 'Crypto liquidity analysis: measuring depth, spread, and slippage before entering a trade' },
  { keyword: 'best crypto analytics platform', slug: 'best-crypto-analytics-platform-2026', angle: 'Best crypto analytics platforms in 2026: comprehensive comparison of features, data, and pricing' },
  { keyword: 'crypto whale manipulation', slug: 'crypto-whale-manipulation-detection', angle: 'Crypto whale manipulation: pump-and-dump patterns, spoofing tactics, and how to protect yourself' },
  { keyword: 'multi chain whale tracking', slug: 'multi-chain-whale-tracking', angle: 'Multi-chain whale tracking: monitoring whale activity across Ethereum, Bitcoin, Solana, and more' },
  { keyword: 'crypto trading signals accuracy', slug: 'crypto-trading-signals-accuracy-tested', angle: 'Crypto trading signals accuracy tested: backtesting results from the top signal providers' },
  { keyword: 'altcoin whale activity', slug: 'altcoin-whale-activity-patterns', angle: 'Altcoin whale activity patterns: what large holders do before major alt season moves' },
  { keyword: 'real time crypto alerts', slug: 'real-time-crypto-alerts-setup', angle: 'Real-time crypto alerts setup: configuring whale notifications, price triggers, and signal alerts' },
  { keyword: 'crypto whale wallet analysis', slug: 'crypto-whale-wallet-analysis-techniques', angle: 'Crypto whale wallet analysis techniques: from address clustering to behavioral profiling' },
  { keyword: 'whale watching trading strategy', slug: 'whale-watching-trading-strategy-guide', angle: 'Whale watching trading strategy: a systematic approach to following smart money in crypto' },
  { keyword: 'crypto market prediction tools', slug: 'crypto-market-prediction-tools-2026', angle: 'Crypto market prediction tools in 2026: which ones use real data and which are just noise' },
  { keyword: 'how whales manipulate crypto', slug: 'how-whales-manipulate-crypto-markets', angle: 'How whales manipulate crypto markets: wash trading, spoofing, and pump schemes explained' },
  { keyword: 'crypto whale alert bot', slug: 'crypto-whale-alert-bot-setup', angle: 'Building a crypto whale alert bot: Telegram, Discord, and API-based notification systems' },
  { keyword: 'on chain metrics trading', slug: 'on-chain-metrics-trading-guide', angle: 'On-chain metrics for trading: SOPR, NVT, exchange reserves, and how to interpret each one' },
  { keyword: 'crypto exchange flow analysis', slug: 'crypto-exchange-flow-analysis', angle: 'Crypto exchange flow analysis: reading net deposits and withdrawals for price direction' },
  { keyword: 'whale token accumulation', slug: 'whale-token-accumulation-before-pump', angle: 'Whale token accumulation before price pumps: identifying the pattern before it is too late' },
  { keyword: 'crypto data analysis python', slug: 'crypto-data-analysis-python-guide', angle: 'Crypto data analysis with Python: APIs, pandas workflows, and whale tracking scripts' },
  { keyword: 'blockchain transaction monitoring', slug: 'blockchain-transaction-monitoring-tools', angle: 'Blockchain transaction monitoring tools: comparing features for compliance and trading' },
  { keyword: 'crypto whale buying signals', slug: 'crypto-whale-buying-signals-indicators', angle: 'Crypto whale buying signals: the 5 indicators that precede major accumulation phases' },
  { keyword: 'best free crypto tools', slug: 'best-free-crypto-tools-traders-2026', angle: 'Best free crypto tools for traders in 2026: from whale tracking to portfolio management' },
  { keyword: 'defi whale movements', slug: 'defi-whale-movements-tracking', angle: 'DeFi whale movements: tracking large positions across Aave, Uniswap, and lending protocols' },
  { keyword: 'crypto market intelligence', slug: 'crypto-market-intelligence-platform-guide', angle: 'Crypto market intelligence platforms: how professionals aggregate data for trading decisions' },
  { keyword: 'whale transaction tracker', slug: 'whale-transaction-tracker-comparison', angle: 'Whale transaction trackers compared: accuracy, speed, chain coverage, and pricing in 2026' },
  { keyword: 'crypto trading data sources', slug: 'crypto-trading-data-sources-ranked', angle: 'Crypto trading data sources ranked: which feeds are worth paying for and which are free' },
  { keyword: 'bitcoin whale watching', slug: 'bitcoin-whale-watching-strategy', angle: 'Bitcoin whale watching: how to monitor BTC whale wallets and interpret their movements' },
  { keyword: 'ethereum gas whale activity', slug: 'ethereum-gas-whale-activity-analysis', angle: 'Ethereum gas and whale activity: how high-gas transactions signal major market moves' },
]

// Internal links to include in articles
const INTERNAL_LINKS = [
  { url: '/whale-tracker', text: 'real-time whale tracker' },
  { url: '/ai-advisor', text: 'AI crypto analyst' },
  { url: '/dashboard', text: 'crypto dashboard' },
  { url: '/ethereum-whale-tracker', text: 'Ethereum whale tracker' },
  { url: '/solana-whale-tracker', text: 'Solana whale tracker' },
  { url: '/bitcoin-whale-tracker', text: 'Bitcoin whale tracker' },
  { url: '/ai-crypto-signals', text: 'AI crypto signals' },
  { url: '/wallet-tracker', text: 'wallet tracker' },
  { url: '/blog/what-is-whale-tracking', text: 'whale tracking guide' },
  { url: '/blog/on-chain-analysis-beginners', text: 'on-chain analysis guide' },
  { url: '/blog/how-to-track-whale-wallets', text: 'tracking whale wallets' },
  { url: '/blog/best-crypto-whale-tracking-tools-2026', text: 'best whale tracking tools' },
  { url: '/blog/whale-accumulation-vs-distribution', text: 'accumulation vs distribution' },
  { url: '/glossary/on-chain-analysis', text: 'on-chain analysis glossary' },
  { url: '/blog', text: 'crypto insights blog' },
  { url: '/nansen-alternative', text: 'Nansen alternative' },
  { url: '/arkham-alternative', text: 'Arkham alternative' },
]

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Pick a topic that hasn't been used yet
    const { data: existingSlugs } = await sb
      .from('blog_posts')
      .select('slug')

    const usedSlugs = new Set((existingSlugs || []).map(p => p.slug))
    const availableTopics = TOPIC_POOL.filter(t => !usedSlugs.has(t.slug))

    if (availableTopics.length === 0) {
      return NextResponse.json({ ok: true, message: 'All topics exhausted' })
    }

    const topic = availableTopics[Math.floor(Math.random() * Math.min(5, availableTopics.length))]

    // Fetch real platform data for data-driven articles
    let platformData = ''
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: recentWhales } = await sb
        .from('all_whale_transactions')
        .select('token_symbol, usd_value, transaction_type, blockchain')
        .gte('timestamp', sevenDaysAgo)
        .order('usd_value', { ascending: false })
        .limit(50)

      const { data: signals } = await sb
        .from('token_signals')
        .select('token, signal, confidence, price_at_signal')
        .order('computed_at', { ascending: false })
        .limit(20)

      const { data: sentiment } = await sb
        .from('sentiment_scores')
        .select('ticker, score, label')
        .order('window_start', { ascending: false })
        .limit(15)

      if (recentWhales?.length) {
        const totalVol = recentWhales.reduce((s, t) => s + (Number(t.usd_value) || 0), 0)
        const topTokens = {}
        recentWhales.forEach(t => {
          topTokens[t.token_symbol] = (topTokens[t.token_symbol] || 0) + (Number(t.usd_value) || 0)
        })
        const sorted = Object.entries(topTokens).sort((a, b) => b[1] - a[1]).slice(0, 5)

        platformData = `\n\nREAL SONAR TRACKER DATA (use these exact numbers in the article where relevant):
- Total whale volume tracked this week: $${(totalVol / 1e6).toFixed(1)}M across ${recentWhales.length} transactions
- Top whale tokens by volume: ${sorted.map(([t, v]) => `${t} ($${(v / 1e6).toFixed(1)}M)`).join(', ')}
- Active signals: ${(signals || []).slice(0, 5).map(s => `${s.token}: ${s.signal} (${s.confidence}% confidence)`).join(', ')}
- Market sentiment: ${(sentiment || []).slice(0, 5).map(s => `${s.ticker}: ${s.label}`).join(', ')}
- Sonar tracks 10+ blockchains, 200+ tokens, with 700+ active traders using the platform

IMPORTANT: Weave these real data points naturally into the article. Cite them as "According to Sonar Tracker data" or "Real-time data from sonartracker.io shows".`
      }
    } catch (e) {
      // Non-fatal - article still generates without platform data
    }

    // Pick 5-8 random internal links for this article
    const shuffled = [...INTERNAL_LINKS].sort(() => Math.random() - 0.5)
    const linksForArticle = shuffled.slice(0, 7)
    const linksContext = linksForArticle.map(l => `[${l.text}](https://sonartracker.io${l.url})`).join('\n')

    // Generate the article with Grok (primary) or OpenAI (fallback)
    const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    let ai, model
    if (xaiKey) {
      ai = new OpenAI({ apiKey: xaiKey, baseURL: 'https://api.x.ai/v1' })
      model = 'grok-3-mini'
    } else if (openaiKey) {
      ai = new OpenAI({ apiKey: openaiKey })
      model = 'gpt-4o-mini'
    } else {
      return NextResponse.json({ ok: false, error: 'No AI provider configured' }, { status: 500 })
    }

    const systemPrompt = `You are an expert crypto market analyst and SEO content writer for Sonar Tracker (sonartracker.io), a crypto whale tracking and AI signals platform.

Write a comprehensive, 1800-2200 word article optimized for the target keyword. Follow this EXACT structure:

1. FEATURED IMAGE PROMPT: Write a one-line DALL-E prompt for a professional, photorealistic image related to the article topic. Start with "A " and describe a scene. No text in the image.

2. INTRO PARAGRAPH: Hook the reader with a specific, data-driven opening. No fluff.

3. TABLE OF CONTENTS: List all H2 sections as a bulleted list with anchor links.

4. KEY TAKEAWAYS TABLE: A 4-row HTML table with columns "Point" and "Details".

5. BODY SECTIONS (5-7 H2 sections): Each with:
   - Substantive paragraphs with specific data points
   - At least one relevant internal link from the provided list
   - Tables comparing tools/strategies where relevant
   - Pro Tips in blockquotes
   - Bullet/numbered lists for actionable steps

6. FINAL CTA SECTION: Mention Sonar Tracker naturally with 2-3 internal links.

7. FAQ SECTION: 4 H3 questions with concise answers.

8. RECOMMENDED: 4 bullet links to other Sonar Tracker pages.

RULES:
- Write in HTML format (h1, h2, h3, p, ul, ol, li, table, thead, tbody, tr, th, td, blockquote, strong, em, a tags)
- For external links, use this EXACT format: <a href="URL" rel="nofollow noopener noreferrer" target="_blank">Link Text</a>. The rel and target attributes go INSIDE the <a> tag, NOT as visible text
- Include 7-10 internal links to sonartracker.io pages using the provided list
- Use the target keyword naturally 8-12 times throughout
- Include data points, percentages, and specific numbers
- Professional but accessible tone
- NO em dashes
- NO "Article generated by" text
- Start the HTML with the h1 tag directly (no doctype, no head, no body wrapper)`

    const userPrompt = `TARGET KEYWORD: "${topic.keyword}"
ARTICLE ANGLE: ${topic.angle}
SLUG: ${topic.slug}

INTERNAL LINKS TO USE (pick 7-10 and weave naturally):
${linksContext}
${platformData}

Write the full article now. Return your response in this EXACT format:

IMAGE_PROMPT: <one line DALL-E description here>
<h1>Article Title</h1>
<p>...rest of article HTML...</p>

The IMAGE_PROMPT line MUST be on its own line at the very top, followed by a newline, then the HTML starting with <h1>. Do NOT wrap the image prompt in any HTML tags. Do NOT repeat the image prompt anywhere inside the article body.`

    const completion = await ai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 6000,
    })

    let rawContent = completion.choices?.[0]?.message?.content || ''
    if (!rawContent || rawContent.length < 500) {
      return NextResponse.json({ ok: false, error: 'AI generated insufficient content' }, { status: 500 })
    }

    // Extract image prompt (try multiple patterns)
    let imagePrompt = ''
    const imgPatterns = [
      /IMAGE_PROMPT:\s*(.+?)(?:\n|$)/i,
      /IMAGE_PROMPT:\s*(.+?)(?:<)/i,
      /^(.+?)(?:\n\s*<h1)/i,
    ]
    for (const pat of imgPatterns) {
      const m = rawContent.match(pat)
      if (m && m[1] && !m[1].includes('<') && m[1].length > 10) {
        imagePrompt = m[1].trim()
        break
      }
    }
    // Clean the prompt text out of the content aggressively
    if (imagePrompt) {
      rawContent = rawContent.replace(imagePrompt, '').replace(/IMAGE_PROMPT:\s*/gi, '').trim()
    }
    // Also remove any leftover prompt-like text before the first HTML tag
    rawContent = rawContent.replace(/^[^<]*IMAGE_PROMPT[^<]*/i, '').trim()
    // Remove any non-HTML text before the first tag
    const firstTagIdx = rawContent.indexOf('<')
    if (firstTagIdx > 0) {
      rawContent = rawContent.substring(firstTagIdx)
    }
    // CRITICAL: Strip everything before the <h1> tag (removes <p>prompt text</p> wrappers)
    const h1Idx = rawContent.search(/<h1[\s>]/i)
    if (h1Idx > 0) {
      rawContent = rawContent.substring(h1Idx)
    }
    // Fix malformed anchors: remove rel/target text that leaked outside <a> tags
    rawContent = rawContent.replace(/(<\/a>)\s*rel="[^"]*"\s*target="[^"]*"/gi, '$1')
    rawContent = rawContent.replace(/>\s*rel="nofollow[^"]*"\s*target="_blank"\s*</gi, '><')
    // Fix anchors where rel/target appear as link text inside the <a>
    rawContent = rawContent.replace(/(<a\s[^>]*>)([^<]*)\s*rel="nofollow[^"]*"\s*target="_blank"([^<]*<\/a>)/gi, '$1$2$3')
    // Fix anchors missing rel/target in attributes but having them as text
    rawContent = rawContent.replace(/<a\s+href="(https?:\/\/[^"]+)"\s*>([^<]*)\s*rel="[^"]*"\s*target="[^"]*"([^<]*)<\/a>/gi,
      '<a href="$1" rel="nofollow noopener noreferrer" target="_blank">$2$3</a>')
    // Fallback image prompt if none extracted
    if (!imagePrompt) {
      imagePrompt = `A professional crypto trader analyzing whale movement data on multiple monitors in a modern office, dark blue ambient lighting, blockchain visualization on screens`
    }

    // Generate image with DALL-E
    let imageUrl = ''
    let imageDebug = ''
    const dalleKey = process.env.OPENAI_API_KEY
    if (dalleKey) {
      try {
        const dalle = new OpenAI({ apiKey: dalleKey })
        const imgResponse = await dalle.images.generate({
          model: 'dall-e-3',
          prompt: imagePrompt + '. Professional photography style, clean composition, soft lighting. No text, no watermarks, no logos.',
          n: 1,
          size: '1792x1024',
          quality: 'standard',
        })
        const tempUrl = imgResponse.data?.[0]?.url
        if (tempUrl) {
          // Ensure bucket exists (idempotent)
          try {
            await sb.storage.createBucket('blog-images', { public: true })
          } catch (_) { /* bucket likely exists */ }
          // Try uploading to Supabase Storage
          try {
            const imgRes = await fetch(tempUrl)
            const imgBuf = Buffer.from(await imgRes.arrayBuffer())
            const fileName = `blog/${topic.slug}-${Date.now()}.png`
            const { error: uploadErr } = await sb.storage
              .from('blog-images')
              .upload(fileName, imgBuf, { contentType: 'image/png', upsert: true })

            if (!uploadErr) {
              const { data: urlData } = sb.storage.from('blog-images').getPublicUrl(fileName)
              imageUrl = urlData?.publicUrl || tempUrl
              imageDebug = 'supabase-upload-ok'
            } else {
              console.error('Supabase upload error:', uploadErr.message)
              imageDebug = `supabase-upload-failed: ${uploadErr.message}`
              imageUrl = tempUrl
            }
          } catch (uploadErr) {
            console.error('Upload failed, using temp URL:', uploadErr.message)
            imageDebug = `upload-exception: ${uploadErr.message}`
            imageUrl = tempUrl
          }
        }
      } catch (imgErr) {
        console.error('Image generation failed (non-fatal):', imgErr.message)
        imageDebug = `dalle-failed: ${imgErr.message}`
      }
    }

    // Insert image BEFORE the h1 tag
    if (imageUrl) {
      const imgTag = `<img src="${imageUrl}" alt="${topic.keyword}" style="width:100%;border-radius:12px;margin-bottom:2em;">`
      rawContent = imgTag + '\n' + rawContent
    }

    // Extract title from the h1 (after image insertion, so image isn't in title)
    const titleMatch = rawContent.match(/<h1[^>]*>(.*?)<\/h1>/is)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : topic.angle
    const description = `Learn about ${topic.keyword}. ${topic.angle.slice(0, 120)}.`

    // Delete existing post with same slug if any
    await sb.from('blog_posts').delete().eq('slug', topic.slug)

    // Insert new post
    const { error: insertError } = await sb.from('blog_posts').insert({
      slug: topic.slug,
      title,
      description,
      content: rawContent,
      category: 'guide',
      tags: topic.keyword.split(' ').concat(['crypto', 'whale-tracking', 'trading']),
      cover_image: imageUrl || null,
    })

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      slug: topic.slug,
      title,
      keyword: topic.keyword,
      hasImage: !!imageUrl,
      imageDebug,
      remainingTopics: availableTopics.length - 1,
    })

  } catch (err) {
    console.error('SEO article cron error:', err)
    return NextResponse.json({ ok: false, error: err.message || 'Internal error' }, { status: 500 })
  }
}
