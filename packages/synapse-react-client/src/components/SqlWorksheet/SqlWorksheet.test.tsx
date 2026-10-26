import { registerTableQueryResult } from '@/mocks/msw/handlers/tableQueryService'
import mockRejectionReasonsTableQueryResultBundle from '@/mocks/query/mockRejectionReasonsTableQueryResultBundle'
import { server } from '@/mocks/msw/server'
import {
  SQL_QUERY_REQUEST_CONCRETE_TYPE_VALUE,
  SQL_WORKSHEET_CONCRETE_TYPE_VALUE,
  SqlQueryResponse,
  SqlWorksheetEntity,
} from '@/synapse-queries/table/SqlQuery'
import { createWrapper } from '@/testutils/TestingLibraryUtils'
import {
  BackendDestinationEnum,
  getEndpoint,
} from '@/utils/functions/getEndpoint'
import {
  MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
  MaterializedView,
} from '@sage-bionetworks/synapse-types'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { CREATE_ANYWAY_LABEL, DUPLICATE_VIEW_MESSAGE } from './SaveSqlDialog'
import SqlWorksheet, {
  RUN_BUTTON_LABEL,
  SAVE_AS_VIEW_BUTTON_LABEL,
  SAVE_AS_WORKSHEET_BUTTON_LABEL,
  SAVE_BUTTON_LABEL,
  SAVED_MESSAGE,
} from './SqlWorksheet'
import { ROW_LIMIT_MESSAGE } from './SqlWorksheetResults'
import { WORKSHEET_ROW_LIMIT } from './SqlWorksheetUtils'

const REPO = getEndpoint(BackendDestinationEnum.REPO_ENDPOINT)
const TABLE_ID =
  mockRejectionReasonsTableQueryResultBundle.queryResult!.queryResults.tableId
const PARENT_ID = 'syn5550000'
const JOIN_SQL = `SELECT a.id AS id, b.arm AS arm FROM ${TABLE_ID} a JOIN syn2 b ON a.id = b.id`
const JOB_TOKEN = '4242'

const JOIN_RESPONSE: SqlQueryResponse = {
  rowSet: {
    tableId: '',
    concreteType: 'org.sagebionetworks.repo.model.table.RowSet',
    etag: '',
    headers: [
      { name: 'id', columnType: 'STRING' },
      { name: 'arm', columnType: 'STRING' },
    ],
    rows: [{ values: ['p1', 'A'] }],
  },
  isTruncated: true,
}

/** Serves the SQL query job, and records what was asked of it and whether any entity was written. */
function serveSqlQueryJob() {
  const calls = { sqlQueryRequests: [] as unknown[], entityWrites: 0 }
  server.use(
    http.post(
      `${REPO}/repo/v1/table/sql/query/async/start`,
      async ({ request }) => {
        calls.sqlQueryRequests.push(await request.json())
        return HttpResponse.json({ token: JOB_TOKEN })
      },
    ),
    http.get(`${REPO}/repo/v1/asynchronous/job/${JOB_TOKEN}`, () =>
      HttpResponse.json({ jobState: 'COMPLETE', responseBody: JOIN_RESPONSE }),
    ),
    http.post(`${REPO}/repo/v1/entity`, () => {
      calls.entityWrites++
      return HttpResponse.json({}, { status: 500 })
    }),
  )
  return calls
}

async function fillSaveDialog(name: string) {
  const dialog = await screen.findByRole('dialog')
  await userEvent.type(within(dialog).getByLabelText(/Name/), name)
  await userEvent.type(
    within(dialog).getByLabelText('Project or folder'),
    PARENT_ID,
  )
  return dialog
}

function renderComponent(props: Parameters<typeof SqlWorksheet>[0]) {
  return render(<SqlWorksheet {...props} />, { wrapper: createWrapper() })
}

