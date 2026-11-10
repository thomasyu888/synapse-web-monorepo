import { CoordinatorActionType, GaasRequestState } from '@/features/gaas/gaasEnums'
import { ErrorBanner } from '@/components/error/ErrorBanner'
import { displayToast } from '@/components/ToastMessage/ToastMessage'
import { useCoordinateGaasRequest } from '@/synapse-queries/gaas/useGaas'
import { Alert, Box, Button, TextField } from '@mui/material'
import { UnifiedAccessRequest } from '@sage-bionetworks/synapse-types'
import { useState } from 'react'

const COORDINATED_STATES: ReadonlyArray<GaasRequestState> = [
  GaasRequestState.ESCALATED,
  GaasRequestState.ON_HOLD,
]

/**
 * The Central Coordinator's decision on linked holds and escalations (diagram step 10).
 */
export function CoordinatorActions(props: { request: UnifiedAccessRequest }) {
  const { request } = props
  const [reason, setReason] = useState('')
  const coordinateMutation = useCoordinateGaasRequest({
    onSuccess: updated =>
      displayToast(`The request is now ${updated.state}.`, 'success'),
  })

  if (!request.id || !request.state || !COORDINATED_STATES.includes(request.state)) {
    return null
  }
  const requestId = request.id
  const act = (action: CoordinatorActionType) =>
    coordinateMutation.mutate({ requestId, action: { action, reason } })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="warning">
        {request.state === GaasRequestState.ESCALATED
          ? 'A DAC rejected its part, so the linked parts are held. Release the approved parts, or reject the whole request.'
          : 'A DAC deferred its decision, so the linked parts are held. You can release the approved parts now, or reject the whole request.'}
      </Alert>
      <TextField
        label="Reason"
        multiline
        minRows={2}
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <ErrorBanner error={coordinateMutation.error} />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          disabled={coordinateMutation.isPending}
          onClick={() => act(CoordinatorActionType.RELEASE_PARTIAL)}
        >
          Release approved parts
        </Button>
        <Button
          variant="outlined"
          color="error"
          disabled={coordinateMutation.isPending}
          onClick={() => act(CoordinatorActionType.REJECT_ALL)}
        >
          Reject all
        </Button>
      </Box>
    </Box>
  )
}
