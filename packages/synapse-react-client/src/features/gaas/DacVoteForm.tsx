import { DacVoteType } from '@/features/gaas/gaasEnums'
import { ErrorBanner } from '@/components/error/ErrorBanner'
import { displayToast } from '@/components/ToastMessage/ToastMessage'
import { useVoteOnGaasRequest } from '@/synapse-queries/gaas/useGaas'
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material'
import { FiveSafesAssessment, UdarPart } from '@sage-bionetworks/synapse-types'
import { useState } from 'react'

export const FIVE_SAFES: ReadonlyArray<{
  key: keyof FiveSafesAssessment
  label: string
}> = [
  { key: 'safePeople', label: 'Safe people' },
  { key: 'safeProjects', label: 'Safe projects' },
  { key: 'safeSettings', label: 'Safe settings' },
  { key: 'safeData', label: 'Safe data' },
  { key: 'safeOutputs', label: 'Safe outputs' },
]

const VOTE_LABEL: Record<DacVoteType, string> = {
  [DacVoteType.APPROVE]: 'Approve',
  [DacVoteType.DEFER]: 'Defer',
  [DacVoteType.REJECT]: 'Reject',
}

export type DacVoteFormProps = {
  requestId: string
  part: UdarPart
}

/**
 * A DAC member's vote on their AMP's part of a unified request (diagram steps 5, 7 and 9).
 * The Five Safes notes are kept apart from the scientific merit of the project.
 */
export function DacVoteForm(props: DacVoteFormProps) {
  const { requestId, part } = props
  const [vote, setVote] = useState<DacVoteType>()
  const [publicRationale, setPublicRationale] = useState('')
  const [privateNotes, setPrivateNotes] = useState('')
  const [fiveSafes, setFiveSafes] = useState<FiveSafesAssessment>({})
  const voteMutation = useVoteOnGaasRequest({
    onSuccess: () => displayToast('Your vote was recorded.', 'success'),
  })

  const submit = () => {
    if (!vote) {
      return
    }
    voteMutation.mutate({
      requestId,
      vote: {
        accessRequirementId: part.accessRequirementId,
        vote,
        publicRationale,
        privateNotes,
        fiveSafes,
      },
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl>
        <FormLabel id={`vote-${part.accessRequirementId}`}>
          Your vote for {part.dacName ?? 'your DAC'}
        </FormLabel>
        <RadioGroup
          row
          aria-labelledby={`vote-${part.accessRequirementId}`}
          value={vote ?? ''}
          onChange={e => setVote(e.target.value as DacVoteType)}
        >
          {Object.values(DacVoteType).map(value => (
            <FormControlLabel
              key={value}
              value={value}
              control={<Radio />}
              label={VOTE_LABEL[value]}
            />
          ))}
        </RadioGroup>
      </FormControl>
      <TextField
        label="Public rationale"
        helperText="Published in the Data Use Register."
        multiline
        minRows={2}
        value={publicRationale}
        onChange={e => setPublicRationale(e.target.value)}
      />
      <TextField
        label="Private notes"
        helperText="Seen only by DAC members and the Central Coordinator."
        multiline
        minRows={2}
        value={privateNotes}
        onChange={e => setPrivateNotes(e.target.value)}
      />
      <Typography variant="headline3">Five Safes</Typography>
      {FIVE_SAFES.map(({ key, label }) => (
        <TextField
          key={key}
          label={label}
          size="small"
          value={fiveSafes[key] ?? ''}
          onChange={e =>
            setFiveSafes(previous => ({ ...previous, [key]: e.target.value }))
          }
        />
      ))}
      <ErrorBanner error={voteMutation.error} />
      <Box>
        <Button
          variant="contained"
          disabled={!vote || voteMutation.isPending}
          onClick={submit}
        >
          Submit vote
        </Button>
      </Box>
    </Box>
  )
}
