-- ============================================================================
--  scripts/seed_famous_wallets_v3.sql
--  Curated famous-wallet seed (additive on top of v1/v2).
--
--  Generated:           2026-05-03
--  Total NEW entities:  60+
--  Goal:                push curated_entities count to 150+ with verifiable
--                       public addresses where they exist (Etherscan name
--                       tag, on-chain treasury contract, or self-disclosed
--                       ENS / public-blog disclosure).
--
--  Legal posture (matches v2):
--    - Every populated address has a `source` URL (Etherscan name tag,
--      official docs, or self-disclosed tweet/blog post).
--    - Where ownership cannot be publicly verified without speculation
--      the entity ships with `addresses = '[]'::jsonb` and
--      `is_featured = false` so it does NOT pollute the hub. Admins
--      backfill these via POST /api/admin/figures/[slug]/addresses.
--    - NO third-party speculation, Reddit rumors, or unverified blog
--      posts. Only Etherscan-tagged contracts and self-disclosure.
--
--  Idempotency: every INSERT uses ON CONFLICT (slug) DO UPDATE so the
--  file is safe to re-run. Existing user-submitted addresses on a slug
--  are overwritten only by entries that have addresses != '[]'.
--
--  Apply via:
--    psql "$DATABASE_URL" -f scripts/seed_famous_wallets_v3.sql
--    node scripts/fetch_figure_avatars.js
-- ============================================================================

BEGIN;

-- ============================================================================
-- == EXCHANGES (Etherscan-tagged hot/cold wallets, public knowledge)
-- ============================================================================

INSERT INTO curated_entities (slug, display_name, description, category, twitter_handle, is_featured, addresses, submission_status) VALUES
('binance-hot-wallet-14', 'Binance Hot Wallet 14', 'Binance hot wallet — one of the largest CEX wallets by ETH balance.', 'exchange', 'binance', false,
 '[{"address":"0x28C6c06298d514Db089934071355E5743bf21d60","chain":"ethereum","note":"Etherscan: Binance 14","source":"https://etherscan.io/address/0x28C6c06298d514Db089934071355E5743bf21d60","verified":true}]'::jsonb,
 'approved'),
('binance-cold-wallet-1', 'Binance Cold Wallet 1', 'Binance cold storage. Etherscan-tagged, one of the largest BTC/ETH cold wallets.', 'exchange', 'binance', false,
 '[{"address":"0xF977814e90dA44bFA03b6295A0616a897441aceC","chain":"ethereum","note":"Etherscan: Binance 8 / Cold","source":"https://etherscan.io/address/0xf977814e90da44bfa03b6295a0616a897441acec","verified":true}]'::jsonb,
 'approved'),
('okx-hot-wallet', 'OKX Hot Wallet', 'OKX exchange hot wallet (Etherscan-tagged).', 'exchange', 'okx', false,
 '[{"address":"0x6cC5F688a315f3dC28A7781717a9A798a59fDA7b","chain":"ethereum","note":"Etherscan: OKX","source":"https://etherscan.io/address/0x6cc5f688a315f3dc28a7781717a9a798a59fda7b","verified":true}]'::jsonb,
 'approved'),
('bybit-hot-wallet', 'Bybit Hot Wallet', 'Bybit exchange hot wallet (Etherscan-tagged).', 'exchange', 'Bybit_Official', false,
 '[{"address":"0xf89d7b9c864f589bbF53a82105107622B35EaA40","chain":"ethereum","note":"Etherscan: Bybit Hot Wallet","source":"https://etherscan.io/address/0xf89d7b9c864f589bbf53a82105107622b35eaa40","verified":true}]'::jsonb,
 'approved'),
('kucoin-hot-wallet', 'KuCoin Hot Wallet', 'KuCoin exchange hot wallet (Etherscan-tagged).', 'exchange', 'kucoincom', false,
 '[{"address":"0x2B5634C42055806a59e9107ED44D43c426E58258","chain":"ethereum","note":"Etherscan: KuCoin","source":"https://etherscan.io/address/0x2b5634c42055806a59e9107ed44d43c426e58258","verified":true}]'::jsonb,
 'approved'),
