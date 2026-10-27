import { server } from '@/mocks/msw/server'
import {
  INTERACTIVE_SESSION_DETAILS_CONCRETE_TYPE,
  INTERACTIVE_SESSION_PROPERTIES_CONCRETE_TYPE,
  InteractiveSessionExecutionDetails,
} from '@/synapse-queries/curation/task/useInteractiveSession'
import { createWrapper } from '@/testutils/TestingLibraryUtils'
import {
  BackendDestinationEnum,
  getEndpoint,
} from '@/utils/functions/getEndpoint'
import { CurationTask, TaskStatus } from '@sage-bionetworks/synapse-client'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import ComputeSessionPage, {
  END_SESSION_BUTTON_TEXT,
  IN_REVIEW_MESSAGE,
  NOT_A_SESSION_TASK_MESSAGE,
  SESSION_FRAME_SANDBOX,
  START_SESSION_BUTTON_TEXT,
} from './ComputeSessionPage'

const TASK_ID = 1002
const REPO = `${getEndpoint(BackendDestinationEnum.REPO_ENDPOINT)}/repo/v1`
const SESSION_URL = 'http://sabc.enclave.localhost:3030/s/sabc/?token=t1'

const task: CurationTask = {
  taskId: TASK_ID,
  projectId: 'syn100',
  dataType: 'Cohort exploration (enclave)',
  instructions: 'Explore the Tier 4 cohort.',
  taskProperties: {
    concreteType: INTERACTIVE_SESSION_PROPERTIES_CONCRETE_TYPE,
    inputFolderId: 'syn200',
    environmentId: 'python-3.12',
    maxDurationMinutes: 120,
  } as unknown as CurationTask['taskProperties'],
}

function statusWith(
  state: TaskStatus['state'],
  details: Partial<InteractiveSessionExecutionDetails> = {},
): TaskStatus {
  return {
    taskId: TASK_ID,
    state,
    etag: 'etag',
    executionDetails: {
      concreteType: INTERACTIVE_SESSION_DETAILS_CONCRETE_TYPE,
      ...details,
    },
  } as unknown as TaskStatus
}

const running = statusWith('EXECUTING', {
  sessionId: 'sabc',
  sessionState: 'RUNNING',
  startedBy: '101',
  endsOn: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
  inputFiles: [{ entityId: 'syn201', path: 'files/participants.csv' }],
})

function serve(status: TaskStatus, taskOverride: CurationTask = task) {
  server.use(
    http.get(`${REPO}/curation/task/:taskId`, () => HttpResponse.json(taskOverride)),
    http.get(`${REPO}/curation/task/:taskId/status`, () => HttpResponse.json(status)),
    http.get(`${REPO}/entity/:entityId`, () =>
      HttpResponse.json({ id: 'syn200', name: 'data', concreteType: 'org.sagebionetworks.repo.model.Folder' }),
    ),
    http.post(`${REPO}/curation/task/:taskId/session/access`, () =>
      HttpResponse.json({ sessionUrl: SESSION_URL }, { status: 201 }),
    ),
  )
}

function renderPage() {
  return render(<ComputeSessionPage taskId={TASK_ID} />, {
    wrapper: createWrapper({ accessToken: 'fake-token' }),
  })
}

describe('ComputeSessionPage', () => {
  // Every request must be mocked: none may leave for a real Synapse.
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('shows a running session in a frame that cannot download, open windows or navigate Synapse', async () => {
    serve(running)
    renderPage()

    const frame = await screen.findByTitle(`Enclave session for ${task.dataType}`)
    expect(frame).toHaveAttribute('src', SESSION_URL)
    expect(frame).toHaveAttribute('sandbox', SESSION_FRAME_SANDBOX)
    for (const permission of ['allow-downloads', 'allow-popups', 'allow-top-navigation']) {
      expect(SESSION_FRAME_SANDBOX).not.toContain(permission)
    }
    expect(screen.getByText('1 input file')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'data (syn200)' })).toBeInTheDocument()
    expect(screen.getByText(/copied read-only into the session: inputs\/files\/participants\.csv/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: END_SESSION_BUTTON_TEXT })).toBeInTheDocument()
  })

  it('offers to start a session that has not started', async () => {
    serve(statusWith('NOT_STARTED'))
    renderPage()

    expect(await screen.findByRole('button', { name: START_SESSION_BUTTON_TEXT })).toBeInTheDocument()
    expect(screen.queryByTitle(/Enclave session/)).not.toBeInTheDocument()
  })

  it('ends the session after confirmation', async () => {
    serve(running)
    let endRequested = false
    server.use(
      http.post(`${REPO}/curation/task/:taskId/session/end/async/start`, () => {
        endRequested = true
        return HttpResponse.json({ token: 'end-token' }, { status: 201 })
      }),
      http.get(`${REPO}/asynchronous/job/:jobId`, () =>
        HttpResponse.json({ jobState: 'COMPLETE', jobId: 'end-token', responseBody: { taskId: TASK_ID } }),
      ),
    )
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: END_SESSION_BUTTON_TEXT }))
    const dialog = await screen.findByRole('dialog')
    expect(endRequested).toBe(false)
    await userEvent.click(within(dialog).getByRole('button', { name: END_SESSION_BUTTON_TEXT }))

    await vi.waitFor(() => expect(endRequested).toBe(true))
  })

  it('lists the outputs waiting for review', async () => {
    serve(
      statusWith('IN_REVIEW', {
        sessionState: 'ENDED',
        outputFiles: [{ path: 'mean_age_by_sex.csv', contentSize: 70 }],
      }),
    )
    renderPage()

    expect(await screen.findByText(IN_REVIEW_MESSAGE)).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Outputs waiting for review' })).getByText(
        'mean_age_by_sex.csv (70 bytes)',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByTitle(/Enclave session/)).not.toBeInTheDocument()
  })

  it('shows why a session could not start', async () => {
    serve(statusWith('NOT_STARTED', { errorMessage: 'you cannot download syn201' }))
    renderPage()

    expect(await screen.findByText('you cannot download syn201')).toBeInTheDocument()
  })

  it('refuses a task that is not an interactive session task', async () => {
    serve(statusWith('NOT_STARTED'), {
      ...task,
      taskProperties: {
        concreteType: 'org.sagebionetworks.repo.model.curation.metadata.FileBasedMetadataTaskProperties',
      } as CurationTask['taskProperties'],
    })
    renderPage()

    expect(await screen.findByText(NOT_A_SESSION_TASK_MESSAGE)).toBeInTheDocument()
  })
})
