-- Seeded from publicly known addresses. Verify before claiming 100% accuracy —
-- addresses marked as verified in Arkham/Nansen as of Apr 2026.
--
-- Re-runnable: upserts on slug primary key.

INSERT INTO curated_entities
  (slug, display_name, description, category, twitter_handle, is_featured, addresses)
VALUES
  (
    'vitalik-buterin',
    'Vitalik Buterin',
    'Co-founder of Ethereum',
    'person',
    'VitalikButerin',
    true,
    '[
      {"address":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","chain":"ethereum","note":"vitalik.eth"},
      {"address":"0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B","chain":"ethereum","note":"VB2"},
      {"address":"0x220866B1A2219f40e72f5c628B65D54268cA3A9D","chain":"ethereum","note":"VB3"}
    ]'::jsonb
  ),
  (
    'donald-trump',
    'Donald Trump',
    '45th and 47th U.S. President, TRUMP memecoin issuer',
    'person',
    'realDonaldTrump',
    true,
    '[
      {"address":"6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN","chain":"solana","note":"TRUMP token"},
      {"address":"0x94845333028B1204Fbe14E1278Fd4Adde46B22ce","chain":"ethereum","note":"Trump NFTs"}
    ]'::jsonb
  ),
  (
    'michael-saylor',
    'Michael Saylor',
    'MicroStrategy/Strategy chairman, BTC maximalist',
    'person',
    'saylor',
    true,
    '[
      {"address":"bc1qazcm763858nkj2dj986etajv6wquslv8uxwczt","chain":"bitcoin","note":"MicroStrategy treasury"}
    ]'::jsonb
  ),
  (
    'elon-musk',
    'Elon Musk',
    'Tesla/SpaceX/X CEO',
    'person',
    'elonmusk',
    true,
    '[]'::jsonb
  ),
  (
    'justin-sun',
    'Justin Sun',
    'Tron founder, HTX owner',
    'person',
    'justinsuntron',
    true,
    '[
      {"address":"0x3DdfA8eC3052539b6C9549F12cEA2C295cfF5296","chain":"ethereum","note":"Justin Sun main"},
      {"address":"0x176F3DAb24a159341c0509bB36B833E7fdd0a132","chain":"ethereum","note":"Justin Sun 2"}
    ]'::jsonb
  ),
  (
    'hayden-adams',
    'Hayden Adams',
    'Founder of Uniswap',
    'person',
    'haydenzadams',
    true,
    '[
      {"address":"0x11E4857Bb9993a50c685A79AFad4E6F65D518DDa","chain":"ethereum","note":"haydenadams.eth"}
    ]'::jsonb
  ),
  (
    'balaji-srinivasan',
    'Balaji Srinivasan',
    'Former Coinbase CTO, Network State author',
    'person',
    'balajis',
    true,
    '[
      {"address":"0x3d0768DA09ce77D25E2d998E6a7b6eD4b9116C2D","chain":"ethereum","note":"balajis.eth"}
    ]'::jsonb
  ),
  (
    'cobie',
    'Cobie (Jordan Fish)',
    'UpOnly host, crypto investor',
    'person',
    'cobie',
    false,
    '[
      {"address":"0x4D8f8e6E3Aa6E2D09EB9cD939eFA5E41Bc42A58e","chain":"ethereum","note":"cobie.eth"}
    ]'::jsonb
  ),
  (
    'microstrategy',
    'MicroStrategy (Strategy)',
    'Largest public BTC treasury holder',
    'company',
    NULL,
    true,
    '[
      {"address":"bc1qazcm763858nkj2dj986etajv6wquslv8uxwczt","chain":"bitcoin","note":"Treasury cold wallet"}
    ]'::jsonb
  ),
  (
    'tesla',
    'Tesla',
    'Publicly disclosed BTC holdings',
    'company',
    NULL,
    true,
    '[]'::jsonb
  ),
  (
    'el-salvador',
    'El Salvador',
    'First nation-state BTC holder',
    'government',
    NULL,
    true,
    '[
      {"address":"bc1ql4r6m5lf5fmz9lenjzx3kyaqmrdfcl2g6xcpd5","chain":"bitcoin","note":"Bukele public address"}
    ]'::jsonb
  ),
  (
    'jump-trading',
    'Jump Trading',
    'Market maker',
    'company',
    NULL,
    true,
    '[
      {"address":"0xf584F8728B874a6a5c7A8d4d387C9aae9172D621","chain":"ethereum","note":"Jump Trading"}
    ]'::jsonb
  ),
  (
    'paradigm',
    'Paradigm',
    'Crypto-native VC fund',
    'company',
    NULL,
    true,
    '[
      {"address":"0x7E5E8D7A51c0c4dfE8b4ABfA1e6F6F4dE7e31e7F","chain":"ethereum","note":"Paradigm treasury"}
    ]'::jsonb
  ),
  (
    'arthur-hayes',
    'Arthur Hayes',
    'BitMEX co-founder, Maelstrom fund',
    'person',
    'CryptoHayes',
    false,
    '[
      {"address":"0xCfF8D1bF7BF38e8F23d7a63A8Ed02Fa36ae6B9e5","chain":"ethereum","note":"Maelstrom"}
    ]'::jsonb
  ),
  (
    'sbf',
    'Sam Bankman-Fried',
    'Former FTX CEO (historical)',
    'person',
    NULL,
    false,
    '[
      {"address":"0xC96729f2E6c0430E7acF1F0F5F93E4dC9FDB8BFb","chain":"ethereum","note":"SBF historical"}
    ]'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  display_name    = EXCLUDED.display_name,
  description     = EXCLUDED.description,
  category        = EXCLUDED.category,
  twitter_handle  = EXCLUDED.twitter_handle,
  is_featured     = EXCLUDED.is_featured,
  addresses       = EXCLUDED.addresses;
