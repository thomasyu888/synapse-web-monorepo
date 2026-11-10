import { DacDecision, GAAS_FINAL_STATES, GaasRequestState } from '@/features/gaas/gaasEnums'
import { EntityLink } from '@/components/EntityLink'
import { ErrorBanner } from '@/components/error/ErrorBanner'
import TeamBadge from '@/components/TeamBadge'
import { UserBadge } from '@/components/UserCard/UserBadge'
import {
  useGetCurrentUserProfile,
  useGetIsUserMemberOfTeam,
} from '@/synapse-queries'
import {
  useCancelGaasRequest,
  useGetGaasAuditInfinite,
  useGetGaasRequest,
} from '@/synapse-queries/gaas/useGaas'
import {
  Alert,
  Box,
  Button,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { UdarPart, UnifiedAccessRequest } from '@sage-bionetworks/synapse-types'
import { ReactNode } from 'react'
import { CoordinatorActions } from './CoordinatorActions'
import { DacVoteForm, FIVE_SAFES } from './DacVoteForm'
import {
  DacDecisionChip,
  duoLabel,
  formatGaasDate,
  GaasStateChip,
} from './gaasDisplay'
import { PolicyEvaluationTable } from './PolicyEvaluationTable'

export type GaasRequestDetailMode = 'requester' | 'dac' | 'coordinator'

export type GaasRequestDetailProps = {
  requestId: string
  mode: GaasRequestDetailMode
}

const HELD_STATES: ReadonlyArray<GaasRequestState> = [
  GaasRequestState.ON_HOLD,
  GaasRequestState.ESCALATED,
]

export function isFinal(request: UnifiedAccessRequest) {
  return request.state !== undefined && GAAS_FINAL_STATES.includes(request.state)
}

/** An approved part stays held while a linked part is deferred or rejected. */
export function isHeldByLinkedPart(request: UnifiedAccessRequest, part: UdarPart) {
  return (
    request.state !== undefined &&
    HELD_STATES.includes(request.state) &&
    part.decision === DacDecision.APPROVED &&
    !part.releasedState
  )
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="headline3" sx={{ mb: 2 }}>
        {props.title}
      </Typography>
      {props.children}
    </Paper>
  )
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography component="span" sx={{ fontWeight: 700 }}>
        {props.label}:{' '}
      </Typography>
      {props.children}
    </Box>
  )
}

/**
 * One unified request: its parts and each DAC's decision, the policy checks, the votes and the audit trail.
 * DAC members vote here, and the Central Coordinator resolves linked holds.
 */
export function GaasRequestDetail(props: GaasRequestDetailProps) {
  const { requestId, mode } = props
  const { data: request, isLoading, error } = useGetGaasRequest(requestId)
  const cancelMutation = useCancelGaasRequest()

  if (isLoading) {
    return <Skeleton variant="rectangular" height={400} />
  }
  if (error) {
    return <ErrorBanner error={error} />
  }
  if (!request) {
    return null
  }
  const purpose = request.declaredPurpose

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="headline2">UDAR-{request.id}</Typography>
        <GaasStateChip state={request.state} />
        {mode === 'requester' && !isFinal(request) && (
          <Button
            variant="outlined"
            color="error"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate(requestId)}
          >
            Cancel request
          </Button>
        )}
      </Box>
      {request.stateReason && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {request.stateReason}
        </Alert>
      )}
      <ErrorBanner error={cancelMutation.error} />

      {mode === 'coordinator' && (
        <Section title="Central Coordinator">
          <CoordinatorActions request={request} />
        </Section>
      )}

      <Section title="Federated DAC review">
        <PartsTable request={request} />
      </Section>

      {mode === 'dac' && !isFinal(request) && (
        <Section title="Your DAC's vote">
          {request.parts?.map(part => (
            <MemberVoteForm
              key={part.accessRequirementId}
              requestId={requestId}
              part={part}
            />
          ))}
        </Section>
      )}

      {(request.state === GaasRequestState.APPROVED ||
        request.state === GaasRequestState.PARTIALLY_APPROVED) && (
        <Section title="Access">
          <Field label="Expires">
            {request.expiresOn ? formatGaasDate(request.expiresOn) : 'Never'}
          </Field>
          {request.derivativesFolderId && (
            <Field label="Return derived outputs to">
              <EntityLink entity={request.derivativesFolderId} />
            </Field>
          )}
          {request.derivativeEntityIds?.map(entityId => (
            <Field key={entityId} label="Returned derivative">
              <EntityLink entity={entityId} />
            </Field>
          ))}
        </Section>
      )}

      <Section title="Research project">
        <Field label="Title">{request.projectTitle}</Field>
        <Field label="Project lead">{request.projectLead}</Field>
        <Field label="Institution">{request.institution}</Field>
        <Field label="Intended data use">{request.intendedDataUseStatement}</Field>
        <Field label="Purpose">
          {purpose?.purposeCodes?.map(duoLabel).join(', ')}
          {purpose?.diseaseCodes?.length
            ? `; diseases ${purpose.diseaseCodes.join(', ')}`
            : ''}
        </Field>
        <Field label="Commercial use">{purpose?.isCommercial ? 'Yes' : 'No'}</Field>
        <Field label="Institution country">{purpose?.institutionCountry}</Field>
        <Field label="Signing official">
          {request.signingOfficialName} ({request.signingOfficialEmail})
        </Field>
        <Field label="Accessors">
          {request.accessorIds?.map(id => (
            <Box component="span" key={id} sx={{ mr: 1 }}>
              <UserBadge userId={id} />
            </Box>
          ))}
        </Field>
        <Field label="Submitted by">
          <UserBadge userId={request.createdBy} />{' '}
          {formatGaasDate(request.createdOn)}
        </Field>
      </Section>

      {request.policyEvaluation && (
        <Section title="Policy engine">
          <PolicyEvaluationTable evaluation={request.policyEvaluation} />
        </Section>
      )}

      {request.votes && request.votes.length > 0 && (
        <Section title="Votes">
          <VotesTable request={request} />
        </Section>
      )}

      <Section title="Audit trail">
        <AuditTrail requestId={requestId} />
      </Section>
    </Box>
  )
}

