import SynapseClient from '@/synapse-client'
import { runSqlQuery } from '@/synapse-queries/table/SqlQuery'
import { useSynapseContext } from '@/utils/context/SynapseContext'
import {
  BUNDLE_MASK_QUERY_RESULTS,
  BUNDLE_MASK_QUERY_SELECT_COLUMNS,
} from '@/utils/SynapseConstants'
import { SynapseClientError } from '@sage-bionetworks/synapse-client/util/SynapseClientError'
import {
  QueryBundleRequest,
  Row,
  SelectColumn,
} from '@sage-bionetworks/synapse-types'
import { useMutation, UseMutationOptions } from '@tanstack/react-query'
import { planWorksheetQuery, WORKSHEET_ROW_LIMIT } from './SqlWorksheetUtils'

export type RunSqlWorksheetResult = {
  /** The tables and views the SQL reads, in order of appearance */
  sourceIds: string[]
  columns: SelectColumn[]
  rows: Row[]
  /** True when the SQL has more rows than {@link WORKSHEET_ROW_LIMIT} */
  isTruncated: boolean
}

async function runTableQuery(
  entityId: string,
  sql: string,
  accessToken: string | undefined,
  onProgress: (message: string) => void,
): Promise<Pick<RunSqlWorksheetResult, 'columns' | 'rows' | 'isTruncated'>> {
  // One row more than is shown tells whether there are more.
  const request: QueryBundleRequest = {
    concreteType: 'org.sagebionetworks.repo.model.table.QueryBundleRequest',
    entityId,
    query: { sql, limit: WORKSHEET_ROW_LIMIT + 1 },
    partMask: BUNDLE_MASK_QUERY_RESULTS | BUNDLE_MASK_QUERY_SELECT_COLUMNS,
  }
  const status = await SynapseClient.getQueryTableAsyncJobResults(
    request,
    accessToken,
    jobStatus => onProgress(jobStatus.progressMessage ?? ''),
  )
  const bundle = status.responseBody!
  const rowSet = bundle.queryResult?.queryResults
  const rows = rowSet?.rows ?? []
  return {
    columns: bundle.selectColumns ?? rowSet?.headers ?? [],
    rows: rows.slice(0, WORKSHEET_ROW_LIMIT),
    isTruncated: rows.length > WORKSHEET_ROW_LIMIT,
  }
}

/**
 * Runs worksheet SQL. A query on one table runs as a table query; SQL that combines tables runs as a SQL query job,
 * which saves nothing and so never adds to table lineage.
 *
 * @param onProgress Receives the progress messages of the running query (e.g. while a source is built)
 */
export function useRunSqlWorksheet(
  onProgress: (message: string) => void,
  options?: Partial<
    UseMutationOptions<
      RunSqlWorksheetResult,
      SynapseClientError | Error,
      string
    >
  >,
) {
  const { accessToken } = useSynapseContext()
  return useMutation<RunSqlWorksheetResult, SynapseClientError | Error, string>(
    {
      ...options,
      mutationFn: async sql => {
        const plan = planWorksheetQuery(sql)
        switch (plan.kind) {
          case 'invalid':
            throw new Error(plan.reason)
          case 'direct': {
            const result = await runTableQuery(
              plan.entityId,
              sql,
              accessToken,
              onProgress,
            )
            return { ...result, sourceIds: [plan.entityId] }
          }
          case 'combined': {
            const response = await runSqlQuery(
              { sql, limit: WORKSHEET_ROW_LIMIT },
              accessToken,
              jobStatus => onProgress(jobStatus.progressMessage ?? ''),
            )
            return {
              sourceIds: plan.sourceIds,
              columns: response.rowSet.headers ?? [],
              rows: response.rowSet.rows ?? [],
              isTruncated: response.isTruncated,
            }
          }
        }
      },
    },
  )
}
