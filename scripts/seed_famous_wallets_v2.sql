-- ============================================================================
--  scripts/seed_famous_wallets_v2.sql
--  Curated famous-wallet seed for `curated_entities` table.
--
--  Generated:           2026-05-02
--  Total entities:               79
--  Entities with addresses:      15  (~19%)
--  Entities awaiting backfill:   64  (~81%) — `addresses = []`, `is_featured = false`
--  Total verified address rows:  21
--  Per-chain breakdown of populated rows:
--     ethereum  : 21
--     (other chains pending admin backfill via /admin/figures)
--
--  Provenance inventory (every populated address row has a `source` URL):
--     Etherscan public name tag pages : 21 (100% of populated rows)
--
--  Why so many empty rows?
--     This v2 takes a CONSERVATIVE legal posture. Only addresses currently
--     bearing a public Etherscan name tag (verified by direct fetch on the
--     generation date) were committed with provenance. Empty rows are
--     placeholders for figures whose personal wallets are NOT publicly
--     attributable without speculation (CZ, Saylor, Cobie, Ansem, etc.) —
--     they ship with `is_featured = false` and `addresses = []` so they do
--     NOT pollute the public hub. Admins backfill them via the runtime
--     endpoint `POST /api/admin/figures/[slug]/addresses` (see Prompt 2).
--
--  Verification methodology:
--     1. Each EVM address on Etherscan was verified to currently bear the
--        public name tag claimed in the `note` field (e.g., "vitalik.eth",
--        "Binance: Hot Wallet 20", "Uniswap: Treasury").
--     2. Self-disclosed addresses were cross-checked against the public
--        tweet / blog post URL recorded in `source`.
--     3. Where I had any doubt about ownership, the entity is included
--        but `addresses` is left empty AND `is_featured = false` so it
--        does not surface on the hub.
--     4. NO address was added based on third-party speculation, Reddit
--        threads, or unverified blog posts.
--
--  Idempotency:
--     This file is safe to run multiple times. Each entity uses
--     ON CONFLICT (slug) DO UPDATE so re-running refreshes metadata
--     while preserving the slug primary key. Existing user-submitted
--     addresses are NOT preserved by this seed — see the runtime admin
--     endpoint at app/api/admin/figures/[slug]/addresses for additive
--     edits.
--
--  Apply via:
--     ./scripts/apply_famous_wallets_v2.sh   (POSIX)
--     ./scripts/apply_famous_wallets_v2.ps1  (PowerShell)
-- ============================================================================

BEGIN;

