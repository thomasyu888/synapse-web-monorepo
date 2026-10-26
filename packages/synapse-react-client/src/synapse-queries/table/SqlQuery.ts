import { HttpClient } from '@/synapse-client'
import {
  createEntity,
  getAsyncResultFromJobId,
  updateEntity,
} from '@/synapse-client/SynapseClient'
import {
  TABLE_SQL_QUERY_ASYNC_GET,
  TABLE_SQL_QUERY_ASYNC_START,
} from '@/utils/APIConstants'
import { BackendDestinationEnum } from '@/utils/functions/getEndpoint'
import {
  AsyncJobId,
  AsynchronousJobStatus,
  Entity,
  RowSet,
} from '@sage-bionetworks/synapse-types'

/**
 * The SQL query job and the SqlWorksheet entity mirror org.sagebionetworks.repo.model.table.SqlQueryRequest,
 * SqlQueryResponse and SqlWorksheet until the generated @sage-bionetworks/synapse-client includes them.
 */

export const SQL_QUERY_REQUEST_CONCRETE_TYPE_VALUE =
  'org.sagebionetworks.repo.model.table.SqlQueryRequest'

export const SQL_WORKSHEET_CONCRETE_TYPE_VALUE =
  'org.sagebionetworks.repo.model.table.SqlWorksheet'

export type SqlQueryRequest = {
  concreteType: typeof SQL_QUERY_REQUEST_CONCRETE_TYPE_VALUE
  sql: string
  /** The most rows to return, from 1 to 100 (the default) */
  limit?: number
}

export type SqlQueryResponse = {
  /** The rows; the headers describe the selected columns */
  rowSet: RowSet
  /** True when the SQL has more rows than were returned */
  isTruncated: boolean
}

/** A saved Synapse SQL query. It holds the SQL only: nothing is built from it, and it is not part of table lineage. */
export type SqlWorksheetEntity = {
  readonly id?: string
  readonly etag?: string
  name: string
  description?: string
  parentId?: string
  concreteType: typeof SQL_WORKSHEET_CONCRETE_TYPE_VALUE
  definingSQL: string
  versionNumber?: number
  versionLabel?: string
  versionComment?: string
  readonly modifiedOn?: string
}

/**
 * https://rest-docs.synapse.org/rest/POST/table/sql/query/async/start.html
 *
 * Runs SQL that may combine several tables and views, and waits for its first rows. Nothing is saved.
 */
export async function runSqlQuery(
  request: Omit<SqlQueryRequest, 'concreteType'>,
  accessToken: string | undefined,
  onStatus?: (
    status: AsynchronousJobStatus<SqlQueryRequest, SqlQueryResponse>,
  ) => void,
): Promise<SqlQueryResponse> {
  const asyncJobId = await HttpClient.doPost<AsyncJobId>(
    TABLE_SQL_QUERY_ASYNC_START,
    { ...request, concreteType: SQL_QUERY_REQUEST_CONCRETE_TYPE_VALUE },
    accessToken,
    BackendDestinationEnum.REPO_ENDPOINT,
  )
  const status = await getAsyncResultFromJobId<
    SqlQueryRequest,
    SqlQueryResponse
  >(
    asyncJobId.token,
    TABLE_SQL_QUERY_ASYNC_GET(asyncJobId.token),
    accessToken,
    onStatus,
  )
  return status.responseBody!
}

/**
 * Create the worksheet, or update it when it has an id.
 */
export async function saveSqlWorksheet(
  worksheet: SqlWorksheetEntity,
  accessToken: string | undefined,
): Promise<SqlWorksheetEntity> {
  // The entity helpers are typed with the concrete types the generated client knows, which do not include
  // SqlWorksheet yet.
  const entity = worksheet as unknown as Entity
  const saved = worksheet.id
    ? await updateEntity(entity, accessToken)
    : await createEntity(entity, accessToken)
  return saved as unknown as SqlWorksheetEntity
}

export function isSqlWorksheet(entity: {
  concreteType?: string
}): entity is SqlWorksheetEntity {
  return entity.concreteType === SQL_WORKSHEET_CONCRETE_TYPE_VALUE
}
