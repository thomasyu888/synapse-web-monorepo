import { server } from '@/mocks/msw/server'
import {
  SQL_WORKSHEET_CONCRETE_TYPE_VALUE,
  SqlWorksheetEntity,
} from '@/synapse-queries/table/SqlQuery'
import { createWrapper } from '@/testutils/TestingLibraryUtils'
import {
  BackendDestinationEnum,
  getEndpoint,
} from '@/utils/functions/getEndpoint'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { RUN_BUTTON_LABEL } from './SqlWorksheet'
import {
  OPEN_IN_SQL_WORKSHEET_LABEL,
  READS_HEADING,
} from './SqlWorksheetLandingPage'
import SqlWorksheetPage, { BACK_TO_WORKSHEET_LABEL } from './SqlWorksheetPage'

const REPO = getEndpoint(BackendDestinationEnum.REPO_ENDPOINT)
const SQL =
  'SELECT s.id AS id, p.arm AS arm FROM syn9602663 s JOIN syn9602662 p ON s.id = p.id'

const worksheet: SqlWorksheetEntity = {
  id: 'syn9602670',
  etag: 'e1',
  name: 'samples with arm',
  description: 'Each sample with its participant arm',
  parentId: 'syn9602661',
  concreteType: SQL_WORKSHEET_CONCRETE_TYPE_VALUE,
  definingSQL: SQL,
  versionNumber: 1,
}

function serveWorksheet() {
  server.use(
    http.get(`${REPO}/repo/v1/entity/${worksheet.id}`, () =>
      HttpResponse.json(worksheet),
    ),
    http.post(`${REPO}/repo/v1/entity/${worksheet.id}/bundle2`, () =>
      HttpResponse.json({ entity: worksheet, entityType: 'sqlworksheet' }),
    ),
    http.get(`${REPO}/repo/v1/entity/${worksheet.id}/path`, () =>
      HttpResponse.json({
        path: [
          { id: 'syn4489', name: 'root' },
          { id: 'syn9602661', name: 'Lineage demo' },
          { id: worksheet.id, name: worksheet.name },
        ],
      }),
    ),
  )
}

describe('SqlWorksheetPage', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('shows a saved worksheet as a page, and opens it in the editor', async () => {
    serveWorksheet()
    render(<SqlWorksheetPage entityId={worksheet.id} />, {
      wrapper: createWrapper(),
    })

    expect(await screen.findByText(SQL)).toBeInTheDocument()
    expect(screen.getByText(worksheet.description!)).toBeInTheDocument()
    // The breadcrumb comes from the entity's path, fetched on its own.
    expect(
      await screen.findByRole('link', { name: 'Lineage demo' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: READS_HEADING }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'syn9602663' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'syn9602662' })).toBeInTheDocument()
    // The page only shows the SQL; it runs from the editor.
    expect(
      screen.queryByRole('button', { name: RUN_BUTTON_LABEL }),
    ).not.toBeInTheDocument()

    await userEvent.click(
      await screen.findByRole('button', { name: OPEN_IN_SQL_WORKSHEET_LABEL }),
    )

    expect(screen.getByLabelText('SQL')).toHaveValue(SQL)
    expect(
      screen.getByRole('button', { name: RUN_BUTTON_LABEL }),
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: BACK_TO_WORKSHEET_LABEL }),
    )

    expect(
      await screen.findByRole('button', { name: OPEN_IN_SQL_WORKSHEET_LABEL }),
    ).toBeInTheDocument()
  })
})
