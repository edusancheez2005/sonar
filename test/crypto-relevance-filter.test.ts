import { describe, it, expect } from 'vitest'
import { isCryptoRelevant, isGeneralCryptoRelevant } from '@/lib/crypto-relevance-filter'

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

// Real articles that leaked into the News Terminal on 2026-07-12. The old
// substring keyword regex let the topic word certify its own feed ("al sol"
// matched keyword 'sol') and matched keywords inside words ("iconic" → 'ico'),
// which skipped the ambiguous-ticker full-name requirement entirely.
describe('isCryptoRelevant — substring keyword leaks (2026-07-12 regression)', () => {
  it('drops Spanish soccer article ("al sol") tagged SOL', () => {
    const text =
      'Sergio Ramos y Dani Ceballos, los jueves al sol - AS.com ' +
      'Los dos ex del Real Madrid, libres de contrato ahora mismo, posaron junto a ' +
      'Lucas Vázquez tras una sesión de entrenamiento para preparar la temporada.'
    expect(isCryptoRelevant(text, 'SOL')).toBe(false)
  })
  it('drops Sarawak bridge article ("iconic ... vital link") tagged LINK', () => {
    const text =
      'New 4.8km Batang Lupar I bridge a blessing for the local community | The Star ' +
      'SEBUYAU (Sarawak): The new Batang Lupar I bridge is not merely an iconic structure ' +
      'but a vital link for the local community, improving connectivity and boosting the economy.'
    expect(isCryptoRelevant(text, 'LINK')).toBe(false)
  })
  it('drops OpenAI model announcement ("Sol" tier) tagged SOL', () => {
    const text =
      'OpenAIが新AI「GPT-5.6」を発表。最上位SolはFable 5/Mythos 5級の超高性能モデル | ギズモード・ジャパン ' +
      'OpenAIが新AI「GPT-5.6」を発表しました。競合Anthropicの最先端モデル「Fable 5/Mythos 5」と同クラスの' +
      'ベンチマークを示す、超高性能モデルです。'
    expect(isCryptoRelevant(text, 'SOL')).toBe(false)
  })

  it('keeps Chainlink article tagged LINK', () => {
    expect(
      isCryptoRelevant("Chainlink's Arbitrum Orbit Integration Targets The Security Gap In Layer-3 Messaging", 'LINK')
    ).toBe(true)
  })
  it('keeps whale/Coinbase article tagged BTC', () => {
    expect(
      isCryptoRelevant('Bitcoin whales sent BTC price to $64K as Coinbase Premium broke key level: CryptoQuant', 'BTC')
    ).toBe(true)
  })
  it('keeps cashtag-only article tagged SOL', () => {
    expect(isCryptoRelevant('$SOL breaks out of its weekly range', 'SOL')).toBe(true)
  })
})

// BTC/ETH are self-vouching: the bare ticker counts as a crypto signal even
// on its own feed, so crime/politics stories that are genuinely about the
// asset survive the non-crypto keyword veto.
describe('isCryptoRelevant — BTC/ETH bare tickers are self-vouching', () => {
  it('keeps BTC-only crime story tagged BTC', () => {
    expect(isCryptoRelevant('Police arrest suspects who stole BTC in exchange heist', 'BTC')).toBe(true)
  })
  it('keeps ETH-only story with non-crypto words tagged ETH', () => {
    expect(isCryptoRelevant('Hospital fund converts donation to ETH amid covid budget shortfall', 'ETH')).toBe(true)
  })
})

// Category-feed rows (ticker GENERAL) had no relevance gate at all, so
// general tech/AI stories from crypto outlets flooded the terminal.
describe('isGeneralCryptoRelevant — GENERAL category feed', () => {
  const drop = [
    'Apple Sues OpenAI, Claims Former Employees Stole Trade Secrets. Apple alleges former employees took confidential designs, supplier information, and engineering files before joining OpenAI.',
    'Xbox CEO Joins Fed AI Jobs Task Force Days After Announcing 3,200 Layoffs. Asha Sharma will advise the Federal Reserve on AI’s impact on jobs and productivity.',
    "Nano Banana 2 Lite vs. Nano Banana 2: When to Save Your Money and When to Upgrade. Google's cheapest, fastest image model is a genuinely capable tool.",
    'How to Make Product Ads With AI for TikTok and YouTube—For (Almost) Free. One product photo, three AI tools, and about 20 minutes.',
  ]
  for (const text of drop) {
    it(`drops: ${text.slice(0, 50)}`, () => {
      expect(isGeneralCryptoRelevant(text)).toBe(false)
    })
  }

  const keep = [
    "Meta's Chief Data Officer Says Agentic Commerce is the Next Tier of Business. Alex Schultz says stablecoins are assumed inside Meta.",
    'Circle Stock Jumps as Stablecoin Issuer Wins Final Federal Banking Charter Approval',
    'Backpack joins race for 24/7 stock markets with tokenized equities',
    'Robinhood says its AI agent feature will soon be assisting crypto traders',
    'US CBDC ban to go into effect without Trump signoff on housing bill',
    'Polymarket seeks approval to bring margin trading to U.S. customers',
  ]
  for (const text of keep) {
    it(`keeps: ${text.slice(0, 50)}`, () => {
      expect(isGeneralCryptoRelevant(text)).toBe(true)
    })
  }
})