describe('SqlWorksheet', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('runs a query on one table directly and shows the rows', async () => {
    const sql = `SELECT * FROM ${TABLE_ID}`
    registerTableQueryResult(
      { sql },
      mockRejectionReasonsTableQueryResultBundle,
    )
    renderComponent({ initialSql: sql })

    await userEvent.click(
      screen.getByRole('button', { name: RUN_BUTTON_LABEL }),
    )

    expect(
      await screen.findByRole('columnheader', { name: 'Rejection Reason' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Lineage' })).toBeInTheDocument()
  })

  it('runs a JOIN as a SQL query job, without creating any entity', async () => {
    const calls = serveSqlQueryJob()
    renderComponent({ initialSql: JOIN_SQL })

    await userEvent.click(
      screen.getByRole('button', { name: RUN_BUTTON_LABEL }),
    )

    expect(
      await screen.findByRole('columnheader', { name: 'arm' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'A' })).toBeInTheDocument()
    expect(screen.getByText(ROW_LIMIT_MESSAGE)).toBeInTheDocument()
    expect(calls.sqlQueryRequests).toEqual([
      {
        concreteType: SQL_QUERY_REQUEST_CONCRETE_TYPE_VALUE,
        sql: JOIN_SQL,
        limit: WORKSHEET_ROW_LIMIT,
      },
    ])
    expect(calls.entityWrites).toBe(0)
  })

  it('saves the SQL as a worksheet, then saves edits to it', async () => {
    let created: SqlWorksheetEntity | undefined
    let updated: SqlWorksheetEntity | undefined
    server.use(
      http.post(`${REPO}/repo/v1/entity`, async ({ request }) => {
        created = (await request.json()) as SqlWorksheetEntity
        return HttpResponse.json({ ...created, id: 'syn777', etag: 'e1' })
      }),
      http.put(`${REPO}/repo/v1/entity/syn777`, async ({ request }) => {
        updated = (await request.json()) as SqlWorksheetEntity
        return HttpResponse.json({ ...updated, etag: 'e2' })
      }),
    )
    renderComponent({ initialSql: JOIN_SQL })

    await userEvent.click(
      screen.getByRole('button', { name: SAVE_AS_WORKSHEET_BUTTON_LABEL }),
    )
    const dialog = await fillSaveDialog('cohort join')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await within(dialog).findByText(/Saved as/)).toBeInTheDocument()
    expect(created).toEqual({
      name: 'cohort join',
      parentId: PARENT_ID,
      concreteType: SQL_WORKSHEET_CONCRETE_TYPE_VALUE,
      definingSQL: JOIN_SQL,
    })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))

    const editor = screen.getByLabelText('SQL')
    await userEvent.type(editor, ' WHERE b.arm = 1')
    await userEvent.click(
      screen.getByRole('button', { name: SAVE_BUTTON_LABEL }),
    )

    expect(await screen.findByText(SAVED_MESSAGE)).toBeInTheDocument()
    expect(updated).toMatchObject({
      id: 'syn777',
      etag: 'e1',
      definingSQL: `${JOIN_SQL} WHERE b.arm = 1`,
    })
  })

  it('warns before creating a materialized view whose SQL is already a view there', async () => {
    const existing: MaterializedView = {
      id: 'syn9602669',
      name: 'Testing',
      parentId: PARENT_ID,
      concreteType: MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
      // Same SQL, laid out differently
      definingSQL: JOIN_SQL.replace(' FROM ', '\nFROM ').toLowerCase(),
      columnIds: [],
      isSearchEnabled: false,
    }
    let createdView: MaterializedView | undefined
    server.use(
      http.post(`${REPO}/repo/v1/entity/children`, () =>
        HttpResponse.json({
          page: [{ id: existing.id, name: existing.name }],
        }),
      ),
      http.get(`${REPO}/repo/v1/entity/${existing.id}`, () =>
        HttpResponse.json(existing),
      ),
      http.post(`${REPO}/repo/v1/entity`, async ({ request }) => {
        createdView = (await request.json()) as MaterializedView
        return HttpResponse.json({ ...createdView, id: 'syn888' })
      }),
    )
    renderComponent({ initialSql: JOIN_SQL })

    await userEvent.click(
      screen.getByRole('button', { name: SAVE_AS_VIEW_BUTTON_LABEL }),
    )
    const dialog = await fillSaveDialog('Testing again')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(
      await within(dialog).findByText(DUPLICATE_VIEW_MESSAGE, { exact: false }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('link', { name: 'Testing (syn9602669)' }),
    ).toBeInTheDocument()
    expect(createdView).toBeUndefined()

    await userEvent.click(
      within(dialog).getByRole('button', { name: CREATE_ANYWAY_LABEL }),
    )

    expect(await within(dialog).findByText(/Saved as/)).toBeInTheDocument()
    expect(createdView).toEqual({
      name: 'Testing again',
      parentId: PARENT_ID,
      concreteType: MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
      definingSQL: JOIN_SQL,
      columnIds: [],
      isSearchEnabled: false,
    })
  })

  it('opens a saved worksheet with its SQL', () => {
    renderComponent({
      worksheet: {
        id: 'syn777',
        name: 'cohort join',
        parentId: PARENT_ID,
        concreteType: SQL_WORKSHEET_CONCRETE_TYPE_VALUE,
        definingSQL: JOIN_SQL,
      },
    })

    expect(screen.getByLabelText('SQL')).toHaveValue(JOIN_SQL)
    expect(
      screen.getByRole('heading', { name: 'cohort join' }),
    ).toBeInTheDocument()
    // Nothing changed yet, so there is nothing to save.
    expect(
      screen.getByRole('button', { name: SAVE_BUTTON_LABEL }),
    ).toBeDisabled()
  })
})
