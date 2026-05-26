/**
 * Tests for hasNonTickerSurface — the Stage A guard that prevents the
 * legacy ticker extractor from false-positive-matching wallet addresses
 * and article URLs as crypto tickers.
 *
 * The two failure modes reported by the user on 2026-05-26:
 *   1. "what is wallet 0x28C6c06298d514Db089934071355E5743bf21d60 doing"
 *      → extractor matched "0x" → ZRX → wallet_lookup router never ran.
 *   2. "explain this article: https://decrypt.co/..../uniswap-..."
 *      → extractor matched "uni" → UNI → article_explain router never ran.
 *
 * Both must return true from hasNonTickerSurface so the route handler
 * suppresses the extractor's guess and hands the message to the router.
 */
import { describe, expect, it } from 'vitest'
import { hasNonTickerSurface } from '../lib/orca/non-ticker-surface'

describe('hasNonTickerSurface', () => {
  describe('wallet addresses are detected', () => {
    it('detects an Ethereum / EVM address (the bug the user hit)', () => {
      expect(
        hasNonTickerSurface(
          'what is wallet 0x28C6c06298d514Db089934071355E5743bf21d60 doing'
        )
      ).toBe(true)
    })

    it('detects an EVM address with mixed case', () => {
      expect(
        hasNonTickerSurface('show me 0xAbCdEf0123456789AbCdEf0123456789AbCdEf01')
      ).toBe(true)
    })

    it('detects a Tron address', () => {
      expect(
        hasNonTickerSurface('lookup TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7')
      ).toBe(true)
    })

    it('detects a legacy bitcoin address', () => {
      expect(
        hasNonTickerSurface('check 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
      ).toBe(true)
    })

    it('detects a bech32 bitcoin address', () => {
      expect(
        hasNonTickerSurface('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq please')
      ).toBe(true)
    })

    it('detects a Solana base58 address', () => {
      expect(
        hasNonTickerSurface('what is 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU doing')
      ).toBe(true)
    })

    it('detects an XRP address', () => {
      expect(
        hasNonTickerSurface('audit rUocf7iPVuPbBerMNUuP1eYTPq2nWzZkS3')
      ).toBe(true)
    })

    it('detects an ABBREVIATED EVM address with ascii ellipsis (the 2026-05-26 regression)', () => {
      expect(hasNonTickerSurface('0x28C6...d60')).toBe(true)
      expect(hasNonTickerSurface('what is 0x28C6...d60 doing')).toBe(true)
    })

    it('detects an ABBREVIATED EVM address with unicode ellipsis (…)', () => {
      expect(hasNonTickerSurface('0x28C6\u2026d60')).toBe(true)
      expect(hasNonTickerSurface('look up 0xAbCd\u2026FfEe')).toBe(true)
    })

    it('detects "wallet 0x..." even with very short hex tail', () => {
      expect(hasNonTickerSurface('wallet 0xdeadbeef')).toBe(true)
      expect(hasNonTickerSurface('what is address 0x123 holding')).toBe(true)
    })
  })

  describe('URLs are detected', () => {
    it('detects an https article URL', () => {
      expect(
        hasNonTickerSurface(
          'explain this article: https://decrypt.co/2026/05/26/uniswap-v5-launches'
        )
      ).toBe(true)
    })

    it('detects an http URL', () => {
      expect(hasNonTickerSurface('see http://example.com/news')).toBe(true)
    })

    it('detects URLs that contain words mapped to tickers', () => {
      // /op/ inside the URL would map to OP; /uni inside the URL would map to UNI
      expect(
        hasNonTickerSurface(
          'what does this mean? https://www.coindesk.com/markets/2026/05/26/op-and-uniswap-rally/'
        )
      ).toBe(true)
    })
  })

  describe('clean ticker prompts are NOT flagged', () => {
    it('does not flag a plain BTC question', () => {
      expect(hasNonTickerSurface('what is btc doing today')).toBe(false)
    })

    it('does not flag a SOL follow-up', () => {
      expect(hasNonTickerSurface('and 7d?')).toBe(false)
    })

    it('does not flag a ZRX question with no address', () => {
      expect(hasNonTickerSurface('tell me about zrx')).toBe(false)
    })

    it('does not flag empty / null input', () => {
      expect(hasNonTickerSurface('')).toBe(false)
      // @ts-expect-error — runtime guard
      expect(hasNonTickerSurface(undefined)).toBe(false)
      // @ts-expect-error — runtime guard
      expect(hasNonTickerSurface(null)).toBe(false)
    })

    it('does not flag short hex-like words that are NOT 40-char EVM addresses', () => {
      expect(hasNonTickerSurface('the price hit 0xff')).toBe(false)
      expect(hasNonTickerSurface('0xdeadbeef is famous')).toBe(false)
    })
  })
})