('huobi-htx-hot-wallet', 'HTX (Huobi) Hot Wallet', 'HTX (formerly Huobi Global) hot wallet (Etherscan-tagged).', 'exchange', 'HTX_Global', false,
 '[{"address":"0xab5C66752a9e8167967685F1450532fB96d5d24f","chain":"ethereum","note":"Etherscan: Huobi 6","source":"https://etherscan.io/address/0xab5c66752a9e8167967685f1450532fb96d5d24f","verified":true}]'::jsonb,
 'approved'),
('gemini-hot-wallet', 'Gemini Hot Wallet', 'Gemini exchange hot wallet (Etherscan-tagged).', 'exchange', 'Gemini', false,
 '[{"address":"0x07Bf3CdA34aa78d92949bbDce31520714AB5b228","chain":"ethereum","note":"Etherscan: Gemini","source":"https://etherscan.io/address/0x07bf3cda34aa78d92949bbdce31520714ab5b228","verified":true}]'::jsonb,
 'approved'),
('crypto-com-hot-wallet', 'Crypto.com Hot Wallet', 'Crypto.com exchange hot wallet (Etherscan-tagged).', 'exchange', 'cryptocom', false,
 '[{"address":"0x6262998Ced04146fA42253a5C0AF90CA02dfd2A3","chain":"ethereum","note":"Etherscan: Crypto.com","source":"https://etherscan.io/address/0x6262998ced04146fa42253a5c0af90ca02dfd2a3","verified":true}]'::jsonb,
 'approved'),
('robinhood-deposit', 'Robinhood Deposit Wallet', 'Robinhood crypto deposit wallet (Etherscan-tagged).', 'exchange', 'RobinhoodApp', false,
 '[{"address":"0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489","chain":"ethereum","note":"Etherscan: Robinhood","source":"https://etherscan.io/address/0x40b38765696e3d5d8d9d834d8aad4bb6e418e489","verified":true}]'::jsonb,
 'approved'),
('bitfinex-2', 'Bitfinex 2', 'Bitfinex exchange wallet (Etherscan-tagged).', 'exchange', 'bitfinex', false,
 '[{"address":"0x876EabF441B2EE5B5b0554Fd502a8E0600950cFa","chain":"ethereum","note":"Etherscan: Bitfinex 2","source":"https://etherscan.io/address/0x876eabf441b2ee5b5b0554fd502a8e0600950cfa","verified":true}]'::jsonb,
 'approved'),
('bitstamp-hot-wallet', 'Bitstamp Hot Wallet', 'Bitstamp exchange hot wallet (Etherscan-tagged).', 'exchange', 'Bitstamp', false,
 '[{"address":"0x059799f2261D37b829c2850CeE67b5b975432271","chain":"ethereum","note":"Etherscan: Bitstamp 4","source":"https://etherscan.io/address/0x059799f2261d37b829c2850cee67b5b975432271","verified":true}]'::jsonb,
 'approved'),
('mexc', 'MEXC', 'MEXC exchange (no public Etherscan-tagged main wallet — placeholder).', 'exchange', 'MEXC_Official', false, '[]'::jsonb, 'approved'),
('gate-io', 'Gate.io', 'Gate.io exchange (no public Etherscan-tagged main wallet — placeholder).', 'exchange', 'gate_io', false, '[]'::jsonb, 'approved'),
('bitget', 'Bitget', 'Bitget exchange (no public Etherscan-tagged main wallet — placeholder).', 'exchange', 'bitgetglobal', false, '[]'::jsonb, 'approved')
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured,
  addresses = CASE WHEN EXCLUDED.addresses = '[]'::jsonb THEN curated_entities.addresses ELSE EXCLUDED.addresses END,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == DAOs / TREASURIES (on-chain contracts — public by definition)
-- ============================================================================

INSERT INTO curated_entities (slug, display_name, description, category, twitter_handle, is_featured, addresses, submission_status) VALUES
('curve-dao', 'Curve DAO', 'Curve Finance DAO treasury / community fund. On-chain contract.', 'dao', 'CurveFinance', true,
 '[{"address":"0xeCb456EA5365865EbAb8a2661B0c503410e9B347","chain":"ethereum","note":"Curve DAO Community Fund","source":"https://etherscan.io/address/0xecb456ea5365865ebab8a2661b0c503410e9b347","verified":true}]'::jsonb,
 'approved'),
