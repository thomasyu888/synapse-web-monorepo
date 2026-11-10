import { PolicyRoute } from '@/features/gaas/gaasEnums'
import {
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { PolicyEvaluation } from '@sage-bionetworks/synapse-types'
import { PolicyOutcomeChip } from './gaasDisplay'

export type PolicyEvaluationTableProps = {
  evaluation: PolicyEvaluation
}

/**
 * Shows each check the GaaS policy engine ran and where it routed the request.
 */
export function PolicyEvaluationTable(props: PolicyEvaluationTableProps) {
  const { evaluation } = props
  const autoRejected = evaluation.route === PolicyRoute.AUTO_REJECT
  return (
    <>
      <Alert severity={autoRejected ? 'error' : 'info'} sx={{ mb: 2 }}>
        {autoRejected
          ? 'The policy engine would reject this request without human review.'
          : 'The policy engine routes this request to each DAC for human review.'}
      </Alert>
      <Table size="small" aria-label="Policy checks">
        <TableHead>
          <TableRow>
            <TableCell>Check</TableCell>
            <TableCell>Outcome</TableCell>
            <TableCell>Details</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {evaluation.checks.map((check, index) => (
            <TableRow key={`${check.check}-${check.accessRequirementId}-${index}`}>
              <TableCell>{check.check}</TableCell>
              <TableCell>
                <PolicyOutcomeChip outcome={check.outcome} />
              </TableCell>
              <TableCell>{check.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {evaluation.engine && (
        <Typography variant="smallText1" sx={{ display: 'block', mt: 1 }}>
          Evaluated by {evaluation.engine}
        </Typography>
      )}
    </>
  )
}
