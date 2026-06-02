import { describe, it, expect } from 'vitest'
import { isCryptoRelevant } from '@/lib/crypto-relevance-filter'

describe('isCryptoRelevant — ambiguous SOL false positives', () => {
  const drop = [
    ["WWE's Sol Ruca Opens Up About Fans Questioning Her Racial Identity - Yahoo Sports", 'SOL'],
    ['Fin des matelas au sol, création de quartiers haute sécurité', 'SOL'],
    ['El espejo catalán del tren de la Costa del Sol: 5.200 millones para Barcelona', 'SOL'],
    ['TD Cowen initiates Sol Gel stock with buy on dermatology drug', 'SOL'],
    ["Bad Bunny se une al elenco de 'Toy Story 5'", 'SOL'],
    ['La conexión de Zapatero con el cantante Luis Miguel: el consuegro del Sol de México', 'SOL'],
  ] as const
  for (const [title, ticker] of drop) {
    it(`drops: ${title.slice(0, 40)}`, () => {
      expect(isCryptoRelevant(title, ticker)).toBe(false)
    })
  }

  const keep = [
    ['Bitwise leads Solana spot ETFs with $80M in May inflows', 'SOL'],
    ['Solana price eyes breakout as staking volume surges', 'SOL'],
  ] as const
  for (const [title, ticker] of keep) {
    it(`keeps: ${title.slice(0, 40)}`, () => {
      expect(isCryptoRelevant(title, ticker)).toBe(true)
    })
  }
})

describe('isCryptoRelevant — other ambiguous tickers', () => {
  it('drops Ada Lovelace article tagged ADA', () => {
    expect(isCryptoRelevant('Ada Lovelace Day celebrates women in science', 'ADA')).toBe(false)
  })
  it('keeps Cardano article tagged ADA', () => {
    expect(isCryptoRelevant('Cardano launches new governance upgrade', 'ADA')).toBe(true)
  })
  it('drops "a ton of" article tagged TON', () => {
    expect(isCryptoRelevant('Stars share a ton of behind-the-scenes photos', 'TON')).toBe(false)
  })
  it('keeps Toncoin article tagged TON', () => {
    expect(isCryptoRelevant('Toncoin integrates with Telegram wallet', 'TON')).toBe(true)
  })
})