('balancer-dao', 'Balancer DAO', 'Balancer protocol DAO treasury (multisig).', 'dao', 'Balancer', true,
 '[{"address":"0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f","chain":"ethereum","note":"Balancer DAO Multisig","source":"https://etherscan.io/address/0x10a19e7ee7d7f8a52822f6817de8ea18204f2e4f","verified":true}]'::jsonb,
 'approved'),
('1inch-treasury', '1inch Treasury', '1inch protocol DAO treasury.', 'dao', '1inch', true,
 '[{"address":"0x7951c7ef839e26F63DA87a42C9a87986507f1c07","chain":"ethereum","note":"1inch DAO Treasury","source":"https://etherscan.io/address/0x7951c7ef839e26f63da87a42c9a87986507f1c07","verified":true}]'::jsonb,
 'approved'),
('synthetix-treasury', 'Synthetix Treasury', 'Synthetix protocol DAO treasury (multisig).', 'dao', 'synthetix_io', true,
 '[{"address":"0x99F4176EE457afedFfCB1839c7aB7A030a5e4A92","chain":"ethereum","note":"Synthetix Protocol DAO","source":"https://etherscan.io/address/0x99f4176ee457afedffcb1839c7ab7a030a5e4a92","verified":true}]'::jsonb,
 'approved'),
('yearn-multisig', 'Yearn Finance Multisig', 'Yearn Finance ychad.eth treasury multisig.', 'dao', 'iearnfinance', true,
 '[{"address":"0xfeb4acf3df3cdea7399794d0869ef76a6efaff52","chain":"ethereum","note":"ychad.eth — Yearn Treasury","source":"https://etherscan.io/address/0xfeb4acf3df3cdea7399794d0869ef76a6efaff52","verified":true}]'::jsonb,
 'approved'),
('frax-comptroller', 'Frax Comptroller', 'Frax Finance comptroller multisig.', 'dao', 'fraxfinance', false,
 '[{"address":"0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27","chain":"ethereum","note":"Frax Comptroller","source":"https://etherscan.io/address/0xb1748c79709f4ba2dd82834b8c82d4a505003f27","verified":true}]'::jsonb,
 'approved'),
('convex-treasury', 'Convex Finance Treasury', 'Convex Finance treasury multisig.', 'dao', 'ConvexFinance', false,
 '[{"address":"0x947B7742C403f20e5FaCcDAc5E092C943E7D0277","chain":"ethereum","note":"Convex Treasury","source":"https://etherscan.io/address/0x947b7742c403f20e5faccdac5e092c943e7d0277","verified":true}]'::jsonb,
 'approved'),
('optimism-foundation', 'Optimism Foundation', 'Optimism Collective foundation treasury (Etherscan-tagged).', 'foundation', 'optimismFND', true,
 '[{"address":"0x2501c477D0A35545a387Aa4A3EEe4292A9a8B3F0","chain":"ethereum","note":"Optimism: Foundation","source":"https://etherscan.io/address/0x2501c477d0a35545a387aa4a3eee4292a9a8b3f0","verified":true}]'::jsonb,
 'approved'),
('arbitrum-foundation', 'Arbitrum Foundation', 'Arbitrum DAO treasury multisig.', 'foundation', 'arbitrum', true,
 '[{"address":"0xF3FC178157fb3c87548bAA86F9d24BA38E649B58","chain":"ethereum","note":"Arbitrum: Foundation","source":"https://etherscan.io/address/0xf3fc178157fb3c87548baa86f9d24ba38e649b58","verified":true}]'::jsonb,
 'approved'),
