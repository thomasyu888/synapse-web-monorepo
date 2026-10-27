import {
  useCreateCurationTask,
  useDeleteCurationTask,
  useGetCurationTaskStatus,
  useUpdateCurationTask,
  useUpdateCurationTaskStatus,
} from '@/synapse-queries/curation/task/useCurationTask'
import {
  INTERACTIVE_SESSION_PROPERTIES_CONCRETE_TYPE,
  useGetSessionEnvironments,
} from '@/synapse-queries/curation/task/useInteractiveSession'
import { useGetEntityPermissions } from '@/synapse-queries/entity/useEntity'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ENCLAVE_DEFAULT_DURATION_MINUTES,
  ENCLAVE_NO_ENVIRONMENTS_MESSAGE,
} from '../utils/constants'
import EnclaveTaskForm from './EnclaveTaskForm'

vi.mock('@/synapse-queries/curation/task/useCurationTask', () => ({
  useCreateCurationTask: vi.fn(),
  useUpdateCurationTask: vi.fn(),
  useDeleteCurationTask: vi.fn(),
  useGetCurationTaskStatus: vi.fn(),
  useUpdateCurationTaskStatus: vi.fn(),
}))

vi.mock('@/synapse-queries/curation/task/useInteractiveSession', async origImport => ({
  ...(await origImport<typeof import('@/synapse-queries/curation/task/useInteractiveSession')>()),
  useGetSessionEnvironments: vi.fn(),
}))

vi.mock('@/synapse-queries/entity/useEntity', () => ({
  useGetEntityPermissions: vi.fn(),
}))

vi.mock('@/utils/index', async origImport => ({
  ...(await origImport<typeof import('@/utils/index')>()),
  useSynapseContext: vi.fn(() => ({ synapseClient: {} })),
}))

vi.mock('@/components/UserSearchBox/UserSearchBox', () => ({
  default: () => null,
}))

vi.mock('@/components/EntityFinder/EntityIdTextField', () => ({
  default: ({
    label,
    value,
    onChange,
  }: {
    label: string
    value: string
    onChange: (value: string) => void
  }) => (
    <input aria-label={label} value={value} onChange={e => onChange(e.target.value)} />
  ),
}))

const mockCreateMutateAsync = vi.fn()
const mockUpdateStatusMutateAsync = vi.fn()

const PYTHON = {
  id: 'python-3.12',
  name: 'Python 3.12 with pandas',
  imageDigest: 'sha256:abc',
  packages: [{ name: 'pandas', version: '2.2.3' }],
}

function setEnvironments(environments: (typeof PYTHON)[]) {
  vi.mocked(useGetSessionEnvironments).mockReturnValue({
    data: { environments },
    isLoading: false,
    error: null,
  } as unknown as ReturnType<typeof useGetSessionEnvironments>)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useCreateCurationTask).mockReturnValue({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useCreateCurationTask>)
  vi.mocked(useUpdateCurationTask).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useUpdateCurationTask>)
  vi.mocked(useUpdateCurationTaskStatus).mockReturnValue({
    mutateAsync: mockUpdateStatusMutateAsync,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useUpdateCurationTaskStatus>)
  vi.mocked(useDeleteCurationTask).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteCurationTask>)
  vi.mocked(useGetCurationTaskStatus).mockReturnValue({
    data: undefined,
    isFetching: false,
  } as unknown as ReturnType<typeof useGetCurationTaskStatus>)
  vi.mocked(useGetEntityPermissions).mockReturnValue({
    data: { canDelete: false, canEdit: true },
  } as unknown as ReturnType<typeof useGetEntityPermissions>)
  setEnvironments([PYTHON])
})

describe('EnclaveTaskForm', () => {
  it('creates an interactive session task over the chosen folder and environment', async () => {
    const user = userEvent.setup()
    const created = { taskId: 1004, projectId: 'syn100' }
    mockCreateMutateAsync.mockResolvedValue(created)
    const onCreated = vi.fn()
    render(<EnclaveTaskForm projectId="syn100" onCreated={onCreated} />)

    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeDisabled()

    await user.type(screen.getByLabelText(/task name/i), 'Cohort exploration')
    await user.type(screen.getByLabelText(/^instructions/i), 'Explore the cohort')
    await user.type(screen.getByLabelText(/input folder/i), 'syn200')
    expect(createButton).toBeDisabled()
    await user.click(screen.getByRole('combobox', { name: /environment/i }))
    await user.click(await screen.findByRole('option', { name: PYTHON.name }))
    expect(screen.getByText(/pandas 2\.2\.3/)).toBeInTheDocument()

    await user.click(createButton)

    expect(mockCreateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'syn100',
        dataType: 'Cohort exploration',
        instructions: 'Explore the cohort',
        taskProperties: {
          concreteType: INTERACTIVE_SESSION_PROPERTIES_CONCRETE_TYPE,
          inputFolderId: 'syn200',
          environmentId: PYTHON.id,
          maxDurationMinutes: ENCLAVE_DEFAULT_DURATION_MINUTES,
        },
      }),
    )
    // Synapse sets a session task's execution details itself.
    expect(mockUpdateStatusMutateAsync).not.toHaveBeenCalled()
    expect(onCreated).toHaveBeenCalledWith(created)
  })

  it('says so when this Synapse has no approved environments', () => {
    setEnvironments([])
    render(<EnclaveTaskForm projectId="syn100" />)

    expect(screen.getByText(ENCLAVE_NO_ENVIRONMENTS_MESSAGE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
  })
})
