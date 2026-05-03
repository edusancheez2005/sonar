-- ============================================================================
--  scripts/seed_famous_wallets_v5.sql
--  Follow-up to v4: adds Wintermute and other publicly-tagged market makers
--  / trading firms whose figures pages were empty after v4.
--
--  Generated: 2026-05-03
--  Verification: every address has an Etherscan public name tag confirmed
--                by direct fetch on the generation date.
--  Idempotent: ON CONFLICT (slug) DO UPDATE.
-- ============================================================================

BEGIN;

INSERT INTO curated_entities (slug, display_name, description, category, twitter_handle, is_featured, addresses, submission_status) VALUES
('wintermute', 'Wintermute',
 'Algorithmic market maker active across major CEXs and DEXs. One of the most prolific on-chain trading firms on Ethereum.',
 'company', 'wintermute_t', true,
 '[
   {"address":"0x0000006daea1723962647b7e189d311d757Fb793","chain":"ethereum","note":"Wintermute 1 — Etherscan name tag","source":"https://etherscan.io/address/0x0000006daea1723962647b7e189d311d757fb793","verified":true},
   {"address":"0x4f3a120E72C76c22ae802D129F599BFDbc31cb81","chain":"ethereum","note":"Wintermute 2 — Etherscan name tag","source":"https://etherscan.io/address/0x4f3a120e72c76c22ae802d129f599bfdbc31cb81","verified":true},
   {"address":"0x0087BB802d9C0e343F00510000729031CE00bf27","chain":"ethereum","note":"Wintermute 3 — Etherscan name tag","source":"https://etherscan.io/address/0x0087bb802d9c0e343f00510000729031ce00bf27","verified":true},
   {"address":"0x6f1cDbBb4d53d226CF4B917bF768B94acbAB6168","chain":"ethereum","note":"Wintermute 4 — Etherscan name tag","source":"https://etherscan.io/address/0x6f1cdbbb4d53d226cf4b917bf768b94acbab6168","verified":true}
 ]'::jsonb,
 'approved'),
('galaxy-digital', 'Galaxy Digital',
 'Crypto-native financial services firm founded by Mike Novogratz. Active OTC desk and trading book.',
 'company', 'galaxyhq', true,
 '[
   {"address":"0x95E29B73CFa5ab73a6bAa12F47AB18BE38e69934","chain":"ethereum","note":"Galaxy Digital — Etherscan name tag","source":"https://etherscan.io/address/0x95e29b73cfa5ab73a6baa12f47ab18be38e69934","verified":true}
 ]'::jsonb,
 'approved'),
('alameda-research', 'Alameda Research (Defunct)',
 'Defunct trading firm formerly run by Sam Bankman-Fried; addresses preserved for historical / forensic reference.',
 'company', NULL, false,
 '[
   {"address":"0x83a127952d266A6eA306c40Ac62A4a70668FE3BD","chain":"ethereum","note":"Alameda Research — Etherscan name tag","source":"https://etherscan.io/address/0x83a127952d266a6ea306c40ac62a4a70668fe3bd","verified":true}
 ]'::jsonb,
 'approved'),
('three-arrows-capital', 'Three Arrows Capital (Defunct)',
 'Defunct hedge fund (3AC). Preserved for historical reference.',
 'company', NULL, false,
 '[]'::jsonb,
 'approved'),
('genesis-trading', 'Genesis Trading',
 'Institutional crypto OTC trading desk and lending business (DCG subsidiary).',
 'company', 'GenesisTrading', false,
 '[]'::jsonb,
 'approved')
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name, description = EXCLUDED.description,
  category = EXCLUDED.category, twitter_handle = EXCLUDED.twitter_handle,
  is_featured = EXCLUDED.is_featured,
  -- Never overwrite a populated row with an empty list.
  addresses = CASE WHEN EXCLUDED.addresses = '[]'::jsonb THEN curated_entities.addresses ELSE EXCLUDED.addresses END,
  submission_status = EXCLUDED.submission_status;

COMMIT;

-- Verification:
--   SELECT slug, jsonb_array_length(addresses) AS n
--   FROM curated_entities
--   WHERE slug IN ('wintermute','galaxy-digital','alameda-research')
--   ORDER BY n DESC;
--   -- Expected: wintermute=4, galaxy-digital=1, alameda-research=1
