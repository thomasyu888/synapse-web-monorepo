import { mockTableLineage } from '@/mocks/table/mockTableLineage'
import { TableLineage } from '@/synapse-queries/table/TableLineage'
import { http, HttpResponse } from 'msw'
import { SynapseApiResponse } from '../handlers'

/**
 * Serves the given lineage for every entity.
 */
export function getTableLineageHandlers(
  backendOrigin: string,
  lineage: TableLineage = mockTableLineage,
) {
  return [
    http.get(`${backendOrigin}/repo/v1/entity/:entityId/table/lineage`, () => {
      const response: SynapseApiResponse<TableLineage> = lineage
      return HttpResponse.json(response, { status: 200 })
    }),
  ]
}