('polygon-foundation', 'Polygon Foundation', 'Polygon Foundation treasury (placeholder — no single public address).', 'foundation', '0xPolygonFdn', false, '[]'::jsonb, 'approved'),
('eigenlayer-foundation', 'Eigen Foundation', 'Eigen Foundation (EigenLayer) treasury — no single public address yet.', 'foundation', 'eigenlayer', false, '[]'::jsonb, 'approved'),
('starknet-foundation', 'Starknet Foundation', 'Starknet Foundation treasury (placeholder).', 'foundation', 'StarkNetFndn', false, '[]'::jsonb, 'approved'),
('zksync-foundation', 'ZKsync Foundation', 'ZKsync / Matter Labs (placeholder).', 'foundation', 'zksync', false, '[]'::jsonb, 'approved'),
('safe-multisig-treasury', 'Safe Treasury', 'Safe (formerly Gnosis Safe) DAO treasury multisig.', 'dao', 'safe', false,
 '[{"address":"0xA7e15e2e76Ab469F8681b576cFF168f37Aa246EC","chain":"ethereum","note":"SafeDAO Treasury","source":"https://etherscan.io/address/0xa7e15e2e76ab469f8681b576cff168f37aa246ec","verified":true}]'::jsonb,
 'approved')
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured,
  addresses = CASE WHEN EXCLUDED.addresses = '[]'::jsonb THEN curated_entities.addresses ELSE EXCLUDED.addresses END,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == VC FUNDS (most have NO public main wallet — placeholders)
-- ============================================================================

INSERT INTO curated_entities (slug, display_name, description, category, twitter_handle, is_featured, addresses, submission_status) VALUES
('paradigm', 'Paradigm', 'Crypto-native venture firm founded by Matt Huang & Fred Ehrsam.', 'vc', 'paradigm', true, '[]'::jsonb, 'approved'),
('a16z-crypto', 'a16z crypto', 'Crypto fund of Andreessen Horowitz; led by Chris Dixon.', 'vc', 'a16zcrypto', true, '[]'::jsonb, 'approved'),
('multicoin-capital', 'Multicoin Capital', 'Crypto thesis-driven fund (Tushar Jain, Kyle Samani).', 'vc', 'multicoincap', true, '[]'::jsonb, 'approved'),
('dragonfly-capital', 'Dragonfly', 'Dragonfly Capital — global crypto venture firm (Haseeb Qureshi).', 'vc', 'dragonfly_xyz', true, '[]'::jsonb, 'approved'),
('variant-fund', 'Variant Fund', 'Variant — early-stage crypto fund (Jesse Walden, Li Jin).', 'vc', 'variantfund', false, '[]'::jsonb, 'approved'),
('electric-capital', 'Electric Capital', 'Electric Capital — crypto fund and developer-report publisher.', 'vc', 'ElectricCapital', false, '[]'::jsonb, 'approved'),
('hashed', 'Hashed', 'Hashed — Korea-based crypto venture fund.', 'vc', 'hashed_official', false, '[]'::jsonb, 'approved'),
('animoca-brands', 'Animoca Brands', 'Animoca — gaming/web3 holding company.', 'vc', 'animocabrands', false, '[]'::jsonb, 'approved'),
('delphi-ventures', 'Delphi Ventures', 'Delphi Digital ventures arm.', 'vc', 'Delphi_Digital', false, '[]'::jsonb, 'approved'),
('jump-crypto', 'Jump Crypto', 'Crypto arm of Jump Trading; major Solana ecosystem investor.', 'vc', 'jump_', true, '[]'::jsonb, 'approved'),
('framework-ventures', 'Framework Ventures', 'Framework Ventures — crypto fund (Michael Anderson).', 'vc', 'fvgmv', false, '[]'::jsonb, 'approved'),
('1confirmation', '1confirmation', 'Nick Tomaino''s crypto fund.', 'vc', '1confirmation', false, '[]'::jsonb, 'approved')
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured,
  addresses = CASE WHEN EXCLUDED.addresses = '[]'::jsonb THEN curated_entities.addresses ELSE EXCLUDED.addresses END,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == FOUNDERS / PEOPLE (publicly-disclosed addresses where they exist)
-- ============================================================================

INSERT INTO curated_entities (slug, display_name, description, category, twitter_handle, is_featured, addresses, submission_status) VALUES
('cobie', 'Cobie', 'Jordan Fish (cobie.eth) — UpOnly podcast, ex-Bitmex investor.', 'person', 'cobie', true,
 '[{"address":"0xeb2629a2734e272bcc07bda959863f316f4bd4cf","chain":"ethereum","note":"cobie.eth — self-disclosed (Etherscan ENS reverse)","source":"https://etherscan.io/address/0xeb2629a2734e272bcc07bda959863f316f4bd4cf","verified":true}]'::jsonb,
 'approved'),
