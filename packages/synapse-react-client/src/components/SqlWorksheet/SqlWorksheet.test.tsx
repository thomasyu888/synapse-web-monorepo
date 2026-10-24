import { registerTableQueryResult } from '@/mocks/msw/handlers/tableQueryService'
import mockRejectionReasonsTableQueryResultBundle from '@/mocks/query/mockRejectionReasonsTableQueryResultBundle'
import { server } from '@/mocks/msw/server'
import { createWrapper } from '@/testutils/TestingLibraryUtils'
import {
  BackendDestinationEnum,
  getEndpoint,
} from '@/utils/functions/getEndpoint'
import {
  MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
  MaterializedView,
} from '@sage-bionetworks/synapse-types'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import SqlWorksheet, {
  RUN_BUTTON_LABEL,
  SCRATCH_PARENT_LABEL,
} from './SqlWorksheet'
import {
  SCRATCH_PARENT_STORAGE_KEY,
  SCRATCH_VIEW_NAME,
} from './SqlWorksheetUtils'
import { SCRATCH_PARENT_REQUIRED_MESSAGE } from './useRunSqlWorksheet'

const REPO = getEndpoint(BackendDestinationEnum.REPO_ENDPOINT)
const TABLE_ID =
  mockRejectionReasonsTableQueryResultBundle.queryResult!.queryResults.tableId
const SCRATCH_PARENT_ID = 'syn5550000'
const SCRATCH_VIEW_ID = 'syn5550001'
const JOIN_SQL = `SELECT * FROM ${TABLE_ID} a JOIN syn2 b ON a.id = b.id`

function renderComponent(initialSql: string) {
  return render(<SqlWorksheet initialSql={initialSql} />, {
    wrapper: createWrapper(),
  })
}

describe('SqlWorksheet', () => {
  beforeAll(() => server.listen())
  beforeEach(() => localStorage.removeItem(SCRATCH_PARENT_STORAGE_KEY))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('runs a query on one table directly and shows the rows', async () => {
    const sql = `SELECT * FROM ${TABLE_ID}`
    registerTableQueryResult(
      { sql },
      mockRejectionReasonsTableQueryResultBundle,
    )
    renderComponent(sql)

    expect(
      screen.queryByLabelText(SCRATCH_PARENT_LABEL),
    ).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: RUN_BUTTON_LABEL }),
    )

    expect(
      await screen.findByRole('columnheader', { name: 'Rejection Reason' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Lineage' })).toBeInTheDocument()
  })

  it('asks for a scratch project before running a JOIN', async () => {
    renderComponent(JOIN_SQL)

    expect(screen.getByLabelText(SCRATCH_PARENT_LABEL)).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: RUN_BUTTON_LABEL }),
    )

    expect(
      await screen.findByText(SCRATCH_PARENT_REQUIRED_MESSAGE),
    ).toBeInTheDocument()
  })

  it('runs a JOIN as the scratch materialized view and queries it', async () => {
    let createdView: MaterializedView | undefined
    server.use(
      http.post(`${REPO}/repo/v1/entity/child`, () =>
        HttpResponse.json({ reason: 'Not found' }, { status: 404 }),
      ),
      http.post(`${REPO}/repo/v1/entity`, async ({ request }) => {
        createdView = (await request.json()) as MaterializedView
        return HttpResponse.json({ ...createdView, id: SCRATCH_VIEW_ID })
      }),
    )
    registerTableQueryResult(
      { sql: `SELECT * FROM ${SCRATCH_VIEW_ID}` },
      mockRejectionReasonsTableQueryResultBundle,
    )
    localStorage.setItem(SCRATCH_PARENT_STORAGE_KEY, SCRATCH_PARENT_ID)
    renderComponent(JOIN_SQL)

    await userEvent.click(
      screen.getByRole('button', { name: RUN_BUTTON_LABEL }),
    )

    expect(
      await screen.findByRole('columnheader', { name: 'Rejection Reason' }),
    ).toBeInTheDocument()
    expect(createdView).toEqual({
      name: SCRATCH_VIEW_NAME,
      parentId: SCRATCH_PARENT_ID,
      concreteType: MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
      definingSQL: JOIN_SQL,
      columnIds: [],
      isSearchEnabled: false,
    })
  })
})
