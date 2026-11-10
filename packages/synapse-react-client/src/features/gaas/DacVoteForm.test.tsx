import { DacDecision, DacVoteType, GaasRequestState } from '@/features/gaas/gaasEnums'
import { server } from '@/mocks/msw/server'
import { createWrapper } from '@/testutils/TestingLibraryUtils'
import { GAAS_REQUEST_VOTE } from '@/utils/APIConstants'
import {
  BackendDestinationEnum,
  getEndpoint,
} from '@/utils/functions/getEndpoint'
import { DacVoteRequest, UdarPart, UnifiedAccessRequest } from '@sage-bionetworks/synapse-types'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { DacVoteForm } from './DacVoteForm'

const REQUEST_ID = '42'

const part: UdarPart = {
  accessRequirementId: '9001',
  accessRequirementName: 'AMP-AD controlled data',
  dacTeamId: '3001',
  dacName: 'AMP-AD DAC',
  decision: DacDecision.PENDING,
}

describe('DacVoteForm', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.restoreHandlers())
  afterAll(() => server.close())

  it('sends the vote, rationale and Five Safes notes for the part', async () => {
    const user = userEvent.setup()
    let sent: DacVoteRequest | undefined
    server.use(
      http.post<{ id: string }, DacVoteRequest>(
        `${getEndpoint(BackendDestinationEnum.REPO_ENDPOINT)}${GAAS_REQUEST_VOTE(':id')}`,
        async ({ request, params }) => {
          sent = await request.json()
          const updated: UnifiedAccessRequest = {
            id: params.id,
            state: GaasRequestState.IN_REVIEW,
            entityIds: [],
          }
          return HttpResponse.json(updated, { status: 200 })
        },
      ),
    )
    render(<DacVoteForm requestId={REQUEST_ID} part={part} />, {
      wrapper: createWrapper(),
    })

    const submit = screen.getByRole('button', { name: 'Submit vote' })
    expect(submit).toBeDisabled()

    await user.click(screen.getByLabelText('Approve'))
    await user.type(
      screen.getByLabelText('Public rationale'),
      'Consistent with DS-AD consent',
    )
    await user.type(screen.getByLabelText('Safe settings'), 'Workbench TRE')
    await user.click(submit)

    await waitFor(() =>
      expect(sent).toEqual({
        accessRequirementId: '9001',
        vote: DacVoteType.APPROVE,
        publicRationale: 'Consistent with DS-AD consent',
        privateNotes: '',
        fiveSafes: { safeSettings: 'Workbench TRE' },
      }),
    )
  })
})
