import { doGet, doPost } from '@/synapse-client/HttpClient'
import { BackendDestinationEnum } from '@/utils/functions/getEndpoint'
import { useSynapseContext } from '@/utils/index'
import {
  AsyncJobId,
  ComputeTaskExecutionResponse,
  SynapseClientError,
  TaskExecutionDetails,
  waitForAsyncResult,
} from '@sage-bionetworks/synapse-client'
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query'

// The interactive session task models are not in the generated client's OpenAPI spec yet, so they are declared here
// to match org.sagebionetworks.repo.model.curation.execution in Synapse-Repository-Services.

export const INTERACTIVE_SESSION_PROPERTIES_CONCRETE_TYPE =
  'org.sagebionetworks.repo.model.curation.execution.InteractiveSessionExecutionProperties'
export const INTERACTIVE_SESSION_DETAILS_CONCRETE_TYPE =
  'org.sagebionetworks.repo.model.curation.execution.InteractiveSessionExecutionDetails'

export type InteractiveSessionExecutionProperties = {
  concreteType: typeof INTERACTIVE_SESSION_PROPERTIES_CONCRETE_TYPE
  inputFolderId?: string
  inputTaskIds?: number[]
  workspaceTaskId?: number
  environmentId?: string
  maxDurationMinutes?: number
}

export type SessionInputFile = {
  entityId?: string
  versionNumber?: number
  path?: string
  sourceTaskId?: number
}

export type SessionOutputFile = {
  path?: string
  contentSize?: number
  contentMd5?: string
  fileHandleId?: string
}

export type InteractiveSessionExecutionDetails = {
  concreteType: typeof INTERACTIVE_SESSION_DETAILS_CONCRETE_TYPE
  asyncJobId?: string
  startedBy?: string
  startedOn?: string
  errorMessage?: string
  errorDetails?: string
  sessionId?: string
  sessionState?: 'RUNNING' | 'ENDED'
  workspaceId?: string
  endsOn?: string
  inputFiles?: SessionInputFile[]
  outputFiles?: SessionOutputFile[]
  outputFolderId?: string
}

export type InteractiveSessionAccess = {
  sessionUrl?: string
  expiresOn?: string
}

export type SessionEnvironment = {
  id?: string
  name?: string
  imageDigest?: string
  packages?: { name?: string; version?: string }[]
}

export type ListSessionEnvironmentsResponse = {
  environments?: SessionEnvironment[]
}

/**
 * A task's properties as interactive session properties, or undefined for any other kind of task.
 */
export function getInteractiveSessionProperties(
  properties: { concreteType?: string } | undefined,
): InteractiveSessionExecutionProperties | undefined {
  // The generated CurationTaskProperties union does not include this type yet.
  return properties?.concreteType === INTERACTIVE_SESSION_PROPERTIES_CONCRETE_TYPE
    ? (properties as InteractiveSessionExecutionProperties)
    : undefined
}

/**
 * The execution details of an interactive session task's status, or undefined for any other kind of task.
 */
export function getInteractiveSessionDetails(
  status: { executionDetails?: TaskExecutionDetails } | undefined,
): InteractiveSessionExecutionDetails | undefined {
  // The generated TaskExecutionDetails union does not include this type yet.
  const details = status?.executionDetails as { concreteType?: string } | undefined
  return details?.concreteType === INTERACTIVE_SESSION_DETAILS_CONCRETE_TYPE
    ? (details as InteractiveSessionExecutionDetails)
    : undefined
}

/**
 * Gets a single-use link that opens the running session of an interactive session task. Only the user who started
 * the session can open it.
 */
export function useOpenInteractiveSession(
  options?: Partial<
    UseMutationOptions<InteractiveSessionAccess, SynapseClientError, number>
  >,
) {
  const { accessToken } = useSynapseContext()
  return useMutation({
    ...options,
    mutationFn: (taskId: number) =>
      doPost<InteractiveSessionAccess>(
        `/repo/v1/curation/task/${taskId}/session/access`,
        undefined,
        accessToken,
        BackendDestinationEnum.REPO_ENDPOINT,
      ),
  })
}

/**
 * Ends the running session of an interactive session task and awaits the job that collects its outputs, after which
 * the task is in review.
 */
export function useEndInteractiveSession(
  options?: Partial<
    UseMutationOptions<ComputeTaskExecutionResponse, SynapseClientError, number>
  >,
) {
  const { accessToken, synapseClient, keyFactory } = useSynapseContext()
  const queryClient = useQueryClient()
  return useMutation({
    ...options,
    mutationFn: async (taskId: number) => {
      const asyncJobId = await doPost<AsyncJobId>(
        `/repo/v1/curation/task/${taskId}/session/end/async/start`,
        undefined,
        accessToken,
        BackendDestinationEnum.REPO_ENDPOINT,
      )
      const asyncJobResponse = await waitForAsyncResult(() =>
        synapseClient.asynchronousJobServicesClient.getRepoV1AsynchronousJobJobId(
          { jobId: asyncJobId.token! },
        ),
      )
      return asyncJobResponse.responseBody as ComputeTaskExecutionResponse
    },
    onSuccess: (data, taskId, context) => {
      queryClient.invalidateQueries({
        queryKey: keyFactory.getCurationTaskIdKey(taskId),
      })
      queryClient.invalidateQueries({
        queryKey: keyFactory.getAllCurationTaskListKey(),
      })
      if (options?.onSuccess) {
        options.onSuccess(data, taskId, context)
      }
    },
  })
}

/**
 * The approved environments an interactive session can run in: images with a reviewed list of packages.
 */
export function useGetSessionEnvironments(
  options?: Partial<
    UseQueryOptions<ListSessionEnvironmentsResponse, SynapseClientError>
  >,
) {
  const { accessToken, keyFactory } = useSynapseContext()
  return useQuery({
    ...options,
    queryKey: keyFactory.getCurationSessionEnvironmentsKey(),
    queryFn: () =>
      doGet<ListSessionEnvironmentsResponse>(
        '/repo/v1/curation/session/environments',
        accessToken,
        BackendDestinationEnum.REPO_ENDPOINT,
      ),
  })
}
