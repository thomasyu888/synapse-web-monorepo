import { DacDecision, GaasRequestState } from '@/features/gaas/gaasEnums'
import { server } from '@/mocks/msw/server'
import { createWrapper } from '@/testutils/TestingLibraryUtils'
import { GAAS_REGISTER } from '@/utils/APIConstants'
import {
  BackendDestinationEnum,
  getEndpoint,
} from '@/utils/functions/getEndpoint'
import { DataUseRegisterPage } from '@sage-bionetworks/synapse-types'
import { render, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { DataUseRegister } from './DataUseRegister'

const page: DataUseRegisterPage = {
  results: [
    {
      requestId: '7',
      state: GaasRequestState.PARTIALLY_APPROVED,
      projectTitle: 'Shared mechanisms of AD and ALS',
      projectLead: 'Dr. Ada Lovelace',
      institution: 'Example University',
      intendedDataUseStatement: 'Compare transcriptomic signatures.',
      declaredPurpose: { purposeCodes: ['DUO:0000007'], diseaseCodes: ['MONDO:0004975'] },
      submittedOn: '2026-10-01T10:00:00.000Z',
      decidedOn: '2026-10-10T10:00:00.000Z',
      decisions: [
        {
          accessRequirementId: '1',
          accessRequirementName: 'AMP-AD controlled data',
          dacName: 'AMP-AD DAC',
          decision: DacDecision.APPROVED,
          approveVotes: 2,
          deferVotes: 0,
          rejectVotes: 0,
          publicRationale: ['Use matches the DS-AD consent.'],
        },
        {
          accessRequirementId: '2',
          accessRequirementName: 'AMP-AIM controlled data',
          dacName: 'AMP-AIM DAC',
          decision: DacDecision.REJECTED,
          approveVotes: 0,
          deferVotes: 0,
          rejectVotes: 1,
          publicRationale: ['Out of scope for the AIM consent.'],
        },
      ],
    },
  ],
}

describe('DataUseRegister', () => {
  beforeAll(() => {
    server.listen()
    server.use(
      http.get(
        `${getEndpoint(BackendDestinationEnum.REPO_ENDPOINT)}${GAAS_REGISTER}`,
        () => HttpResponse.json(page, { status: 200 }),
      ),
    )
  })
  afterEach(() => server.restoreHandlers())
  afterAll(() => server.close())

  it('shows each DAC decision with its vote counts, signed out', async () => {
    render(<DataUseRegister />, {
      wrapper: createWrapper({ accessToken: undefined }),
    })

    const card = await screen.findByRole('article', {
      name: 'Shared mechanisms of AD and ALS',
    })
    expect(within(card).getByText('Partially approved')).toBeInTheDocument()
    expect(within(card).getByText('AMP-AD DAC')).toBeInTheDocument()
    expect(within(card).getByText('2 / 0 / 0')).toBeInTheDocument()
    expect(
      within(card).getByText('Out of scope for the AIM consent.'),
    ).toBeInTheDocument()
  })
})
