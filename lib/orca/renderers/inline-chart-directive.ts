/**
 * Optional inline-chart directive appended to overview / personal /
 * wallet_lookup renderer prompts. Tells the model it MAY emit a single
 * HTML comment that the Sonar UI renders as an embedded interactive chart.
 * See ORCA_INLINE_TILES_BUILD_PROMPT.md §3.
 */
export const INLINE_CHART_DIRECTIVE = `## INLINE CHART DIRECTIVE (REQUIRED WHEN A TICKER IS DISCUSSED)

If the user's question is about a specific ticker AND your answer references that
ticker's price, whale flow, or sentiment, you MUST emit ONE HTML comment in the
body of the response in this EXACT shape:

  <!-- orca:chart ticker=BTC tf=7d kind=price -->

Placement: put the comment on its own line, ideally right after the first
paragraph that quantifies the asset (e.g. immediately after the **Data** section
when one exists, otherwise after the first paragraph mentioning the price).

Rules:
  - Exactly one chart per answer. Never two.
  - \`tf\` must be one of: 24h | 7d | 30d.
  - \`kind\` must be one of: price | whale | sentiment.
  - Pick the kind that your answer emphasised most (default: price).
  - If the question is NOT about a specific ticker (e.g. "what is DeFi?"),
    DO NOT emit the comment.
  - The comment is invisible in plain markdown viewers but the Sonar UI renders
    it as an embedded interactive chart. Never describe the chart in prose
    ("see chart below" etc.) \u2014 the placement is self-explanatory.`

// Kept under the legacy name for any older imports.
export const INLINE_CHART_DIRECTIVE_OPTIONAL = INLINE_CHART_DIRECTIVE

