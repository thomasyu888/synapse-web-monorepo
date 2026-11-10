import { SubmissionState } from '../AccessRequirement'

/**
 * Types for Governance-as-a-Service (GaaS): the Unified Data Access Request (UDAR),
 * Federated DAC review, the Asset Guardian and the public Data Use Register.
 * Mirrors org.sagebionetworks.repo.model.gaas.
 */

export type GaasRequestState =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'ON_HOLD'
  | 'ESCALATED'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export type DacDecision =
  | 'PENDING'
  | 'APPROVED'
  | 'DEFERRED'
  | 'REJECTED'

export type DacVoteType =
  | 'APPROVE'
  | 'DEFER'
  | 'REJECT'

export type PolicyOutcome =
  | 'PASS'
  | 'WARN'
  | 'REVIEW'
  | 'FAIL'

export type PolicyRoute =
  | 'HUMAN_REVIEW'
  | 'AUTO_REJECT'

export type CoordinatorActionType =
  | 'RELEASE_PARTIAL'
  | 'REJECT_ALL'

export type GaasRequestListFilter =
  | 'MINE'
  | 'DAC_QUEUE'
  | 'COORDINATOR'

export type GaasAuditEventType =
  | 'REQUEST_SUBMITTED'
  | 'POLICY_EVALUATED'
  | 'ROUTED_TO_DAC'
  | 'VOTE_CAST'
  | 'REQUEST_HELD'
  | 'REQUEST_ESCALATED'
  | 'REQUEST_RELEASED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_CANCELLED'
  | 'RESEARCHER_NOTIFIED'
  | 'PASSPORT_ISSUED'
  | 'COMPUTE_CHECKED'
  | 'DERIVATIVE_RETURNED'

/** The research purpose a requester declares, in GA4GH Data Use Ontology terms. */
export type DeclaredPurpose = {
  /** DUO terms, e.g. DUO:0000007 (disease-specific research) */
  purposeCodes?: string[]
  /** MONDO codes, e.g. MONDO:0004975 (Alzheimer disease) */
  diseaseCodes?: string[]
  isCommercial?: boolean
  /** ISO 3166 alpha-2 country of the requesting institution */
  institutionCountry?: string
  publicationAcknowledged?: boolean
}

export type FiveSafesAssessment = {
  safePeople?: string
  safeProjects?: string
  safeSettings?: string
  safeData?: string
  safeOutputs?: string
}

export type DacVote = {
  voterId: string
  accessRequirementId: string
  dacTeamId: string
  vote: DacVoteType
  publicRationale?: string
  /** Only returned to DAC members and the coordinator */
  privateNotes?: string
  fiveSafes?: FiveSafesAssessment
  votedOn: string
}

export type UdarPart = {
  accessRequirementId: string
  accessRequirementName?: string
  dacTeamId?: string
  dacName?: string
  submissionId?: string
  subjectIds?: string[]
  dataUseCodes?: string[]
  decision: DacDecision
  decidedOn?: string
  /** APPROVED or REJECTED once GaaS releases the part; unset while held */
  releasedState?: SubmissionState
}

export type PolicyCheckResult = {
  check: string
  outcome: PolicyOutcome
  message?: string
  accessRequirementId?: string
}

export type PolicyEvaluation = {
  outcome: PolicyOutcome
  route: PolicyRoute
  checks: PolicyCheckResult[]
  engine?: string
  evaluatedOn?: string
}

/** A Unified Data Access Request: one application spanning several access requirements and DACs. */
export type UnifiedAccessRequest = {
  id?: string
  etag?: string
  createdBy?: string
  createdOn?: string
  modifiedOn?: string
  state?: GaasRequestState
  stateReason?: string
  entityIds: string[]
  projectTitle?: string
  projectLead?: string
  institution?: string
  intendedDataUseStatement?: string
  declaredPurpose?: DeclaredPurpose
  accessorIds?: string[]
  ducFileHandleId?: string
  irbFileHandleId?: string
  signingOfficialName?: string
  signingOfficialEmail?: string
  policyEvaluation?: PolicyEvaluation
  parts?: UdarPart[]
  votes?: DacVote[]
  expiresOn?: string
  decidedOn?: string
  derivativesFolderId?: string
  derivativeEntityIds?: string[]
}

export type GaasRequestListRequest = {
  filter: GaasRequestListFilter
  nextPageToken?: string
}

export type GaasRequestPage = {
  results: UnifiedAccessRequest[]
  nextPageToken?: string
}

export type DacVoteRequest = {
  accessRequirementId: string
  vote: DacVoteType
  publicRationale?: string
  privateNotes?: string
  fiveSafes?: FiveSafesAssessment
}

export type CoordinatorActionRequest = {
  action: CoordinatorActionType
  reason?: string
}

export type ComputeActivityCheckRequest = {
  requestId: string
  usedEntityIds: string[]
  purpose?: string
  outputParentId?: string
}

export type ComputeActivityCheckResponse = {
  permitted: boolean
  reasons?: string[]
  auditEventId?: string
}

export type DerivativeRegistrationRequest = {
  requestId: string
  entityId: string
}

export type DerivativeRegistrationResponse = {
  entityId: string
  usedEntityIds?: string[]
  inheritedAccessRequirementIds?: string[]
}

export type DataUseRegisterDecision = {
  accessRequirementId: string
  accessRequirementName?: string
  dacName?: string
  decision: DacDecision
  approveVotes?: number
  deferVotes?: number
  rejectVotes?: number
  publicRationale?: string[]
}

export type DataUseRegisterEntry = {
  requestId: string
  state: GaasRequestState
  projectTitle?: string
  projectLead?: string
  institution?: string
  intendedDataUseStatement?: string
  declaredPurpose?: DeclaredPurpose
  submittedOn?: string
  decidedOn?: string
  expiresOn?: string
  decisions?: DataUseRegisterDecision[]
  derivativeEntityIds?: string[]
}

export type DataUseRegisterPage = {
  results: DataUseRegisterEntry[]
  nextPageToken?: string
}

export type GaasAuditEvent = {
  id: string
  requestId?: string
  eventType: GaasAuditEventType
  actorId?: string
  createdOn: string
  details?: string
}

export type GaasAuditEventPage = {
  results: GaasAuditEvent[]
  nextPageToken?: string
}
