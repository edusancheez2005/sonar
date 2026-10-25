/**
 * Blog cover generation. Covers stopped on 2026-05-12 because the cron still
 * called `dall-e-3`, which this OpenAI key can no longer use (404). The
 * gpt-image models return base64 only, accept 1536x1024, and can emit webp.
 */
import OpenAI from 'openai'

export const COVER_MODELS = ['gpt-image-1-mini', 'gpt-image-1.5'] as const
export const COVER_SIZE = '1536x1024'
export const COVER_WIDTH = 1536
export const COVER_HEIGHT = 1024

/** One consistent look for every cover; no text, logos, faces or currency signs. */
export function coverPrompt(subject: string): string {
  const s = String(subject || 'on-chain crypto whale activity').replace(/\s+/g, ' ').slice(0, 300)
  return `Editorial cover illustration for an article about ${s}. Abstract data visualisation: glowing transaction lines flowing between nodes over a deep navy background, teal and cyan highlights, subtle grid, cinematic depth. No text, no letters, no numbers, no logos, no people, no currency symbols.`
}

/** First cover model this key can use (models.retrieve proves access, not billing). */
export async function resolveCoverModel(openai: OpenAI): Promise<string | null> {
  for (const m of COVER_MODELS) {
    try {
      await openai.models.retrieve(m)
      return m
    } catch {
      /* try the next one */
    }
  }
  return null
}

export type CoverResult = { url: string; bytes: number; model: string; ms: number }

/**
 * Generate one webp cover and upload it to the public `blog-images` bucket at
 * blog/<slug>-<ts>.webp. Throws on any failure; callers treat a missing cover
 * as non-fatal (the next run's self-heal step fills it).
 */
export async function generateCover(opts: {
  openai: OpenAI
  sb: any
  slug: string
  prompt: string
  quality?: 'low' | 'medium' | 'high'
  model?: string
}): Promise<CoverResult> {
  const t0 = Date.now()
  const model = opts.model || COVER_MODELS[0]
  const res: any = await opts.openai.images.generate({
    model,
    prompt: opts.prompt,
    n: 1,
    size: COVER_SIZE,
    quality: opts.quality || 'medium',
    output_format: 'webp',
    output_compression: 80,
  } as any)
  const b64 = res?.data?.[0]?.b64_json
  if (!b64) throw new Error('image model returned no b64_json')
  const buf = Buffer.from(b64, 'base64')
  const path = `blog/${opts.slug}-${Date.now()}.webp`
  const { error } = await opts.sb.storage.from('blog-images').upload(path, buf, { contentType: 'image/webp', upsert: true })
  if (error) throw new Error(`upload failed: ${error.message}`)
  const { data } = opts.sb.storage.from('blog-images').getPublicUrl(path)
  const url = data?.publicUrl
  if (!url) throw new Error('no public URL for the uploaded cover')
  return { url, bytes: buf.length, model, ms: Date.now() - t0 }
}

/** The cover is the page's LCP image: eager, high priority, fixed dimensions. */
export function coverImgTag(url: string, alt: string): string {
  const safeAlt = String(alt || '').replace(/["<>]/g, '').slice(0, 140)
  return `<img src="${url}" width="${COVER_WIDTH}" height="${COVER_HEIGHT}" loading="eager" fetchpriority="high" decoding="async" alt="${safeAlt}">`
}

/** Prepend the cover unless the body already starts with an image. */
export function withCover(html: string, url: string, alt: string): string {
  const body = String(html || '').trimStart()
  if (/^<img\b/i.test(body)) return body
  return `${coverImgTag(url, alt)}\n${body}`
}
