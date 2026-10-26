import {
  SqlQueryRequest,
  SqlQueryResponse,
} from '@/synapse-queries/table/SqlQuery'
import { AsynchronousJobStatus } from '@sage-bionetworks/synapse-types'
import { http, HttpResponse } from 'msw'

export const MOCK_SQL_QUERY_JOB_TOKEN = '9100099'

export const mockSqlQueryResponse: SqlQueryResponse = {
  rowSet: {
    tableId: '',
    concreteType: 'org.sagebionetworks.repo.model.table.RowSet',
    etag: '',
    headers: [
      { name: 'id', columnType: 'STRING' },
      { name: 'age', columnType: 'INTEGER' },
      { name: 'type', columnType: 'STRING' },
    ],
    rows: [{ values: ['p1', '34', 'blood'] }, { values: ['p2', '51', 'skin'] }],
  },
  isTruncated: false,
}

/**
 * Serves every SQL query job with the given response.
 */
export function getSqlQueryHandlers(
  backendOrigin: string,
  response: SqlQueryResponse = mockSqlQueryResponse,
) {
  return [
    http.post(`${backendOrigin}/repo/v1/table/sql/query/async/start`, () =>
      HttpResponse.json({ token: MOCK_SQL_QUERY_JOB_TOKEN }, { status: 201 }),
    ),
    http.get(
      `${backendOrigin}/repo/v1/asynchronous/job/${MOCK_SQL_QUERY_JOB_TOKEN}`,
      () => {
        const status: Partial<
          AsynchronousJobStatus<SqlQueryRequest, SqlQueryResponse>
        > = {
          jobState: 'COMPLETE',
          responseBody: response,
        }
        return HttpResponse.json(status, { status: 200 })
      },
    ),
  ]
}