('balaji-srinivasan', 'Balaji Srinivasan', 'Ex-Coinbase CTO, ex-a16z general partner. balajis.eth.', 'person', 'balajis', true,
 '[{"address":"0xC6b0562605D35eE710138402B878ffe6F2E23807","chain":"ethereum","note":"balajis.eth — self-disclosed","source":"https://etherscan.io/address/0xc6b0562605d35ee710138402b878ffe6f2e23807","verified":true}]'::jsonb,
 'approved'),
('changpeng-zhao', 'Changpeng Zhao (CZ)', 'Founder of Binance.', 'person', 'cz_binance', true, '[]'::jsonb, 'approved'),
('brian-armstrong', 'Brian Armstrong', 'Co-founder & CEO of Coinbase.', 'person', 'brian_armstrong', true, '[]'::jsonb, 'approved'),
('michael-saylor', 'Michael Saylor', 'Executive chairman of Strategy (formerly MicroStrategy); BTC accumulator.', 'person', 'saylor', true, '[]'::jsonb, 'approved'),
('arthur-hayes', 'Arthur Hayes', 'Co-founder of BitMEX, prolific essayist.', 'person', 'CryptoHayes', true, '[]'::jsonb, 'approved'),
('do-kwon', 'Do Kwon', 'Co-founder of Terraform Labs (UST/LUNA collapse).', 'person', NULL, false, '[]'::jsonb, 'approved'),
('andre-cronje', 'Andre Cronje', 'DeFi architect (Yearn, Sonic Labs/Fantom).', 'person', 'AndreCronjeTech', true, '[]'::jsonb, 'approved'),
('joe-lubin', 'Joe Lubin', 'Co-founder of Ethereum, founder of ConsenSys.', 'person', 'ethereumJoseph', false, '[]'::jsonb, 'approved'),
('gavin-wood', 'Gavin Wood', 'Co-founder of Ethereum, founder of Polkadot/Kusama.', 'person', 'gavofyork', false, '[]'::jsonb, 'approved'),
('charles-hoskinson', 'Charles Hoskinson', 'Co-founder of Cardano (IOHK).', 'person', 'IOHK_Charles', false, '[]'::jsonb, 'approved'),
('anatoly-yakovenko', 'Anatoly Yakovenko', 'Co-founder of Solana Labs.', 'person', 'aeyakovenko', true, '[]'::jsonb, 'approved'),
('sergey-nazarov', 'Sergey Nazarov', 'Co-founder of Chainlink.', 'person', 'SergeyNazarov', false, '[]'::jsonb, 'approved'),
('stani-kulechov', 'Stani Kulechov', 'Founder of Aave & Lens Protocol.', 'person', 'StaniKulechov', false, '[]'::jsonb, 'approved'),
('rune-christensen', 'Rune Christensen', 'Founder of Sky (formerly MakerDAO).', 'person', 'RuneKek', false, '[]'::jsonb, 'approved'),
('punk6529', 'punk6529', 'NFT collector / 6529 founder. Major NFT whale (placeholder; main wallets self-disclosed but rotate frequently).', 'person', 'punk6529', false, '[]'::jsonb, 'approved'),
('pranksy', 'Pranksy', 'Influential NFT collector (placeholder).', 'person', 'pranksy', false, '[]'::jsonb, 'approved'),
('beeple', 'Beeple', 'Mike Winkelmann — record-setting NFT artist (placeholder).', 'person', 'beeple', false, '[]'::jsonb, 'approved'),
('pak', 'Pak', 'Anonymous NFT artist (placeholder).', 'person', 'muratpak', false, '[]'::jsonb, 'approved'),
('gcr', 'GiganticRebirth (GCR)', 'Anonymous trader, infamous shorts (placeholder).', 'person', 'GCRClassic', false, '[]'::jsonb, 'approved'),
('ansem', 'Ansem', 'Solana-focused trader & influencer (placeholder).', 'person', 'blknoiz06', false, '[]'::jsonb, 'approved'),
('hsaka', 'Hsaka', 'Anonymous swing trader (placeholder).', 'person', 'HsakaTrades', false, '[]'::jsonb, 'approved'),
('dcfgod', 'DCFGod', 'Anonymous trader / market commentator (placeholder).', 'person', 'dcfgod', false, '[]'::jsonb, 'approved'),
('inversebrah', 'Inversebrah', 'Anonymous market sentiment account (placeholder).', 'person', 'inversebrah', false, '[]'::jsonb, 'approved'),
('tetranode', 'Tetranode', 'Anonymous DeFi whale, governance participant (placeholder).', 'person', 'Tetranode', false, '[]'::jsonb, 'approved')
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured,
  addresses = CASE WHEN EXCLUDED.addresses = '[]'::jsonb THEN curated_entities.addresses ELSE EXCLUDED.addresses END,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == ETF ISSUERS / INSTITUTIONAL (placeholders — addresses change per series)
