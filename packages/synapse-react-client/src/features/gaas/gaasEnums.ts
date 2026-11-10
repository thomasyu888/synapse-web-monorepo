/**
 * Runtime values for the GaaS string types in @sage-bionetworks/synapse-types. The types package
 * only declares them as string unions, so the web client can keep using its published release.
 */
import type {
  GaasRequestState as GaasRequestStateType,
  DacDecision as DacDecisionType,
  DacVoteType as DacVoteTypeType,
  PolicyOutcome as PolicyOutcomeType,
  PolicyRoute as PolicyRouteType,
  CoordinatorActionType as CoordinatorActionTypeType,
  GaasRequestListFilter as GaasRequestListFilterType,
  GaasAuditEventType as GaasAuditEventTypeType,
} from '@sage-bionetworks/synapse-types'

export const GaasRequestState = {
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  ON_HOLD: 'ON_HOLD',
  ESCALATED: 'ESCALATED',
  APPROVED: 'APPROVED',
  PARTIALLY_APPROVED: 'PARTIALLY_APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const satisfies Record<string, GaasRequestStateType>
export type GaasRequestState = GaasRequestStateType

export const DacDecision = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DEFERRED: 'DEFERRED',
  REJECTED: 'REJECTED',
} as const satisfies Record<string, DacDecisionType>
export type DacDecision = DacDecisionType

export const DacVoteType = {
  APPROVE: 'APPROVE',
  DEFER: 'DEFER',
  REJECT: 'REJECT',
} as const satisfies Record<string, DacVoteTypeType>
export type DacVoteType = DacVoteTypeType

export const PolicyOutcome = {
  PASS: 'PASS',
  WARN: 'WARN',
  REVIEW: 'REVIEW',
  FAIL: 'FAIL',
} as const satisfies Record<string, PolicyOutcomeType>
export type PolicyOutcome = PolicyOutcomeType

export const PolicyRoute = {
  HUMAN_REVIEW: 'HUMAN_REVIEW',
  AUTO_REJECT: 'AUTO_REJECT',
} as const satisfies Record<string, PolicyRouteType>
export type PolicyRoute = PolicyRouteType

export const CoordinatorActionType = {
  RELEASE_PARTIAL: 'RELEASE_PARTIAL',
  REJECT_ALL: 'REJECT_ALL',
} as const satisfies Record<string, CoordinatorActionTypeType>
export type CoordinatorActionType = CoordinatorActionTypeType

export const GaasRequestListFilter = {
  MINE: 'MINE',
  DAC_QUEUE: 'DAC_QUEUE',
  COORDINATOR: 'COORDINATOR',
} as const satisfies Record<string, GaasRequestListFilterType>
export type GaasRequestListFilter = GaasRequestListFilterType

export const GaasAuditEventType = {
  REQUEST_SUBMITTED: 'REQUEST_SUBMITTED',
  POLICY_EVALUATED: 'POLICY_EVALUATED',
  ROUTED_TO_DAC: 'ROUTED_TO_DAC',
  VOTE_CAST: 'VOTE_CAST',
  REQUEST_HELD: 'REQUEST_HELD',
  REQUEST_ESCALATED: 'REQUEST_ESCALATED',
  REQUEST_RELEASED: 'REQUEST_RELEASED',
  REQUEST_REJECTED: 'REQUEST_REJECTED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
  RESEARCHER_NOTIFIED: 'RESEARCHER_NOTIFIED',
  PASSPORT_ISSUED: 'PASSPORT_ISSUED',
  COMPUTE_CHECKED: 'COMPUTE_CHECKED',
  DERIVATIVE_RETURNED: 'DERIVATIVE_RETURNED',
} as const satisfies Record<string, GaasAuditEventTypeType>
export type GaasAuditEventType = GaasAuditEventTypeType

export const GAAS_FINAL_STATES: ReadonlyArray<GaasRequestState> = [
  GaasRequestState.APPROVED,
  GaasRequestState.PARTIALLY_APPROVED,
  GaasRequestState.REJECTED,
  GaasRequestState.CANCELLED,
]
