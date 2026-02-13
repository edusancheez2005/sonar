/**
 * SONAR Marketing — TikTok Brute Force Repurpose Pipeline
 * 
 * Downloads trending crypto TikToks, adds SONAR branding overlay,
 * and reposts to Instagram Reels / YouTube Shorts / TikTok.
 * 
 * REQUIREMENTS:
 *   - yt-dlp installed: pip install yt-dlp  (or download binary)
 *   - ffmpeg installed: https://ffmpeg.org/download.html
 * 
 * Usage:
 *   node scripts/marketing/repurpose.js                          # full auto pipeline
 *   node scripts/marketing/repurpose.js --search "bitcoin whale"  # custom search
 *   node scripts/marketing/repurpose.js --url <tiktok-url>       # specific video
 *   node scripts/marketing/repurpose.js --brand-only ./video.mp4 # just add branding
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const TEMP_DIR = path.join(__dirname, 'output', 'repurpose', 'raw');
const BRANDED_DIR = path.join(__dirname, 'output', 'repurpose', 'branded');
[TEMP_DIR, BRANDED_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ─── CHECK DEPENDENCIES ─────────────────────────────────────────

function checkDeps() {
  const deps = ['yt-dlp', 'ffmpeg'];
  const missing = [];

  for (const dep of deps) {
    try {
      execSync(`${dep} --version`, { stdio: 'ignore' });
    } catch {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    console.error(`❌ Missing required tools: ${missing.join(', ')}`);
    console.log('\nInstall them:');
    if (missing.includes('yt-dlp')) console.log('  pip install yt-dlp');
    if (missing.includes('ffmpeg')) console.log('  Download from https://ffmpeg.org/download.html');
    process.exit(1);
  }
}

// ─── SEARCH & DOWNLOAD TIKTOKS ──────────────────────────────────

function searchAndDownload(searchTerm, maxResults = 3) {
  console.log(`\n🔍 Searching TikTok for: "${searchTerm}"...`);

  const outputTemplate = path.join(TEMP_DIR, '%(id)s.%(ext)s');

  try {
    // yt-dlp can search TikTok and download top results
    const cmd = [
      'yt-dlp',
      `"tiktoksearch${maxResults}:${searchTerm}"`,
      '--format', 'best[ext=mp4]',
      '--output', `"${outputTemplate}"`,
      '--max-downloads', maxResults.toString(),
      '--no-playlist',
      '--restrict-filenames',
      // Don't download if already have it
      '--no-overwrites',
      // Get metadata
      '--write-info-json',
      // Limit duration (skip anything over 3 min)
      '--match-filter', '"duration < 180"',
    ].join(' ');

    console.log(`  Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit', timeout: 120000 });

    // Find downloaded files
    const files = fs.readdirSync(TEMP_DIR)
      .filter(f => f.endsWith('.mp4'))
      .map(f => path.join(TEMP_DIR, f));

    console.log(`  📥 Downloaded ${files.length} videos`);
    return files;
  } catch (err) {
    console.error(`  ❌ Download failed: ${err.message}`);
    return [];
  }
}

function downloadSingleVideo(url) {
  console.log(`\n📥 Downloading: ${url}...`);

  const outputTemplate = path.join(TEMP_DIR, '%(id)s.%(ext)s');

  try {
    const cmd = [
      'yt-dlp',
      `"${url}"`,
      '--format', 'best[ext=mp4]',
      '--output', `"${outputTemplate}"`,
      '--no-overwrites',
      '--restrict-filenames',
    ].join(' ');

    execSync(cmd, { stdio: 'inherit', timeout: 60000 });

    // Find the most recently created mp4
    const files = fs.readdirSync(TEMP_DIR)
      .filter(f => f.endsWith('.mp4'))
      .map(f => ({
        path: path.join(TEMP_DIR, f),
        time: fs.statSync(path.join(TEMP_DIR, f)).mtime,
      }))
      .sort((a, b) => b.time - a.time);

    return files[0]?.path || null;
  } catch (err) {
    console.error(`  ❌ Download failed: ${err.message}`);
    return null;
  }
}

// ─── ADD BRANDING WITH FFMPEG ───────────────────────────────────

function addBranding(inputPath) {
  const { watermark, ctaText, introBumper, outroBumper } = config.repurpose;
  const outputName = `branded-${path.basename(inputPath)}`;
  const outputPath = path.join(BRANDED_DIR, outputName);

  console.log(`\n🏷️  Branding: ${path.basename(inputPath)}...`);

  // Build ffmpeg filter complex
  const filters = [];

  // 1. Watermark text (always on)
  filters.push(
    `drawtext=text='${watermark.text}':` +
    `fontsize=28:fontcolor=white@0.8:` +
    `borderw=2:bordercolor=black@0.5:` +
    `x=${watermark.position === 'bottom-right' ? '(w-text_w-20)' : '20'}:` +
    `y=h-text_h-20:` +
    `enable='between(t,0,999)'`
  );

  // 2. CTA text in last 4 seconds
  if (ctaText) {
    filters.push(
      `drawtext=text='${ctaText}':` +
      `fontsize=32:fontcolor=00ff88:` +
      `borderw=2:bordercolor=black@0.7:` +
      `x=(w-text_w)/2:y=(h-text_h)/2:` +
      `enable='gte(t,duration-4)'` // last 4 seconds — note: this uses input duration
    );
  }

  // 3. Semi-transparent stripe at bottom for branding area
  filters.push(
    `drawbox=x=0:y=ih-60:w=iw:h=60:color=black@0.5:t=fill`
  );

  const filterStr = filters.join(',');

  try {
    // First, get video duration for the CTA timing
    const probeCmd = `ffprobe -v error -show_entries format=duration -of csv=p=0 "${inputPath}"`;
    const duration = parseFloat(execSync(probeCmd, { encoding: 'utf-8' }).trim());
    const ctaStart = Math.max(0, duration - 4);

    // Replace the duration-dependent filter
    const finalFilter = filterStr.replace(
      `enable='gte(t,duration-4)'`,
      `enable='gte(t,${ctaStart})'`
    );

    // Build the full command
    let cmd;

    if (introBumper && fs.existsSync(introBumper) && outroBumper && fs.existsSync(outroBumper)) {
      // With intro + outro bumpers
      cmd = [
        'ffmpeg', '-y',
        '-i', `"${introBumper}"`,
        '-i', `"${inputPath}"`,
        '-i', `"${outroBumper}"`,
        '-filter_complex',
        `"[1:v]${finalFilter}[branded];[0:v][0:a][branded][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]"`,
        '-map', '"[outv]"', '-map', '"[outa]"',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        `"${outputPath}"`,
      ].join(' ');
    } else {
      // Just branding overlay
      cmd = [
        'ffmpeg', '-y',
        '-i', `"${inputPath}"`,
        '-vf', `"${finalFilter}"`,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        `"${outputPath}"`,
      ].join(' ');
    }

    console.log(`  Running ffmpeg...`);
    execSync(cmd, { stdio: 'inherit', timeout: 120000 });
    console.log(`  ✅ Branded: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error(`  ❌ Branding failed: ${err.message}`);
    return null;
  }
}

// ─── POST BRANDED VIDEO ─────────────────────────────────────────

async function postBrandedVideo(videoPath, context = {}) {
  const { postToInstagram, generateCaption } = require('./social');

  const caption = context.caption || await generateCaption({
    type: 'daily-brief',
    platform: 'instagram',
    data: context.data || {},
  });

  console.log(`\n📤 Posting branded video...`);

  // Post as Instagram Reel
  if (config.instagram.enabled) {
    await postToInstagram(videoPath, caption, 'reel');
  }

  // Post to TikTok (if enabled)
  if (config.tiktok.enabled) {
    console.log('  📱 TikTok posting requires their Content Posting API');
    console.log('  See: https://developers.tiktok.com/doc/content-posting-api-get-started');
    // TODO: Implement TikTok Content Posting API
  }

  // Post to YouTube Shorts (if enabled)
  if (config.youtube.enabled) {
    console.log('  📺 YouTube Shorts posting requires YouTube Data API v3');
    // TODO: Implement YouTube upload
  }
}

// ─── FULL PIPELINE ──────────────────────────────────────────────

async function runPipeline(options = {}) {
  checkDeps();

  const searchTerms = options.searchTerms || config.repurpose.searchTerms;
  const maxPerTerm = options.maxPerTerm || Math.ceil(config.repurpose.maxVideosPerRun / searchTerms.length);
  const shouldPost = options.post !== false;

  console.log('🚀 Starting Brute Force Repurpose Pipeline\n');
  console.log(`   Search terms: ${searchTerms.length}`);
  console.log(`   Max per term: ${maxPerTerm}`);
  console.log(`   Auto-post: ${shouldPost ? 'YES' : 'NO (dry run)'}`);

  const allBranded = [];

  for (const term of searchTerms) {
    const videos = searchAndDownload(term, maxPerTerm);

    for (const videoPath of videos) {
      const branded = addBranding(videoPath);
      if (branded) {
        allBranded.push(branded);

        if (shouldPost) {
          await postBrandedVideo(branded, {
            data: { searchTerm: term },
          });
        }
      }
    }

    // Rate limit between search terms
    if (searchTerms.indexOf(term) < searchTerms.length - 1) {
      console.log('\n⏳ Waiting 5s between search batches...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log(`\n✅ Pipeline complete: ${allBranded.length} branded videos`);
  console.log(`   Output: ${BRANDED_DIR}`);
  return allBranded;
}

// ─── CLI ────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--brand-only')) {
    // Just add branding to an existing video
    checkDeps();
    const videoPath = args[args.indexOf('--brand-only') + 1];
    if (!videoPath || !fs.existsSync(videoPath)) {
      console.error('❌ Provide a valid video path: --brand-only <path>');
      process.exit(1);
    }
    const branded = addBranding(path.resolve(videoPath));
    if (branded) console.log(`\n✅ Done: ${branded}`);

  } else if (args.includes('--url')) {
    // Download and brand a specific TikTok URL
    checkDeps();
    const url = args[args.indexOf('--url') + 1];
    const videoPath = downloadSingleVideo(url);
    if (videoPath) {
      const branded = addBranding(videoPath);
      if (branded && args.includes('--post')) {
        await postBrandedVideo(branded);
      }
    }

  } else if (args.includes('--search')) {
    // Custom search
    checkDeps();
    const term = args[args.indexOf('--search') + 1];
    const videos = searchAndDownload(term, 3);
    for (const v of videos) addBranding(v);

  } else {
    // Full pipeline
    await runPipeline({ post: args.includes('--post') });
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}

module.exports = { searchAndDownload, downloadSingleVideo, addBranding, runPipeline };