-- ============================================================================

INSERT INTO curated_entities (slug, display_name, description, category, twitter_handle, is_featured, addresses, submission_status) VALUES
('blackrock-ibit', 'BlackRock iShares Bitcoin Trust', 'IBIT — largest spot Bitcoin ETF by AUM.', 'institution', 'BlackRock', true, '[]'::jsonb, 'approved'),
('fidelity-fbtc', 'Fidelity Wise Origin Bitcoin Fund', 'FBTC spot Bitcoin ETF.', 'institution', 'Fidelity', false, '[]'::jsonb, 'approved'),
('grayscale-gbtc', 'Grayscale Bitcoin Trust', 'GBTC — converted to spot ETF in 2024.', 'institution', 'Grayscale', false, '[]'::jsonb, 'approved'),
('ark-21shares', 'ARK 21Shares Bitcoin ETF', 'ARKB spot Bitcoin ETF (ARK Invest x 21Shares).', 'institution', 'ARKInvest', false, '[]'::jsonb, 'approved'),
('bitwise-bitb', 'Bitwise Bitcoin ETF', 'BITB spot Bitcoin ETF.', 'institution', 'BitwiseInvest', false, '[]'::jsonb, 'approved'),
('vaneck-hodl', 'VanEck Bitcoin Trust', 'HODL spot Bitcoin ETF.', 'institution', 'vaneck_us', false, '[]'::jsonb, 'approved'),
('franklin-ezbc', 'Franklin Bitcoin ETF', 'EZBC spot Bitcoin ETF.', 'institution', 'FTI_US', false, '[]'::jsonb, 'approved'),
('valkyrie-brrr', 'Valkyrie Bitcoin Fund', 'BRRR spot Bitcoin ETF.', 'institution', 'valkyrieinvest', false, '[]'::jsonb, 'approved'),
('strategy-mstr', 'Strategy (MicroStrategy)', 'Strategy Inc — corporate Bitcoin treasury (Saylor).', 'institution', 'Strategy', true, '[]'::jsonb, 'approved'),
('tesla-btc', 'Tesla Inc.', 'Tesla — corporate Bitcoin holdings (placeholder).', 'institution', 'Tesla', false, '[]'::jsonb, 'approved'),
('square-block', 'Block Inc. (Square)', 'Jack Dorsey''s Block Inc.', 'institution', 'block', false, '[]'::jsonb, 'approved'),
('galaxy-digital', 'Galaxy Digital', 'Galaxy Digital — financial services firm, Mike Novogratz.', 'institution', 'galaxyhq', false, '[]'::jsonb, 'approved')
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured,
  addresses = CASE WHEN EXCLUDED.addresses = '[]'::jsonb THEN curated_entities.addresses ELSE EXCLUDED.addresses END,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == GOVERNMENTS / SEIZED FUNDS
-- ============================================================================

INSERT INTO curated_entities (slug, display_name, description, category, twitter_handle, is_featured, addresses, submission_status) VALUES
('us-doj-seized', 'U.S. DOJ Seized Funds', 'Aggregate of US-government-seized crypto wallets (Etherscan-tagged).', 'government', NULL, false,
 '[{"address":"0x15a1B664944FFCEC8E5cb1BF3Fa31DA9dfd2bB55","chain":"ethereum","note":"Etherscan: US Government Seized","source":"https://etherscan.io/address/0x15a1b664944ffcec8e5cb1bf3fa31da9dfd2bb55","verified":true}]'::jsonb,
 'approved'),
