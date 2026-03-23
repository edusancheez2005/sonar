-- Fix wallet_alerts alert_type constraint to allow application-defined types
ALTER TABLE wallet_alerts DROP CONSTRAINT IF EXISTS wallet_alerts_alert_type_check;

ALTER TABLE wallet_alerts ADD CONSTRAINT wallet_alerts_alert_type_check
  CHECK (alert_type IN ('large_transaction', 'any_activity', 'token_transfer', 'new_token'));
