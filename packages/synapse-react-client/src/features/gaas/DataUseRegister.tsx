import { EntityLink } from '@/components/EntityLink'
import { ErrorBanner } from '@/components/error/ErrorBanner'
import { useGetDataUseRegisterInfinite } from '@/synapse-queries/gaas/useGaas'
import {
  Box,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { DataUseRegisterEntry } from '@sage-bionetworks/synapse-types'
import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import {
  DacDecisionChip,
  duoLabel,
  formatGaasDate,
  GaasStateChip,
} from './gaasDisplay'

/**
 * The public Data Use Register (diagram step 25): who uses which data, for what purpose, under which terms,
 * and how each DAC decided. Readable without signing in.
 */
export function DataUseRegister() {
  const { ref, inView } = useInView()
  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useGetDataUseRegisterInfinite()

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (error) {
    return <ErrorBanner error={error} />
  }
  const entries = data?.pages.flatMap(page => page.results) ?? []

  return (
    <Box>
      <Typography variant="headline2" sx={{ mb: 1 }}>
        Data Use Register
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Every decided request for controlled data across the AMPs: the project,
        its intended use, and each Data Access Committee&apos;s decision.
      </Typography>
      {!isLoading && entries.length === 0 && (
        <Typography variant="body1Italic">No decisions yet.</Typography>
      )}
      {entries.map(entry => (
        <DataUseRegisterCard key={entry.requestId} entry={entry} />
      ))}
      <div ref={ref} />
      {(isLoading || isFetchingNextPage) && (
        <Skeleton variant="rectangular" height={160} />
      )}
    </Box>
  )
}

export function DataUseRegisterCard(props: { entry: DataUseRegisterEntry }) {
  const { entry } = props
  const purpose = entry.declaredPurpose
  return (
    <Paper sx={{ p: 3, mb: 2 }} component="article" aria-label={entry.projectTitle}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="headline3">{entry.projectTitle}</Typography>
        <GaasStateChip state={entry.state} />
      </Box>
      <Typography variant="body1">
        <strong>Project lead:</strong> {entry.projectLead} &middot;{' '}
        <strong>Institution:</strong> {entry.institution}
      </Typography>
      <Typography variant="body1">
        <strong>Purpose:</strong> {purpose?.purposeCodes?.map(duoLabel).join(', ')}
        {purpose?.diseaseCodes?.length
          ? `; diseases ${purpose.diseaseCodes.join(', ')}`
          : ''}
      </Typography>
      <Typography variant="body1" sx={{ my: 1 }}>
        <strong>Intended data use:</strong> {entry.intendedDataUseStatement}
      </Typography>
      <Typography variant="smallText1" sx={{ display: 'block', mb: 1 }}>
        Submitted {formatGaasDate(entry.submittedOn)} &middot; decided{' '}
        {formatGaasDate(entry.decidedOn)}
        {entry.expiresOn && <> &middot; access expires {formatGaasDate(entry.expiresOn)}</>}
      </Typography>
      <Table size="small" aria-label="DAC decisions">
        <TableHead>
          <TableRow>
            <TableCell>Data</TableCell>
            <TableCell>DAC</TableCell>
            <TableCell>Decision</TableCell>
            <TableCell>Votes (approve / defer / reject)</TableCell>
            <TableCell>Rationale</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entry.decisions?.map(decision => (
            <TableRow key={decision.accessRequirementId}>
              <TableCell>
                {decision.accessRequirementName ?? decision.accessRequirementId}
              </TableCell>
              <TableCell>{decision.dacName}</TableCell>
              <TableCell>
                <DacDecisionChip decision={decision.decision} />
              </TableCell>
              <TableCell>
                {decision.approveVotes ?? 0} / {decision.deferVotes ?? 0} /{' '}
                {decision.rejectVotes ?? 0}
              </TableCell>
              <TableCell>{decision.publicRationale?.join(' ')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {entry.derivativeEntityIds && entry.derivativeEntityIds.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <strong>Derived data returned:</strong>{' '}
          {entry.derivativeEntityIds.map(id => (
            <Box component="span" key={id} sx={{ mr: 1 }}>
              <EntityLink entity={id} />
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  )
}