function PartsTable(props: { request: UnifiedAccessRequest }) {
  const { request } = props
  return (
    <Table size="small" aria-label="Parts of the request">
      <TableHead>
        <TableRow>
          <TableCell>Access requirement</TableCell>
          <TableCell>DAC</TableCell>
          <TableCell>Data use terms</TableCell>
          <TableCell>Decision</TableCell>
          <TableCell>Access</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {request.parts?.map(part => (
          <TableRow key={part.accessRequirementId}>
            <TableCell>
              {part.accessRequirementName ?? part.accessRequirementId}
              {part.subjectIds?.map(id => (
                <Box key={id}>
                  <EntityLink entity={id} />
                </Box>
              ))}
            </TableCell>
            <TableCell>
              {part.dacTeamId ? (
                <TeamBadge
                  teamId={part.dacTeamId}
                  teamName={part.dacName ?? part.dacTeamId}
                />
              ) : (
                part.dacName
              )}
            </TableCell>
            <TableCell>{part.dataUseCodes?.map(duoLabel).join(', ')}</TableCell>
            <TableCell>
              <DacDecisionChip decision={part.decision} />
              {part.decidedOn && (
                <Typography variant="smallText1" sx={{ display: 'block' }}>
                  {formatGaasDate(part.decidedOn)}
                </Typography>
              )}
            </TableCell>
            <TableCell>
              {part.releasedState ??
                (isHeldByLinkedPart(request, part) ? 'Held (linked)' : 'Pending')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Shows the vote form only for parts whose DAC the current user belongs to. */
function MemberVoteForm(props: { requestId: string; part: UdarPart }) {
  const { requestId, part } = props
  const { data: currentUser } = useGetCurrentUserProfile()
  const { data: membership } = useGetIsUserMemberOfTeam(
    part.dacTeamId ?? '',
    currentUser?.ownerId ?? '',
    { enabled: !!part.dacTeamId && !!currentUser },
  )
  if (!membership) {
    return null
  }
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 700 }}>
        {part.accessRequirementName ?? part.accessRequirementId}
      </Typography>
      <DacVoteForm requestId={requestId} part={part} />
    </Box>
  )
}

function VotesTable(props: { request: UnifiedAccessRequest }) {
  const { request } = props
  const dacName = (teamId: string) =>
    request.parts?.find(part => part.dacTeamId === teamId)?.dacName ?? teamId
  return (
    <Table size="small" aria-label="Votes">
      <TableHead>
        <TableRow>
          <TableCell>DAC</TableCell>
          <TableCell>Voter</TableCell>
          <TableCell>Vote</TableCell>
          <TableCell>Rationale</TableCell>
          <TableCell>Five Safes</TableCell>
          <TableCell>When</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {request.votes?.map((vote, index) => (
          <TableRow key={`${vote.voterId}-${vote.votedOn}-${index}`}>
            <TableCell>{dacName(vote.dacTeamId)}</TableCell>
            <TableCell>
              <UserBadge userId={vote.voterId} />
            </TableCell>
            <TableCell>{vote.vote}</TableCell>
            <TableCell>
              {vote.publicRationale}
              {vote.privateNotes && (
                <Typography variant="smallText1" sx={{ display: 'block' }}>
                  Private: {vote.privateNotes}
                </Typography>
              )}
            </TableCell>
            <TableCell>
              {FIVE_SAFES.filter(({ key }) => vote.fiveSafes?.[key]).map(
                ({ key, label }) => (
                  <Typography key={key} variant="smallText1" sx={{ display: 'block' }}>
                    {label}: {vote.fiveSafes?.[key]}
                  </Typography>
                ),
              )}
            </TableCell>
            <TableCell>{formatGaasDate(vote.votedOn)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function AuditTrail(props: { requestId: string }) {
  const { data, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useGetGaasAuditInfinite(props.requestId)
  if (isLoading) {
    return <Skeleton variant="rectangular" height={120} />
  }
  if (error) {
    return <ErrorBanner error={error} />
  }
  const events = data?.pages.flatMap(page => page.results) ?? []
  return (
    <Box>
      <Table size="small" aria-label="Audit trail">
        <TableHead>
          <TableRow>
            <TableCell>When</TableCell>
            <TableCell>Event</TableCell>
            <TableCell>By</TableCell>
            <TableCell>Details</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {events.map(event => (
            <TableRow key={event.id}>
              <TableCell>{formatGaasDate(event.createdOn)}</TableCell>
              <TableCell>{event.eventType}</TableCell>
              <TableCell>
                {event.actorId && <UserBadge userId={event.actorId} />}
              </TableCell>
              <TableCell>{event.details}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasNextPage && (
        <Button disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
          Load more
        </Button>
      )}
    </Box>
  )
}
