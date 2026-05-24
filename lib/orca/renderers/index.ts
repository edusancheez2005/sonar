/**
 * Renderer dispatcher (§4.E)
 * =============================================================================
 * Each intent maps to a per-intent prompt builder. This file is a thin
 * dispatcher; all prompt content lives in the per-intent files so we can
 * version them independently.
 *
 * BACKWARDS-COMPAT NOTE
 * ---------------------
 * The pre-§4.E single-file `lib/orca/renderers/index.ts` exported every
 * renderer (renderOverviewPrompt, renderExplainerPrompt, etc.) from this
 * module. The orchestrator and tests already use `selectRenderer(intent)`,
 * but we re-export the per-intent functions from here too so any older
 * import path keeps working.
 */
import type { Intent } from '../orchestrator/types'
import type { RenderArgs } from './types'
import { renderOverviewPrompt } from './overview'
import { renderExplainerPrompt } from './explainer'
import { renderDataQueryPrompt } from './data_query'
import { renderFollowupPrompt } from './followup'
import { renderPersonalPrompt } from './personal'
import { renderComplianceDeclinePrompt } from './compliance_decline'

export type { RenderArgs } from './types'
export {
  renderOverviewPrompt,
  renderExplainerPrompt,
  renderDataQueryPrompt,
  renderFollowupPrompt,
  renderPersonalPrompt,
  renderComplianceDeclinePrompt,
}

export function selectRenderer(intent: Intent): (a: RenderArgs) => string {
  switch (intent) {
    case 'overview':
      return renderOverviewPrompt
    case 'explainer':
      return renderExplainerPrompt
    case 'data_query':
      return renderDataQueryPrompt
    case 'followup':
      return renderFollowupPrompt
    case 'personal':
      return renderPersonalPrompt
    case 'compliance_decline':
      return renderComplianceDeclinePrompt
    default: {
      const _exhaustive: never = intent
      throw new Error(`unknown intent: ${String(_exhaustive)}`)
    }
  }
}
