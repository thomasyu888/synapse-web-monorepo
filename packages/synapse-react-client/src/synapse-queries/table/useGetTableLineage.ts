import { HttpClient } from '@/synapse-client'
import { TABLE_LINEAGE } from '@/utils/APIConstants'
import { useSynapseContext } from '@/utils/context/SynapseContext'
import { BackendDestinationEnum } from '@/utils/functions/getEndpoint'
import { SynapseClientError } from '@sage-bionetworks/synapse-client/util/SynapseClientError'
import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { LineageDirection, TableLineage } from './TableLineage'

export type GetTableLineageParams = {
  entityId: string
  versionNumber?: number
  direction?: LineageDirection
  maxDepth?: number
}

/**
 * https://rest-docs.synapse.org/rest/GET/entity/id/table/lineage.html
 *
 * Not yet in the generated client, so the request is built here.
 */
export function getTableLineage(
  params: GetTableLineageParams,
  accessToken: string | undefined,
): Promise<TableLineage> {
  const { entityId, versionNumber, direction, maxDepth } = params
  const id = versionNumber ? `${entityId}.${versionNumber}` : entityId
  const query = new URLSearchParams()
  if (direction) {
    query.set('direction', direction)
  }
  if (maxDepth) {
    query.set('maxDepth', String(maxDepth))
  }
  const queryString = query.toString()
  return HttpClient.doGet<TableLineage>(
    `${TABLE_LINEAGE(id)}${queryString ? `?${queryString}` : ''}`,
    accessToken,
    BackendDestinationEnum.REPO_ENDPOINT,
  )
}

export function useGetTableLineage(
  params: GetTableLineageParams,
  options?: Partial<UseQueryOptions<TableLineage, SynapseClientError>>,
) {
  const { accessToken, keyFactory } = useSynapseContext()
  const { entityId, versionNumber, direction, maxDepth } = params
  return useQuery<TableLineage, SynapseClientError>({
    ...options,
    queryKey: keyFactory.getTableLineageQueryKey(
      entityId,
      versionNumber,
      direction,
      maxDepth,
    ),
    queryFn: () => getTableLineage(params, accessToken),
  })
}
