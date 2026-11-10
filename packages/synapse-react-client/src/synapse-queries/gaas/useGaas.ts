import { GaasRequestListFilter } from '@/features/gaas/gaasEnums'
import SynapseClient from '@/synapse-client'
import { useSynapseContext } from '@/utils/context/SynapseContext'
import { SynapseClientError } from '@sage-bionetworks/synapse-client/util/SynapseClientError'
import { CoordinatorActionRequest, DacVoteRequest, DataUseRegisterPage, GaasAuditEventPage, GaasRequestPage, PolicyEvaluation, UnifiedAccessRequest } from '@sage-bionetworks/synapse-types'
import {
  InfiniteData,
  QueryKey,
  useInfiniteQuery,
  UseInfiniteQueryOptions,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query'

export function useGetGaasRequest(
  id: string,
  options?: Partial<UseQueryOptions<UnifiedAccessRequest, SynapseClientError>>,
) {
  const { accessToken, keyFactory } = useSynapseContext()
  return useQuery({
    ...options,
    queryKey: keyFactory.getGaasRequestQueryKey(id),
    queryFn: () => SynapseClient.getGaasRequest(id, accessToken),
  })
}

export function useListGaasRequests<TData = InfiniteData<GaasRequestPage>>(
  filter: GaasRequestListFilter,
  options?: Partial<
    UseInfiniteQueryOptions<
      GaasRequestPage,
      SynapseClientError,
      TData,
      QueryKey,
      GaasRequestPage['nextPageToken']
    >
  >,
) {
  const { accessToken, keyFactory } = useSynapseContext()
  return useInfiniteQuery<
    GaasRequestPage,
    SynapseClientError,
    TData,
    QueryKey,
    GaasRequestPage['nextPageToken']
  >({
    ...options,
    queryKey: keyFactory.getGaasRequestListQueryKey(filter),
    queryFn: context =>
      SynapseClient.listGaasRequests(
        { filter, nextPageToken: context.pageParam },
        accessToken,
      ),
    initialPageParam: undefined,
    getNextPageParam: page => page.nextPageToken,
  })
}

/**
 * Runs the policy engine on a draft request. The evaluation has no side effects, so it is cached by the draft's content.
 */
export function useEvaluateGaasRequest(
  request: UnifiedAccessRequest,
  options?: Partial<UseQueryOptions<PolicyEvaluation, SynapseClientError>>,
) {
  const { accessToken, keyFactory } = useSynapseContext()
  return useQuery({
    ...options,
    queryKey: keyFactory.getGaasPolicyEvaluationQueryKey(request),
    queryFn: () => SynapseClient.evaluateGaasRequest(request, accessToken),
  })
}

/**
 * Updates the cached request and invalidates the lists and the register, which every GaaS change can affect.
 */
function useOnGaasRequestChanged() {
  const queryClient = useQueryClient()
  const { keyFactory } = useSynapseContext()
  return async (updated: UnifiedAccessRequest) => {
    if (updated.id) {
      queryClient.setQueryData(
        keyFactory.getGaasRequestQueryKey(updated.id),
        updated,
      )
    }
    await queryClient.invalidateQueries({
      queryKey: keyFactory.getGaasQueryKey(),
    })
  }
}

export function useSubmitGaasRequest(
  options?: Partial<
    UseMutationOptions<
      UnifiedAccessRequest,
      SynapseClientError,
      UnifiedAccessRequest
    >
  >,
) {
  const { accessToken } = useSynapseContext()
  const onChanged = useOnGaasRequestChanged()
  return useMutation<
    UnifiedAccessRequest,
    SynapseClientError,
    UnifiedAccessRequest
  >({
    ...options,
    mutationFn: request => SynapseClient.submitGaasRequest(request, accessToken),
    onSuccess: async (updated, variables, ctx) => {
      await onChanged(updated)
      if (options?.onSuccess) {
        await options.onSuccess(updated, variables, ctx)
      }
    },
  })
}

export function useCancelGaasRequest(
  options?: Partial<
    UseMutationOptions<UnifiedAccessRequest, SynapseClientError, string>
  >,
) {
  const { accessToken } = useSynapseContext()
  const onChanged = useOnGaasRequestChanged()
  return useMutation<UnifiedAccessRequest, SynapseClientError, string>({
    ...options,
    mutationFn: id => SynapseClient.cancelGaasRequest(id, accessToken),
    onSuccess: async (updated, variables, ctx) => {
      await onChanged(updated)
      if (options?.onSuccess) {
        await options.onSuccess(updated, variables, ctx)
      }
    },
  })
}

export type GaasVoteVariables = { requestId: string; vote: DacVoteRequest }

export function useVoteOnGaasRequest(
  options?: Partial<
    UseMutationOptions<UnifiedAccessRequest, SynapseClientError, GaasVoteVariables>
  >,
) {
  const { accessToken } = useSynapseContext()
  const onChanged = useOnGaasRequestChanged()
  return useMutation<
    UnifiedAccessRequest,
    SynapseClientError,
    GaasVoteVariables
  >({
    ...options,
    mutationFn: ({ requestId, vote }) =>
      SynapseClient.voteOnGaasRequest(requestId, vote, accessToken),
    onSuccess: async (updated, variables, ctx) => {
      await onChanged(updated)
      if (options?.onSuccess) {
        await options.onSuccess(updated, variables, ctx)
      }
    },
  })
}

export type GaasCoordinationVariables = {
  requestId: string
  action: CoordinatorActionRequest
}

export function useCoordinateGaasRequest(
  options?: Partial<
    UseMutationOptions<
      UnifiedAccessRequest,
      SynapseClientError,
      GaasCoordinationVariables
    >
  >,
) {
  const { accessToken } = useSynapseContext()
  const onChanged = useOnGaasRequestChanged()
  return useMutation<
    UnifiedAccessRequest,
    SynapseClientError,
    GaasCoordinationVariables
  >({
    ...options,
    mutationFn: ({ requestId, action }) =>
      SynapseClient.coordinateGaasRequest(requestId, action, accessToken),
    onSuccess: async (updated, variables, ctx) => {
      await onChanged(updated)
      if (options?.onSuccess) {
        await options.onSuccess(updated, variables, ctx)
      }
    },
  })
}

export function useGetDataUseRegisterInfinite<
  TData = InfiniteData<DataUseRegisterPage>,
>(
  options?: Partial<
    UseInfiniteQueryOptions<
      DataUseRegisterPage,
      SynapseClientError,
      TData,
      QueryKey,
      DataUseRegisterPage['nextPageToken']
    >
  >,
) {
  const { accessToken, keyFactory } = useSynapseContext()
  return useInfiniteQuery<
    DataUseRegisterPage,
    SynapseClientError,
    TData,
    QueryKey,
    DataUseRegisterPage['nextPageToken']
  >({
    ...options,
    queryKey: keyFactory.getDataUseRegisterQueryKey(),
    queryFn: context =>
      SynapseClient.getDataUseRegister(context.pageParam, accessToken),
    initialPageParam: undefined,
    getNextPageParam: page => page.nextPageToken,
  })
}

export function useGetGaasAuditInfinite<
  TData = InfiniteData<GaasAuditEventPage>,
>(
  requestId: string,
  options?: Partial<
    UseInfiniteQueryOptions<
      GaasAuditEventPage,
      SynapseClientError,
      TData,
      QueryKey,
      GaasAuditEventPage['nextPageToken']
    >
  >,
) {
  const { accessToken, keyFactory } = useSynapseContext()
  return useInfiniteQuery<
    GaasAuditEventPage,
    SynapseClientError,
    TData,
    QueryKey,
    GaasAuditEventPage['nextPageToken']
  >({
    ...options,
    queryKey: keyFactory.getGaasRequestAuditQueryKey(requestId),
    queryFn: context =>
      SynapseClient.getGaasRequestAudit(
        requestId,
        context.pageParam,
        accessToken,
      ),
    initialPageParam: undefined,
    getNextPageParam: page => page.nextPageToken,
  })
}
