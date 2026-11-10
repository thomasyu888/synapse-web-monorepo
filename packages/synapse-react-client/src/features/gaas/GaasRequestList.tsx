import { GaasRequestListFilter, GaasRequestState } from '@/features/gaas/gaasEnums'
import { ErrorBanner } from '@/components/error/ErrorBanner'
import { useListGaasRequests } from '@/synapse-queries/gaas/useGaas'
import {
  Box,
  Button,
  Link,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { UnifiedAccessRequest } from '@sage-bionetworks/synapse-types'
import { useMemo } from 'react'
import { Link as RouterLink } from 'react-router'
import { DacDecisionChip, formatGaasDate, GaasStateChip } from './gaasDisplay'

const NEEDS_COORDINATOR: ReadonlyArray<GaasRequestState> = [
  GaasRequestState.ESCALATED,
  GaasRequestState.ON_HOLD,
]

export type GaasRequestListProps = {
  filter: GaasRequestListFilter
  /** Route that shows one request; the request ID is appended */
  detailPath: string
  emptyMessage: string
  /** List requests that need the Central Coordinator (escalated or on hold) first */
  heldFirst?: boolean
}

export function GaasRequestList(props: GaasRequestListProps) {
  const { filter, detailPath, emptyMessage, heldFirst = false } = props
  const { data, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useListGaasRequests(filter)

  const requests = useMemo(() => {
    const all = data?.pages.flatMap(page => page.results) ?? []
    if (!heldFirst) {
      return all
    }
    const needsCoordinator = (request: UnifiedAccessRequest) =>
      request.state !== undefined && NEEDS_COORDINATOR.includes(request.state)
    return [...all.filter(needsCoordinator), ...all.filter(r => !needsCoordinator(r))]
  }, [data, heldFirst])

  if (isLoading) {
    return <Skeleton variant="rectangular" height={160} />
  }
  if (error) {
    return <ErrorBanner error={error} />
  }
  if (requests.length === 0) {
    return (
      <Typography variant="body1Italic" sx={{ p: 2 }}>
        {emptyMessage}
      </Typography>
    )
  }
  return (
    <Box>
      <Table size="small" aria-label="Unified access requests">
        <TableHead>
          <TableRow>
            <TableCell>Request</TableCell>
            <TableCell>Project</TableCell>
            <TableCell>State</TableCell>
            <TableCell>DAC decisions</TableCell>
            <TableCell>Submitted</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {requests.map(request => (
            <TableRow key={request.id}>
              <TableCell>
                <Link component={RouterLink} to={`${detailPath}/${request.id}`}>
                  UDAR-{request.id}
                </Link>
              </TableCell>
              <TableCell>{request.projectTitle}</TableCell>
              <TableCell>
                <GaasStateChip state={request.state} />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {request.parts?.map(part => (
                    <Box key={part.accessRequirementId} sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center' }}>
                      <Typography variant="smallText1">
                        {part.dacName ?? part.accessRequirementName}:
                      </Typography>
                      <DacDecisionChip decision={part.decision} />
                    </Box>
                  ))}
                </Box>
              </TableCell>
              <TableCell>{formatGaasDate(request.createdOn)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasNextPage && (
        <Button
          sx={{ mt: 1 }}
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          Load more
        </Button>
      )}
    </Box>
  )
}
