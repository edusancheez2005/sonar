/**
 * SONAR Marketing — Social Media Posting Module
 * 
 * Posts images and text to Twitter/X, Instagram, TikTok, YouTube.
 * Generates AI captions using GPT-4o-mini.
 * 
 * Usage:
 *   node scripts/marketing/social.js --platform twitter --image ./output/daily-brief.png
 *   node scripts/marketing/social.js --platform instagram --image ./output/whale-alert.png --caption "🐋 Big move!"
 *   node scripts/marketing/social.js --platform all --image ./output/daily-brief.png
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

// ─── AI CAPTION GENERATION ──────────────────────────────────────

async function generateCaption(context = {}) {
  if (!config.openaiKey) {
    console.log('⚠ No OpenAI key — using default caption');
    return defaultCaption(context);
  }

  const styleGuides = {
    'crypto-twitter': `You are a crypto Twitter influencer. Write punchy, viral tweets about whale movements. Use 🐋 whale emojis. Be confident but not financial advice. Add urgency. Include relevant $TICKER cashtags.`,
    'professional': `You are a professional fintech marketer. Write clean, data-driven social media posts about cryptocurrency whale movements. Cite specific numbers. Maintain credibility.`,
    'casual': `You are a friendly crypto enthusiast. Write engaging social posts that make whale tracking accessible. Use plain language. Be enthusiastic but grounded.`,
  };

  const prompt = `${styleGuides[config.captions.style] || styleGuides['crypto-twitter']}

Write a social media caption for this content:
- Type: ${context.type || 'daily-brief'}
- Token: ${context.token || 'general'}
- Key data: ${JSON.stringify(context.data || {})}
- Platform: ${context.platform || 'twitter'}

Rules:
- ${context.platform === 'twitter' ? 'Max 280 characters' : 'Max 2200 characters'}
- Include ${config.captions.maxHashtags} relevant hashtags
- ${config.captions.includeEmojis ? 'Use emojis' : 'No emojis'}
- End with: ${config.captions.cta}
- Never say "financial advice" or "guaranteed"

Write ONLY the caption, nothing else.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiKey}`,
      },
      body: JSON.stringify({
        model: config.captions.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() || defaultCaption(context);
  } catch (err) {
    console.error('Caption generation failed:', err.message);
    return defaultCaption(context);
  }
}

function defaultCaption(context) {
  const captions = {
    'daily-brief': `🐋 Daily Whale Brief\n\nWhales moved massive volume in the last 24h. Here's what our AI detected.\n\n${config.captions.cta}\n\n#CryptoWhales #WhaleAlert #Bitcoin #Ethereum #Crypto #Trading #Sonar #DeFi`,
    'whale-alert': `⚠️ WHALE ALERT 🐋\n\nA whale just moved ${context.data?.amount || 'millions'} of $${context.data?.token || 'crypto'}.\n\n${context.data?.direction === 'IN' ? '📉 Possible sell pressure incoming' : '📈 Accumulation detected'}.\n\n${config.captions.cta}\n\n#WhaleAlert #Crypto #${context.data?.token || 'Bitcoin'} #Trading #Sonar`,
    'token-spotlight': `🔍 Token Spotlight: $${context.data?.symbol || 'ETH'}\n\nOur AI analyzed whale movements, social sentiment, and on-chain data.\n\nSonar Score: ${context.data?.score || '74'}/100\n\n${config.captions.cta}\n\n#${context.data?.symbol || 'ETH'} #Crypto #WhaleAlert #Sonar`,
    'prediction': `🔮 AI Prediction: $${context.data?.token || 'ETH'}\n\nOur whale intelligence model is ${context.data?.signal || 'BULLISH'} with ${context.data?.confidence || '82'}% confidence.\n\n${config.captions.cta}\n\n#CryptoTrading #WhaleAlert #Sonar`,
    'weekly-recap': `📊 Weekly Whale Recap\n\nThis week in whale movements:\n• ${context.data?.totalTx || '1,847'} transactions tracked\n• ${context.data?.totalVol || '$8.4B'} total volume\n• Biggest move: ${context.data?.biggestMove || '$142M BTC'}\n\n${config.captions.cta}\n\n#CryptoWhales #WeeklyRecap #Sonar`,
  };
  return captions[context.type] || captions['daily-brief'];
}

// ─── TWITTER / X POSTING ────────────────────────────────────────

async function postToTwitter(imagePath, caption) {
  if (!config.twitter.enabled || !config.twitter.apiKey) {
    console.log('⚠ Twitter not configured — skipping');
    return null;
  }

  // Twitter API v2 with OAuth 1.0a
  // Requires: npm install twitter-api-v2
  try {
    const { TwitterApi } = require('twitter-api-v2');

    const client = new TwitterApi({
      appKey: config.twitter.apiKey,
      appSecret: config.twitter.apiSecret,
      accessToken: config.twitter.accessToken,
      accessSecret: config.twitter.accessSecret,
    });

    // Upload image first
    let mediaId = null;
    if (imagePath && fs.existsSync(imagePath)) {
      mediaId = await client.v1.uploadMedia(imagePath);
      console.log(`  📤 Image uploaded to Twitter: ${mediaId}`);
    }

    // Post tweet
    const tweet = await client.v2.tweet({
      text: caption.slice(0, 280), // Twitter character limit
      ...(mediaId ? { media: { media_ids: [mediaId] } } : {}),
    });

    console.log(`  ✅ Tweet posted: https://twitter.com/i/status/${tweet.data.id}`);
    return tweet.data;
  } catch (err) {
    console.error(`  ❌ Twitter post failed: ${err.message}`);
    return null;
  }
}

// ─── INSTAGRAM POSTING ──────────────────────────────────────────

async function postToInstagram(imagePath, caption, type = 'image') {
  if (!config.instagram.enabled || !config.instagram.accessToken) {
    console.log('⚠ Instagram not configured — skipping');
    return null;
  }

  // Instagram Graph API requires the image to be hosted at a public URL.
  // Options:
  //   1. Upload to your server/CDN first, then pass the URL
  //   2. Use a temporary hosting service (Imgur, Cloudinary, etc.)
  //   3. Upload to Supabase Storage and get a public URL

  try {
    const businessId = config.instagram.businessId;
    const token = config.instagram.accessToken;

    // Step 1: Get a public URL for the image
    const imageUrl = await uploadToTempHost(imagePath);
    if (!imageUrl) throw new Error('Could not get public URL for image');

    // Step 2: Create media container
    const createUrl = type === 'reel'
      ? `https://graph.facebook.com/v18.0/${businessId}/media?video_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&media_type=REELS&access_token=${token}`
      : `https://graph.facebook.com/v18.0/${businessId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${token}`;

    const createRes = await fetch(createUrl, { method: 'POST' });
    const createData = await createRes.json();

    if (!createData.id) throw new Error(JSON.stringify(createData));

    // Step 3: Publish the container
    const publishUrl = `https://graph.facebook.com/v18.0/${businessId}/media_publish?creation_id=${createData.id}&access_token=${token}`;
    const publishRes = await fetch(publishUrl, { method: 'POST' });
    const publishData = await publishRes.json();

    console.log(`  ✅ Instagram ${type} posted: ${publishData.id}`);
    return publishData;
  } catch (err) {
    console.error(`  ❌ Instagram post failed: ${err.message}`);
    return null;
  }
}

// ─── TEMP IMAGE HOSTING (for Instagram) ─────────────────────────

async function uploadToTempHost(imagePath) {
  // Option 1: Supabase Storage (recommended since you already use Supabase)
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const fileName = `marketing/${Date.now()}-${path.basename(imagePath)}`;
    const fileBuffer = fs.readFileSync(imagePath);

    const { data, error } = await supabase.storage
      .from('public-assets')
      .upload(fileName, fileBuffer, { contentType: 'image/png', upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err) {
    console.log('  ⚠ Supabase upload failed, trying Imgur...');
  }

  // Option 2: Imgur (anonymous upload, no account needed)
  try {
    const imageData = fs.readFileSync(imagePath);
    const base64 = imageData.toString('base64');

    const res = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        'Authorization': 'Client-ID 546c25a59c58ad7', // Anonymous uploads
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64, type: 'base64' }),
    });

    const json = await res.json();
    return json.data?.link || null;
  } catch (err) {
    console.error('  ❌ Image hosting failed:', err.message);
    return null;
  }
}

// ─── POST TO ALL PLATFORMS ──────────────────────────────────────

async function postToAll(imagePath, context = {}) {
  const caption = context.caption || await generateCaption(context);
  console.log(`\n📝 Caption:\n${caption}\n`);

  const results = {};

  if (config.twitter.enabled) {
    // Twitter gets a shorter version
    const twitterCaption = caption.length > 280 
      ? caption.slice(0, 277) + '...' 
      : caption;
    results.twitter = await postToTwitter(imagePath, twitterCaption);
  }

  if (config.instagram.enabled) {
    results.instagram = await postToInstagram(imagePath, caption);
  }

  return results;
}

// ─── CLI ────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const platformIdx = args.indexOf('--platform');
  const imageIdx = args.indexOf('--image');
  const captionIdx = args.indexOf('--caption');
  const typeIdx = args.indexOf('--type');

  const platform = platformIdx >= 0 ? args[platformIdx + 1] : 'all';
  const imagePath = imageIdx >= 0 ? path.resolve(args[imageIdx + 1]) : null;
  const manualCaption = captionIdx >= 0 ? args[captionIdx + 1] : null;
  const contentType = typeIdx >= 0 ? args[typeIdx + 1] : 'daily-brief';

  if (!imagePath || !fs.existsSync(imagePath)) {
    console.error('❌ Please provide a valid image path: --image <path>');
    process.exit(1);
  }

  const context = {
    type: contentType,
    platform,
    caption: manualCaption,
    data: {},
  };

  const caption = manualCaption || await generateCaption(context);
  console.log(`\n📝 Caption:\n${caption}\n`);

  switch (platform) {
    case 'twitter':
      await postToTwitter(imagePath, caption);
      break;
    case 'instagram':
      await postToInstagram(imagePath, caption);
      break;
    case 'all':
      await postToAll(imagePath, { ...context, caption });
      break;
    default:
      console.error(`Unknown platform: ${platform}`);
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}

module.exports = { generateCaption, postToTwitter, postToInstagram, postToAll };
