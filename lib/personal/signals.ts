/**
 * Personal signals filter
 * =============================================================================
 * Pure functions that take a user's profile + a raw set of `token_signals`
 * rows and return the personalised, ranked subset. Reads ONLY from
 * production `token_signals` — never from `signal_research_results`, which
 * is research-only per §4.F.
 *
 * Filter rules (§4.D Panel C):
 *
 *   risk_tolerance
 *     'conservative' → only STRONG BUY / STRONG SELL with confidence ≥ 80
 *     'balanced'     → BUY / SELL / STRONG BUY / STRONG SELL, confidence ≥ 60
 *     'aggressive'   → all non-NEUTRAL, confidence ≥ 40
 *
 *   time_horizon
 *     'intraday'   → prefer 24h timeframe, then 3d
 *     'swing'      → prefer 3d, then 24h, then 7d
 *     'position'   → prefer 7d, then 3d
 *     'long_term'  → prefer 7d
 *
 * Ranking: confidence DESC, then score-distance-from-50 DESC (stronger
 * conviction wins), then computed_at DESC.
 *
 * Output is capped at 12 items (UI shows up to 8; extras allow client-side
 * "show more" without a second round-trip).
 */

export type RiskTolerance = 'conservative' | 'balanced' | 'aggressive';
export type TimeHorizon = 'intraday' | 'swing' | 'position' | 'long_term';
export type SignalLabel =
  | 'STRONG BUY'
  | 'BUY'
  | 'NEUTRAL'
  | 'SELL'
  | 'STRONG SELL';

export interface RawSignal {
  id: number;
  token: string;
  signal: SignalLabel;
  score: number;
  confidence: number;
  timeframe: string | null;
  price_at_signal: number | null;
  computed_at: string;
}

export interface FilteredSignal extends RawSignal {
  /** Human-readable reason the signal cleared the personal filter. */
  match_reason: string;
}

export const MAX_PERSONAL_SIGNALS = 12;

const RISK_BANDS: Record<RiskTolerance, { labels: SignalLabel[]; minConfidence: number }> = {
  conservative: {
    labels: ['STRONG BUY', 'STRONG SELL'],
    minConfidence: 80,
  },
  balanced: {
    labels: ['STRONG BUY', 'BUY', 'SELL', 'STRONG SELL'],
    minConfidence: 60,
  },
  aggressive: {
    labels: ['STRONG BUY', 'BUY', 'SELL', 'STRONG SELL'],
    minConfidence: 40,
  },
};

const HORIZON_PREF: Record<TimeHorizon, string[]> = {
  intraday: ['24h', '3d'],
  swing: ['3d', '24h', '7d'],
  position: ['7d', '3d'],
  long_term: ['7d'],
};

/**
 * Default fallback for users with no risk_tolerance set yet. Treats them
 * conservatively — better to under-show than over-show in that ambiguous
 * state.
 */
const DEFAULT_RISK: RiskTolerance = 'conservative';

export interface PersonalSignalsProfile {
  risk_tolerance: RiskTolerance | null;
  time_horizon: TimeHorizon | null;
}

export function filterPersonalSignals(
  rawSignals: RawSignal[],
  profile: PersonalSignalsProfile,
): FilteredSignal[] {
  const risk = profile.risk_tolerance ?? DEFAULT_RISK;
  const band = RISK_BANDS[risk];
  const horizon = profile.time_horizon;
  const preferredTimeframes = horizon ? HORIZON_PREF[horizon] : null;

  const allowed = rawSignals.filter((s) => {
    if (!band.labels.includes(s.signal)) return false;
    if (typeof s.confidence !== 'number' || s.confidence < band.minConfidence) return false;
    if (preferredTimeframes && s.timeframe) {
      if (!preferredTimeframes.includes(s.timeframe)) return false;
    }
    return true;
  });

  const annotated: FilteredSignal[] = allowed.map((s) => {
    const tfPart = s.timeframe ? ` on the ${s.timeframe} timeframe` : '';
    const reason = `${s.signal} with ${s.confidence}% confidence${tfPart} — matches your ${risk} risk profile${horizon ? `, ${humanHorizon(horizon)}` : ''}.`;
    return { ...s, match_reason: reason };
  });

  annotated.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const aDist = Math.abs(a.score - 50);
    const bDist = Math.abs(b.score - 50);
    if (bDist !== aDist) return bDist - aDist;
    return b.computed_at.localeCompare(a.computed_at);
  });

  return annotated.slice(0, MAX_PERSONAL_SIGNALS);
}

function humanHorizon(h: TimeHorizon): string {
  switch (h) {
    case 'intraday':
      return 'intraday horizon';
    case 'swing':
      return 'swing-trading horizon';
    case 'position':
      return 'position-trading horizon';
    case 'long_term':
      return 'long-term horizon';
  }
}
