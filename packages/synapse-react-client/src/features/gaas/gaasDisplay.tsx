import { DacDecision, GaasRequestState, PolicyOutcome } from '@/features/gaas/gaasEnums'
import { formatDate } from '@/utils/functions/DateFormatter'
import { Chip, ChipProps } from '@mui/material'
import dayjs from 'dayjs'

type ChipColor = ChipProps['color']

const STATE_LABEL: Record<GaasRequestState, string> = {
  [GaasRequestState.SUBMITTED]: 'Submitted',
  [GaasRequestState.IN_REVIEW]: 'In review',
  [GaasRequestState.ON_HOLD]: 'On hold',
  [GaasRequestState.ESCALATED]: 'Escalated',
  [GaasRequestState.APPROVED]: 'Approved',
  [GaasRequestState.PARTIALLY_APPROVED]: 'Partially approved',
  [GaasRequestState.REJECTED]: 'Rejected',
  [GaasRequestState.CANCELLED]: 'Cancelled',
}

const STATE_COLOR: Record<GaasRequestState, ChipColor> = {
  [GaasRequestState.SUBMITTED]: 'info',
  [GaasRequestState.IN_REVIEW]: 'info',
  [GaasRequestState.ON_HOLD]: 'warning',
  [GaasRequestState.ESCALATED]: 'warning',
  [GaasRequestState.APPROVED]: 'success',
  [GaasRequestState.PARTIALLY_APPROVED]: 'success',
  [GaasRequestState.REJECTED]: 'error',
  [GaasRequestState.CANCELLED]: 'default',
}

const DECISION_COLOR: Record<DacDecision, ChipColor> = {
  [DacDecision.PENDING]: 'default',
  [DacDecision.APPROVED]: 'success',
  [DacDecision.DEFERRED]: 'warning',
  [DacDecision.REJECTED]: 'error',
}

const OUTCOME_COLOR: Record<PolicyOutcome, ChipColor> = {
  [PolicyOutcome.PASS]: 'success',
  [PolicyOutcome.WARN]: 'warning',
  [PolicyOutcome.REVIEW]: 'info',
  [PolicyOutcome.FAIL]: 'error',
}

export function GaasStateChip(props: { state?: GaasRequestState }) {
  const { state } = props
  if (!state) {
    return null
  }
  return (
    <Chip size="small" label={STATE_LABEL[state]} color={STATE_COLOR[state]} />
  )
}

export function DacDecisionChip(props: { decision?: DacDecision }) {
  const decision = props.decision ?? DacDecision.PENDING
  return (
    <Chip
      size="small"
      variant="outlined"
      label={decision}
      color={DECISION_COLOR[decision]}
    />
  )
}

export function PolicyOutcomeChip(props: { outcome: PolicyOutcome }) {
  const { outcome } = props
  return <Chip size="small" label={outcome} color={OUTCOME_COLOR[outcome]} />
}

export function formatGaasDate(date?: string) {
  return date ? formatDate(dayjs(date), 'M/D/YYYY h:mm A') : ''
}

/** The DUO research purposes a requester can declare. */
export const DUO_PURPOSES = [
  { code: 'DUO:0000042', label: 'General research use (GRU)' },
  { code: 'DUO:0000006', label: 'Health or medical or biomedical research (HMB)' },
  { code: 'DUO:0000007', label: 'Disease-specific research (DS)' },
] as const

export const DUO_DISEASE_SPECIFIC = 'DUO:0000007'

const DUO_LABELS: Record<string, string> = {
  'DUO:0000042': 'GRU',
  'DUO:0000006': 'HMB',
  'DUO:0000007': 'DS',
  'DUO:0000019': 'Publication required',
  'DUO:0000026': 'User-specific restriction',
  'DUO:0000046': 'Non-commercial use only',
}

export function duoLabel(code: string) {
  const label = DUO_LABELS[code]
  return label ? `${label} (${code})` : code
}
