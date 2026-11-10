import { PolicyOutcome, PolicyRoute } from '@/features/gaas/gaasEnums'
import { server } from '@/mocks/msw/server'
import { createWrapper } from '@/testutils/TestingLibraryUtils'
import { GAAS_REQUEST_EVALUATION } from '@/utils/APIConstants'
import {
  BackendDestinationEnum,
  getEndpoint,
} from '@/utils/functions/getEndpoint'
import { PolicyEvaluation, UnifiedAccessRequest } from '@sage-bionetworks/synapse-types'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { PolicyPreCheckStep } from './PolicyPreCheckStep'

const request: UnifiedAccessRequest = {
  entityIds: ['syn1', 'syn2'],
  projectTitle: 'AD and ALS shared mechanisms',
  declaredPurpose: {
    purposeCodes: ['DUO:0000007'],
    diseaseCodes: ['MONDO:0004975'],
    institutionCountry: 'US',
  },
}

const humanReview: PolicyEvaluation = {
  outcome: PolicyOutcome.REVIEW,
  route: PolicyRoute.HUMAN_REVIEW,
  engine: 'RuleBasedPolicyEngine 1',
  checks: [
    { check: 'Certified accessors', outcome: PolicyOutcome.PASS, message: 'All accessors are certified.' },
    { check: 'DUO match', outcome: PolicyOutcome.REVIEW, message: 'DUO:0000026 needs human review.', accessRequirementId: '9' },
  ],
}

const autoReject: PolicyEvaluation = {
  outcome: PolicyOutcome.FAIL,
  route: PolicyRoute.AUTO_REJECT,
  checks: [
    { check: 'Countries of concern', outcome: PolicyOutcome.FAIL, message: 'NOT-OD-25-083 applies.' },
  ],
}

function mockEvaluation(evaluation: PolicyEvaluation) {
  server.use(
    http.post(
      `${getEndpoint(BackendDestinationEnum.REPO_ENDPOINT)}${GAAS_REQUEST_EVALUATION}`,
      () => HttpResponse.json(evaluation, { status: 200 }),
    ),
  )
}

describe('PolicyPreCheckStep', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.restoreHandlers())
  afterAll(() => server.close())

  it('shows each check and that the request goes to the DACs', async () => {
    mockEvaluation(humanReview)
    render(<PolicyPreCheckStep request={request} />, { wrapper: createWrapper() })

    expect(await screen.findByText('DUO match')).toBeInTheDocument()
    expect(screen.getByText('Certified accessors')).toBeInTheDocument()
    expect(screen.getByText('REVIEW')).toBeInTheDocument()
    expect(
      screen.getByText(/routes this request to each DAC for human review/),
    ).toBeInTheDocument()
  })

  it('warns that the request would be rejected without review', async () => {
    mockEvaluation(autoReject)
    render(<PolicyPreCheckStep request={request} />, { wrapper: createWrapper() })

    expect(await screen.findByText('Countries of concern')).toBeInTheDocument()
    expect(screen.getByText(/would reject this request/)).toBeInTheDocument()
  })
})