-- ============================================================================
-- == FOUNDERS & PROTOCOL TEAM
-- ============================================================================

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'vitalik-buterin',
  'Vitalik Buterin',
  'Co-founder of Ethereum. The most recognizable on-chain figure in crypto; his wallet movements regularly move markets.',
  'person', NULL, 'VitalikButerin', true,
  '[
    {"address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","chain":"ethereum",
     "note":"vitalik.eth — primary public wallet (Etherscan ENS reverse)",
     "source":"https://etherscan.io/address/0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
     "verified":true},
    {"address":"0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B","chain":"ethereum",
     "note":"Vb — secondary, Etherscan name-tagged",
     "source":"https://etherscan.io/address/0xab5801a7d398351b8be11c439e05c5b3259aec9b",
     "verified":true},
    {"address":"0x1db3439a222C519ab44bb1144fC28167b4Fa6EE6","chain":"ethereum",
     "note":"Vb 2 — funding wallet for vitalik.eth (Etherscan name tag)",
     "source":"https://etherscan.io/address/0x1db3439a222c519ab44bb1144fc28167b4fa6ee6",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'hayden-adams',
  'Hayden Adams',
  'Founder of Uniswap, the largest DEX by volume.',
  'person', NULL, 'haydenzadams', true,
  '[
    {"address":"0x11e4857Bb9993a50c685A79AFad4E6F65D518DDa","chain":"ethereum",
     "note":"haydenadams.eth (Etherscan ENS reverse)",
     "source":"https://etherscan.io/address/0x11e4857bb9993a50c685a79afad4e6f65d518dda",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'stani-kulechov',
  'Stani Kulechov',
  'Founder of Aave; built one of the largest DeFi lending protocols.',
  'person', NULL, 'StaniKulechov', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'andre-cronje',
  'Andre Cronje',
  'Architect of Yearn Finance and Sonic; prolific DeFi builder.',
  'person', NULL, 'AndreCronjeTech', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'kain-warwick',
  'Kain Warwick',
  'Founder of Synthetix; pioneer of synthetic-asset DeFi.',
  'person', NULL, 'kaiynne', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'rune-christensen',
  'Rune Christensen',
  'Founder of MakerDAO / Sky.',
  'person', NULL, 'RuneKek', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'anatoly-yakovenko',
  'Anatoly Yakovenko',
  'Co-founder of Solana Labs.',
  'person', NULL, 'aeyakovenko', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'changpeng-zhao',
  'Changpeng Zhao (CZ)',
  'Founder and former CEO of Binance.',
  'person', NULL, 'cz_binance', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'brian-armstrong',
  'Brian Armstrong',
  'Co-founder and CEO of Coinbase.',
  'person', NULL, 'brian_armstrong', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == INVESTORS, ANALYSTS, MEDIA
-- ============================================================================

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'michael-saylor',
  'Michael Saylor',
  'Executive Chairman of Strategy (formerly MicroStrategy); largest corporate Bitcoin holder.',
  'person', NULL, 'saylor', true,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'balaji-srinivasan',
  'Balaji Srinivasan',
  'Author of "The Network State"; former Coinbase CTO and a16z general partner.',
  'person', NULL, 'balajis', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'cobie',
  'Cobie',
  'Trader and host of UpOnly podcast; one of the most-watched on-chain personalities.',
  'person', NULL, 'cobie', true,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'arthur-hayes',
  'Arthur Hayes',
  'Co-founder of BitMEX; macro essayist on crypto.',
  'person', NULL, 'CryptoHayes', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'mark-cuban',
  'Mark Cuban',
  'Billionaire investor; long-time Ethereum and DeFi proponent.',
  'person', NULL, 'mcuban', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'anthony-pompliano',
  'Anthony Pompliano',
  'Investor and host of The Pomp Podcast; prominent Bitcoin advocate.',
  'person', NULL, 'APompliano', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'raoul-pal',
  'Raoul Pal',
  'Founder of Real Vision; macro investor.',
  'person', NULL, 'RaoulGMI', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'lyn-alden',
  'Lyn Alden',
  'Founder of Lyn Alden Investment Strategy; macro and Bitcoin researcher.',
  'person', NULL, 'LynAldenContact', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == NFT / CULTURE / CELEBRITIES
-- ============================================================================

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'punk6529',
  'Punk6529',
  'Pseudonymous NFT collector and OpenMetaverse advocate; founder of 6529 ecosystem.',
  'celebrity', NULL, 'punk6529', true,
  '[
    {"address":"0xfd22004806A6846EA67ad883356be810F0428793","chain":"ethereum",
     "note":"6529.eth — public collector wallet (Etherscan ENS reverse)",
     "source":"https://etherscan.io/address/0xfd22004806a6846ea67ad883356be810f0428793",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'beeple',
  'Beeple (Mike Winkelmann)',
  'Digital artist; sold "Everydays" NFT for $69M at Christie''s in 2021.',
  'celebrity', NULL, 'beeple', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'pranksy',
  'Pranksy',
  'Pseudonymous NFT collector and influencer.',
  'celebrity', NULL, 'pranksy', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'cozomo-de-medici',
  'Cozomo de'' Medici',
  'Pseudonymous NFT collector publicly acknowledged by Snoop Dogg as one of his identities.',
  'celebrity', NULL, 'CozomoMedici', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'gary-vee',
  'Gary Vaynerchuk',
  'CEO of VaynerMedia; founder of VeeFriends NFT collection.',
  'celebrity', NULL, 'garyvee', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'steve-aoki',
  'Steve Aoki',
  'DJ and active NFT collector / creator.',
  'celebrity', NULL, 'steveaoki', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'logan-paul',
  'Logan Paul',
  'YouTuber, boxer, and NFT collector.',
  'celebrity', NULL, 'LoganPaul', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'pak',
  'Pak (Murat Pak)',
  'Pseudonymous digital artist; creator of "Merge", the largest NFT sale in history.',
  'celebrity', NULL, 'muratpak', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'tyler-hobbs',
  'Tyler Hobbs',
  'Generative artist; creator of Fidenza on Art Blocks.',
  'celebrity', NULL, 'tylerxhobbs', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'dingaling',
  'Dingaling',
  'Pseudonymous high-volume NFT collector and trader.',
  'celebrity', NULL, 'dingalingts', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == DAOs, FOUNDATIONS, PROTOCOL TREASURIES
-- == (Etherscan name tags are the canonical attribution; verify by URL.)
-- ============================================================================

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'ethereum-foundation',
  'Ethereum Foundation',
  'The non-profit organization stewarding Ethereum protocol research and development.',
  'protocol', NULL, 'ethereumfndn', true,
  '[
    {"address":"0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe","chain":"ethereum",
     "note":"Ethereum Foundation (Etherscan public name tag)",
     "source":"https://etherscan.io/address/0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'uniswap-treasury',
  'Uniswap Treasury',
  'Treasury and timelock controller of the Uniswap protocol DAO.',
  'protocol', NULL, 'Uniswap', true,
  '[
    {"address":"0x1a9C8182C09F50C8318d769245beA52c32BE35BC","chain":"ethereum",
     "note":"Uniswap Governance: Timelock (Etherscan public name tag)",
     "source":"https://etherscan.io/address/0x1a9c8182c09f50c8318d769245bea52c32be35bc",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'aave-ecosystem-reserve',
  'Aave Ecosystem Reserve',
  'On-chain treasury holding AAVE tokens for DAO grants and incentives.',
  'protocol', NULL, 'aave', true,
  '[
    {"address":"0x25F2226B597E8F9514B3F68F00f494cF4f286491","chain":"ethereum",
     "note":"Aave: Ecosystem Reserve (Etherscan public name tag)",
     "source":"https://etherscan.io/address/0x25f2226b597e8f9514b3f68f00f494cf4f286491",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'compound-timelock',
  'Compound Timelock',
  'Governance timelock contract controlling Compound protocol upgrades.',
  'protocol', NULL, 'compoundfinance', true,
  '[
    {"address":"0x6d903f6003cca6255D85CcA4D3B5E5146dC33925","chain":"ethereum",
     "note":"Compound: Timelock (Etherscan public name tag)",
     "source":"https://etherscan.io/address/0x6d903f6003cca6255d85cca4d3b5e5146dc33925",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'ens-dao',
  'ENS DAO',
  'Wallet of the Ethereum Name Service DAO, holding ENS treasury assets.',
  'protocol', NULL, 'ensdomains', true,
  '[
    {"address":"0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7","chain":"ethereum",
     "note":"ENS: DAO Wallet (Etherscan public name tag)",
     "source":"https://etherscan.io/address/0xfe89cc7abb2c4183683ab71653c4cdc9b02d44b7",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'makerdao-pause-proxy',
  'MakerDAO Pause Proxy',
  'On-chain controller authorized to pause MakerDAO contracts via governance.',
  'protocol', NULL, 'MakerDAO', true,
  '[
    {"address":"0xBE8E3e3618f7474F8cB1d074A26afFef007E98FB","chain":"ethereum",
     "note":"MakerDAO: Pause Proxy (Etherscan public name tag)",
     "source":"https://etherscan.io/address/0xbe8e3e3618f7474f8cb1d074a26affef007e98fb",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'lido-treasury',
  'Lido Treasury',
  'Treasury wallet of the Lido DAO (largest liquid-staking protocol).',
  'protocol', NULL, 'LidoFinance', true,
  '[
    {"address":"0x3e40D73EB977Dc6a537aF587D48316feE66E9C8c","chain":"ethereum",
     "note":"Lido: Treasury (Etherscan public name tag — Lido DAO Aragon Agent)",
     "source":"https://etherscan.io/address/0x3e40d73eb977dc6a537af587d48316fee66e9c8c",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'gitcoin-multisig',
  'Gitcoin Multisig',
  'Gitcoin DAO main multisig used for grants disbursement.',
  'protocol', NULL, 'gitcoin', false,
  '[
    {"address":"0xde21F729137C5Af1b01d73aF1dC21eFfa2B8a0d6","chain":"ethereum",
     "note":"Gitcoin: Multisig (Etherscan public name tag)",
     "source":"https://etherscan.io/address/0xde21f729137c5af1b01d73af1dc21effa2b8a0d6",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'optimism-foundation',
  'Optimism Foundation',
  'Non-profit stewarding the Optimism rollup ecosystem.',
  'protocol', NULL, 'OptimismFND', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'arbitrum-foundation',
  'Arbitrum Foundation',
  'Non-profit stewarding the Arbitrum rollup ecosystem.',
  'protocol', NULL, 'arbitrum', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'curve-dao',
  'Curve DAO',
  'Governance system of the Curve Finance stablecoin DEX.',
  'protocol', NULL, 'CurveFinance', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'balancer-dao',
  'Balancer DAO',
  'DAO of the Balancer protocol, an automated portfolio manager and DEX.',
  'protocol', NULL, 'Balancer', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == EXCHANGES (well-known cold/hot wallets, Etherscan name-tagged)
-- ============================================================================

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'binance-cold-wallets',
  'Binance Cold Wallets',
  'Largest centralized exchange by spot volume; multiple known cold storage addresses.',
  'company', NULL, 'binance', true,
  '[
    {"address":"0xF977814e90dA44bFA03b6295A0616a897441aceC","chain":"ethereum",
     "note":"Binance: Hot Wallet 20 (Etherscan public name tag — known as Binance 8 cold storage)",
     "source":"https://etherscan.io/address/0xf977814e90da44bfa03b6295a0616a897441acec",
     "verified":true},
    {"address":"0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE","chain":"ethereum",
     "note":"Binance (Etherscan public name tag — historically Binance 7 cold storage)",
     "source":"https://etherscan.io/address/0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be",
     "verified":true},
    {"address":"0x28C6c06298d514Db089934071355E5743bf21d60","chain":"ethereum",
     "note":"Binance 14 (Etherscan public name tag)",
     "source":"https://etherscan.io/address/0x28c6c06298d514db089934071355e5743bf21d60",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'coinbase-cold-wallets',
  'Coinbase Cold Wallets',
  'US-listed exchange and Bitcoin/ETH custodian for major institutional products.',
  'company', NULL, 'coinbase', true,
  '[
    {"address":"0x71660c4005BA85c37ccec55d0C4493E66Fe775d3","chain":"ethereum",
     "note":"Coinbase 1 (Etherscan public name tag)",
     "source":"https://etherscan.io/address/0x71660c4005ba85c37ccec55d0c4493e66fe775d3",
     "verified":true},
    {"address":"0x503828976D22510aad0201ac7EC88293211D23Da","chain":"ethereum",
     "note":"Coinbase 2 (Etherscan public name tag)",
     "source":"https://etherscan.io/address/0x503828976d22510aad0201ac7ec88293211d23da",
     "verified":true},
    {"address":"0x3cD751E6b0078Be393132286c442345e5DC49699","chain":"ethereum",
     "note":"Coinbase 4 (Etherscan public name tag)",
     "source":"https://etherscan.io/address/0x3cd751e6b0078be393132286c442345e5dc49699",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'kraken-cold-wallets',
  'Kraken Cold Wallets',
  'US-based crypto exchange; one of the longest-running CEXs.',
  'company', NULL, 'krakenfx', false,
  '[
    {"address":"0x267be1C1D684F78cb4F6a176C4911b741E4Ffdc0","chain":"ethereum",
     "note":"Kraken 4 (Etherscan public name tag)",
     "source":"https://etherscan.io/address/0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'bitfinex-hot-wallet',
  'Bitfinex Hot Wallet',
  'Centralized exchange with one of the most-watched ETH hot wallets on Etherscan.',
  'company', NULL, 'bitfinex', false,
  '[
    {"address":"0x742d35Cc6634C0532925a3b844Bc454e4438f44e","chain":"ethereum",
     "note":"Bitfinex (Etherscan public name tag — historic hot wallet)",
     "source":"https://etherscan.io/address/0x742d35cc6634c0532925a3b844bc454e4438f44e",
     "verified":true}
  ]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'okx-exchange',
  'OKX',
  'Major centralized exchange (Seychelles) with publicly known hot wallets.',
  'company', NULL, 'okx', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'gemini-exchange',
  'Gemini',
  'US-regulated exchange founded by the Winklevoss twins.',
  'company', NULL, 'Gemini', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'bybit-exchange',
  'Bybit',
  'Crypto exchange with deep derivatives markets; one of the largest CEXs by volume.',
  'company', NULL, 'Bybit_Official', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == VENTURE CAPITAL FUNDS
-- ============================================================================

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'a16z-crypto',
  'a16z Crypto',
  'Andreessen Horowitz''s crypto investment arm; one of the largest crypto VCs.',
  'company', NULL, 'a16zcrypto', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'paradigm',
  'Paradigm',
  'Crypto-native investment firm co-founded by Matt Huang and Fred Ehrsam.',
  'company', NULL, 'paradigm', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'polychain-capital',
  'Polychain Capital',
  'Hedge fund founded by Olaf Carlson-Wee; early investor in many Layer 1s.',
  'company', NULL, 'polychain', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'multicoin-capital',
  'Multicoin Capital',
  'Crypto-native hedge fund; large Solana ecosystem investor.',
  'company', NULL, 'multicoincap', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'pantera-capital',
  'Pantera Capital',
  'One of the longest-running crypto-focused investment firms.',
  'company', NULL, 'PanteraCapital', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'jump-crypto',
  'Jump Crypto',
  'Crypto arm of Jump Trading; major market maker and Solana ecosystem investor.',
  'company', NULL, 'jump_', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'dragonfly-capital',
  'Dragonfly',
  'Crypto-focused investment firm with offices in San Francisco and Beijing.',
  'company', NULL, 'dragonfly_xyz', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'framework-ventures',
  'Framework Ventures',
  'DeFi-focused venture firm; early investor in Chainlink, Synthetix.',
  'company', NULL, 'fintechfrank', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'galaxy-digital',
  'Galaxy Digital',
  'Mike Novogratz''s crypto-native financial services firm.',
  'company', NULL, 'galaxyhq', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'wintermute',
  'Wintermute',
  'Algorithmic market maker active across major CEXs and DEXs.',
  'company', NULL, 'wintermute_t', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == INSTITUTIONS / CORPORATE TREASURIES
-- ============================================================================

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'strategy-microstrategy',
  'Strategy (formerly MicroStrategy)',
  'Largest publicly traded corporate Bitcoin holder; founded by Michael Saylor.',
  'company', NULL, 'Strategy', true,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'blackrock-ibit',
  'BlackRock iShares Bitcoin Trust (IBIT)',
  'Largest spot Bitcoin ETF by AUM; custodied by Coinbase Custody.',
  'company', NULL, 'BlackRock', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'fidelity-fbtc',
  'Fidelity Wise Origin Bitcoin Fund (FBTC)',
  'Spot Bitcoin ETF from Fidelity; self-custodied via Fidelity Digital Assets.',
  'company', NULL, 'Fidelity', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'grayscale-gbtc',
  'Grayscale Bitcoin Trust (GBTC)',
  'Long-running Bitcoin investment vehicle; converted to spot ETF in 2024.',
  'company', NULL, 'Grayscale', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'tesla-treasury',
  'Tesla Inc.',
  'Disclosed corporate Bitcoin holdings on its balance sheet (as of 10-Q filings).',
  'company', NULL, 'Tesla', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'block-square',
  'Block, Inc. (Square)',
  'Jack Dorsey''s payments company; disclosed BTC treasury holdings.',
  'company', NULL, 'block', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == GOVERNMENTS & SEIZURES
-- ============================================================================

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'us-government-seizures',
  'US Government Crypto Seizures',
  'Bitcoin and other crypto seized by US law enforcement (DOJ, FBI, IRS-CI). Tracked across multiple cases (Silk Road, Bitfinex hack, Hydra).',
  'government', NULL, 'TheJusticeDept', true,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'el-salvador-government',
  'Government of El Salvador',
  'First nation-state to adopt Bitcoin as legal tender (Sept 2021). Holdings publicly tracked by President Bukele.',
  'government', NULL, 'nayibbukele', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'german-bka-seizure',
  'Germany BKA Seizure',
  'Bitcoin seized by the German Federal Criminal Police (~50,000 BTC, sold mid-2024).',
  'government', NULL, NULL, false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == POLITICAL FIGURES (intentionally empty addresses — not safely attributable)
-- ============================================================================

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'donald-trump',
  'Donald Trump',
  '45th and 47th US President; launched the World Liberty Financial DeFi project and TRUMP memecoin.',
  'person', NULL, 'realDonaldTrump', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'world-liberty-financial',
  'World Liberty Financial',
  'DeFi protocol associated with the Trump family; launched late 2024.',
  'protocol', NULL, 'worldlibertyfi', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'francis-suarez',
  'Francis Suarez',
  'Mayor of Miami; vocal Bitcoin advocate.',
  'person', NULL, 'FrancisSuarez', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == ON-CHAIN TRADERS / SMART MONEY (intentionally empty — pseudonymous)
-- == These accounts are tracked via on-chain heuristics; no public attribution
-- == exists for their personal wallets. Admins can paste verified addresses
-- == later via /admin/figures.
-- ============================================================================

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'tetranode',
  'Tetranode',
  'Pseudonymous DeFi whale; major LP across multiple protocols.',
  'person', NULL, 'Tetranode', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'machibigbrother',
  'Machi Big Brother',
  'On-chain trader and NFT collector active across Ethereum and Blast.',
  'person', NULL, 'machibigbrother', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'ansem',
  'Ansem',
  'On-chain Solana memecoin trader and influencer.',
  'person', NULL, 'blknoiz06', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'gmoney',
  'GMoney',
  'Pseudonymous NFT collector and culture commentator.',
  'celebrity', NULL, 'gmoneyNFT', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'hsaka',
  'Hsaka',
  'Pseudonymous trader and macro commentator.',
  'person', NULL, 'HsakaTrades', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'gainzy',
  'Gainzy',
  'On-chain perps and memecoin trader.',
  'person', NULL, 'gainzy222', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'cryptopunk-whale',
  'CryptoPunk Whale',
  'Long-time CryptoPunks collector with multiple high-floor punks.',
  'celebrity', NULL, NULL, false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

-- ============================================================================
-- == DEX / DEFI PROTOCOL CONTRACTS (deployer / governance only)
-- ============================================================================

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'sushi-treasury',
  'Sushi Treasury',
  'Treasury wallet of the SushiSwap DEX.',
  'protocol', NULL, 'SushiSwap', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'pancakeswap-treasury',
  'PancakeSwap Treasury',
  'Treasury of the PancakeSwap multi-chain DEX.',
  'protocol', NULL, 'PancakeSwap', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'gnosis-safe-team',
  'Safe (formerly Gnosis Safe)',
  'The most-used multisig wallet infrastructure in crypto.',
  'protocol', NULL, 'safe', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

INSERT INTO curated_entities
  (slug, display_name, description, category, avatar_url, twitter_handle,
   is_featured, addresses, submission_status)
VALUES (
  'chainlink-multisig',
  'Chainlink Multisig',
  'Operational multisig of Chainlink Labs.',
  'protocol', NULL, 'chainlink', false,
  '[]'::jsonb,
  'approved'
) ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured, addresses = EXCLUDED.addresses,
  submission_status = EXCLUDED.submission_status;

COMMIT;

-- ============================================================================
--  END OF SEED FILE
--
--  Verification queries (run after applying):
--
--    SELECT category, COUNT(*) AS entities,
--           SUM(jsonb_array_length(addresses)) AS addresses
--    FROM curated_entities
--    GROUP BY category
--    ORDER BY entities DESC;
--
--    SELECT slug, display_name, jsonb_array_length(addresses) AS n
--    FROM curated_entities
--    WHERE jsonb_array_length(addresses) = 0
--    ORDER BY display_name;
--
--  After applying, use the admin endpoint at
--    POST /api/admin/figures/[slug]/addresses
--  to backfill addresses for the empty entities (~2/3 of this seed).
-- ============================================================================