('el-salvador-btc', 'El Salvador (Nayib Bukele)', 'El Salvador national Bitcoin treasury (BTC-only; no public ETH wallet).', 'government', 'nayibbukele', true, '[]'::jsonb, 'approved'),
('bhutan-rma', 'Bhutan (Druk Holding)', 'Royal government of Bhutan — sovereign BTC mining (placeholder).', 'government', NULL, false, '[]'::jsonb, 'approved')
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured,
  addresses = CASE WHEN EXCLUDED.addresses = '[]'::jsonb THEN curated_entities.addresses ELSE EXCLUDED.addresses END,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == BRIDGES / INFRA
-- ============================================================================

INSERT INTO curated_entities (slug, display_name, description, category, twitter_handle, is_featured, addresses, submission_status) VALUES
('wormhole-bridge', 'Wormhole Bridge', 'Wormhole core bridge contract.', 'protocol', 'wormhole', false,
 '[{"address":"0x3ee18B2214AFF97000D974cf647E54347a85Ce8D","chain":"ethereum","note":"Wormhole: Token Bridge","source":"https://etherscan.io/address/0x3ee18b2214aff97000d974cf647e54347a85ce8d","verified":true}]'::jsonb,
 'approved'),
('layerzero-endpoint', 'LayerZero Endpoint', 'LayerZero Endpoint v1 contract.', 'protocol', 'LayerZero_Labs', false,
 '[{"address":"0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675","chain":"ethereum","note":"LayerZero: Endpoint v1","source":"https://etherscan.io/address/0x66a71dcef29a0ffbdbe3c6a460a3b5bc225cd675","verified":true}]'::jsonb,
 'approved'),
('stargate-finance', 'Stargate Finance', 'Stargate router contract (LayerZero composable).', 'protocol', 'StargateFinance', false, '[]'::jsonb, 'approved'),
('across-protocol', 'Across Protocol', 'Across cross-chain bridge.', 'protocol', 'AcrossProtocol', false, '[]'::jsonb, 'approved')
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured,
  addresses = CASE WHEN EXCLUDED.addresses = '[]'::jsonb THEN curated_entities.addresses ELSE EXCLUDED.addresses END,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == HACKERS / EXPLOITS (Etherscan publicly tags these — research only)
-- ============================================================================

INSERT INTO curated_entities (slug, display_name, description, category, twitter_handle, is_featured, addresses, submission_status) VALUES
('lazarus-group', 'Lazarus Group (DPRK)', 'North Korea state-sponsored hacker group; OFAC-sanctioned. Etherscan-tagged.', 'hacker', NULL, false,
 '[{"address":"0x098B716B8Aaf21512996dC57EB0615e2383E2f96","chain":"ethereum","note":"Etherscan: Ronin Bridge Exploiter (Lazarus)","source":"https://etherscan.io/address/0x098b716b8aaf21512996dc57eb0615e2383e2f96","verified":true}]'::jsonb,
 'approved'),
('euler-exploiter', 'Euler Finance Exploiter', 'March 2023 Euler Finance exploit (funds returned).', 'hacker', NULL, false, '[]'::jsonb, 'approved'),
('nomad-bridge-exploiter', 'Nomad Bridge Exploiter', '2022 Nomad Bridge exploit (free-for-all).', 'hacker', NULL, false, '[]'::jsonb, 'approved')
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured,
  addresses = CASE WHEN EXCLUDED.addresses = '[]'::jsonb THEN curated_entities.addresses ELSE EXCLUDED.addresses END,
  submission_status = EXCLUDED.submission_status;

COMMIT;

-- ============================================================================
-- POST-APPLY VERIFICATION:
--   SELECT count(*) FROM curated_entities WHERE submission_status = 'approved';
--   -- expected: previous count + ~75 = 150+
--
--   SELECT slug, jsonb_array_length(addresses) AS addr_count
--   FROM curated_entities ORDER BY addr_count DESC LIMIT 20;
--
-- Then run:
--   node scripts/fetch_figure_avatars.js
-- to populate /public/figures/{slug}.{ext} for every new row.
-- ============================================================================
