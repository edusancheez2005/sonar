/**
 * Optional inline-chart directive appended to overview / personal /
 * wallet_lookup renderer prompts. Tells the model it MAY emit a single
 * HTML comment that the Sonar UI renders as an embedded interactive chart.
 * See ORCA_INLINE_TILES_BUILD_PROMPT.md §3.
 */
export const INLINE_CHART_DIRECTIVE = `## OPTIONAL INLINE CHART DIRECTIVE

When (and ONLY when) the user is asking about a specific ticker AND the **Data** section
includes price action, you MAY emit ONE HTML comment immediately AFTER the **Data**
section, before **News and Market Impact**, in this exact shape:

  <!-- orca:chart ticker=BTC tf=7d kind=price -->

Rules:
  - Exactly one chart per answer. Never two.
  - \`tf\` must be one of: 24h | 7d | 30d.
  - \`kind\` must be one of: price | whale | sentiment.
  - Pick the kind that the **Data** section emphasised most.
  - If the question is NOT about a specific ticker (e.g. "what is DeFi?"), DO NOT emit
    the comment.
  - The comment is invisible in plain markdown viewers but the Sonar UI renders it
    as an embedded interactive chart. Never describe the chart in prose ("see chart
    below" etc.) — the placement is self-explanatory.`
