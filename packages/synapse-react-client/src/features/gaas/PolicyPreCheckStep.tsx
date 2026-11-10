import { ErrorBanner } from '@/components/error/ErrorBanner'
import { useEvaluateGaasRequest } from '@/synapse-queries/gaas/useGaas'
import { Skeleton } from '@mui/material'
import { UnifiedAccessRequest } from '@sage-bionetworks/synapse-types'
import { PolicyEvaluationTable } from './PolicyEvaluationTable'

export type PolicyPreCheckStepProps = {
  /** The draft request; must be memoized by the caller so the evaluation is not re-fetched on every render */
  request: UnifiedAccessRequest
}

/**
 * Runs the GaaS policy engine on the draft (diagram step 3) so the requester can fix problems before submitting.
 */
export function PolicyPreCheckStep(props: PolicyPreCheckStepProps) {
  const { request } = props
  const { data: evaluation, isLoading, error } = useEvaluateGaasRequest(request)

  if (isLoading) {
    return <Skeleton variant="rectangular" height={200} />
  }
  if (error) {
    return <ErrorBanner error={error} />
  }
  if (!evaluation) {
    return null
  }
  return <PolicyEvaluationTable evaluation={evaluation} />
}
