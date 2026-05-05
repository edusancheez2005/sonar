/**
 * Zod schemas for Arkham API responses.
 *
 * Shapes derived from probe (scripts/arkham-probe.log, 2026-05-05).
 * Schemas are deliberately permissive (`.passthrough()`, `.optional()`)
 * because Arkham occasionally returns extra fields we don't yet model.
 */
import { z } from 'zod';

// ---------- Entity ----------
export const ArkhamEntitySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    note: z.string().nullable().optional(),
    type: z.string().nullable().optional(),       // 'cex','individual','dex','fund','government','protocol',...
    service: z.string().nullable().optional(),
    addresses: z.unknown().nullable().optional(),
    website: z.string().nullable().optional(),
    twitter: z.string().nullable().optional(),
    crunchbase: z.string().nullable().optional(),
    linkedin: z.string().nullable().optional(),
    customized: z.boolean().optional(),
    populatedTags: z.array(z.unknown()).optional(),
  })
  .passthrough();
export type ArkhamEntity = z.infer<typeof ArkhamEntitySchema>;

// ---------- Label (e.g. "Binance: Cold Wallet 2") ----------
export const ArkhamLabelSchema = z
  .object({
    name: z.string(),
    address: z.string(),
    chainType: z.string().optional(),             // 'evm','bitcoin','tron','ton','solana','dogecoin'
  })
  .passthrough();
export type ArkhamLabel = z.infer<typeof ArkhamLabelSchema>;

// ---------- Address intelligence (single chain) ----------
export const AddressIntelSchema = z
  .object({
    address: z.string(),
    chain: z.string(),
    arkhamEntity: ArkhamEntitySchema.nullable().optional(),
    arkhamLabel: ArkhamLabelSchema.nullable().optional(),
    isUserAddress: z.boolean().optional(),
    contract: z.boolean().optional(),
    program: z.boolean().optional(),              // solana
  })
  .passthrough();
export type AddressIntel = z.infer<typeof AddressIntelSchema>;

/** /intelligence/address/{a}/all → record keyed by chain. */
export const AddressIntelByChainSchema = z.record(z.string(), AddressIntelSchema);
export type AddressIntelByChain = z.infer<typeof AddressIntelByChainSchema>;

// ---------- Entity balances ----------
export const EntityBalancesSchema = z
  .object({
    entities: z.record(z.string(), ArkhamEntitySchema).optional(),
    totalBalance: z.record(z.string(), z.number()).optional(),
    totalBalance24hAgo: z.record(z.string(), z.number()).optional(),
    balances: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type EntityBalances = z.infer<typeof EntityBalancesSchema>;

// ---------- Transfer ----------
export const TransferAddressSchema = z
  .object({
    address: z.string(),
    chain: z.string().optional(),
    arkhamEntity: ArkhamEntitySchema.nullable().optional(),
    arkhamLabel: ArkhamLabelSchema.nullable().optional(),
    isUserAddress: z.boolean().optional(),
    contract: z.boolean().optional(),
  })
  .passthrough();

export const TransferSchema = z
  .object({
    id: z.string().optional(),
    transactionHash: z.string().optional(),
    fromAddress: TransferAddressSchema.optional(),
    toAddress: TransferAddressSchema.optional(),
    fromIsContract: z.boolean().optional(),
    toIsContract: z.boolean().optional(),
    historicalUSD: z.number().nullable().optional(),
    blockTimestamp: z.string().nullable().optional(),
    tokenSymbol: z.string().nullable().optional(),
    tokenAddress: z.string().nullable().optional(),
    chain: z.string().optional(),
  })
  .passthrough();

export const TransfersResponseSchema = z
  .object({
    transfers: z.array(TransferSchema),
    count: z.number().optional(),
  })
  .passthrough();
export type Transfer = z.infer<typeof TransferSchema>;
export type TransfersResponse = z.infer<typeof TransfersResponseSchema>;

// ---------- Counterparty ----------
export const CounterpartySchema = z
  .object({
    address: TransferAddressSchema.optional(),
    usd: z.number().optional(),
    transactionCount: z.number().optional(),
    flow: z.string().optional(),                 // 'in' | 'out'
    chains: z.array(z.string()).optional(),
  })
  .passthrough();

/** /counterparties/entity/{slug} returns a record keyed by 'base' + chain. */
export const CounterpartiesResponseSchema = z.record(
  z.string(),
  z.array(CounterpartySchema)
);
export type Counterparty = z.infer<typeof CounterpartySchema>;
export type CounterpartiesResponse = z.infer<typeof CounterpartiesResponseSchema>;

// ---------- Token holders ----------
export const TokenHolderSchema = z
  .object({
    address: TransferAddressSchema.optional(),
    usd: z.number().nullable().optional(),
    balance: z.number().nullable().optional(),
    pct: z.number().nullable().optional(),
  })
  .passthrough();

export const TokenHoldersResponseSchema = z
  .object({
    token: z.unknown().optional(),
    totalSupply: z.record(z.string(), z.number()).optional(),
    addressTopHolders: z.record(z.string(), z.array(TokenHolderSchema)).optional(),
    entityTopHolders: z.record(z.string(), z.array(z.unknown())).optional(),
  })
  .passthrough();
export type TokenHoldersResponse = z.infer<typeof TokenHoldersResponseSchema>;

// ---------- Chains ----------
export const ChainsSchema = z.array(z.string());
export type ChainsList = z.infer<typeof ChainsSchema>;
