import { getTableLineageHandlers } from '@/mocks/msw/handlers/tableLineageHandlers'
import { server } from '@/mocks/msw/server'
import {
  MOCK_LINEAGE_ROOT_ID,
  mockTableLineage,
  mockTruncatedTableLineage,
} from '@/mocks/table/mockTableLineage'
import { TableLineage } from '@/synapse-queries/table/TableLineage'
import { createWrapper } from '@/testutils/TestingLibraryUtils'
import {
  BackendDestinationEnum,
  getEndpoint,
} from '@/utils/functions/getEndpoint'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import TableLineageGraph, { TableLineageGraphProps } from './TableLineageGraph'
import {
  NO_LINEAGE_MESSAGE,
  NOT_FOUND_NODE_NAME,
  RESTRICTED_NODE_NAME,
  TRUNCATED_LINEAGE_MESSAGE,
} from './TableLineageGraphUtils'
import {
  AVAILABLE_LABEL,
  FAILED_LABEL,
  PROCESSING_LABEL,
  REBUILT_LABEL,
  ROOT_LABEL,
  UPDATED_LABEL,
} from './TableLineageNodeLabel'

const REPO = getEndpoint(BackendDestinationEnum.REPO_ENDPOINT)

function useLineage(lineage: TableLineage) {
  server.use(...getTableLineageHandlers(REPO, lineage))
}

function renderComponent(props: Partial<TableLineageGraphProps> = {}) {
  return render(
    <TableLineageGraph entityId={MOCK_LINEAGE_ROOT_ID} {...props} />,
    { wrapper: createWrapper() },
  )
}

async function findNode(name: string) {
  const label = await screen.findByText(name)
  return label.closest('.react-flow__node') as HTMLElement
}

describe('TableLineageGraph', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('shows every node with its name, id and state', async () => {
    useLineage(mockTableLineage)
    renderComponent()

    const root = await findNode('Participants with samples')
    expect(
      within(root).getByText(`${MOCK_LINEAGE_ROOT_ID} · ${ROOT_LABEL}`),
    ).toBeInTheDocument()
    expect(within(root).getByText(AVAILABLE_LABEL)).toBeInTheDocument()

    expect(
      within(await findNode('Biospecimens')).getByText('syn9100002.3'),
    ).toBeInTheDocument()
    expect(
      within(await findNode('Samples per site')).getByText(PROCESSING_LABEL),
    ).toBeInTheDocument()
    expect(
      within(await findNode('Cohort summary')).getByText(FAILED_LABEL),
    ).toBeInTheDocument()
  })

  it('shows unreadable and deleted nodes by id only', async () => {
    useLineage(mockTableLineage)
    renderComponent()

    expect(
      within(await findNode(RESTRICTED_NODE_NAME)).getByText('syn9100009'),
    ).toBeInTheDocument()
    expect(
      within(await findNode(NOT_FOUND_NODE_NAME)).getByText('syn9100006'),
    ).toBeInTheDocument()
  })

  it('shows when each table last changed', async () => {
    useLineage(mockTableLineage)
    renderComponent()

    expect(
      within(await findNode('Participants with samples')).getByText(
        new RegExp(`^${REBUILT_LABEL} \\d+[smhd] ago$`),
      ),
    ).toBeInTheDocument()
    expect(
      within(await findNode('Participants')).getByText(
        new RegExp(`^${UPDATED_LABEL} \\d+[smhd] ago$`),
      ),
    ).toBeInTheDocument()
  })

  it('calls onNodeClick for a readable node, but not for a restricted one', async () => {
    useLineage(mockTableLineage)
    const onNodeClick = vi.fn()
    renderComponent({ onNodeClick })

    // A plain click: React Flow's d3 pan handler cannot process the pointer events userEvent sends in jsdom
    fireEvent.click(await findNode('Participants'))
    expect(onNodeClick).toHaveBeenCalledWith(
      mockTableLineage.nodes.find(node => node.id === 'syn9100001'),
    )

    onNodeClick.mockClear()
    fireEvent.click(await findNode(RESTRICTED_NODE_NAME))
    expect(onNodeClick).not.toHaveBeenCalled()
  })

  it('says when the lineage was cut short', async () => {
    useLineage(mockTruncatedTableLineage)
    renderComponent()

    expect(
      await screen.findByText(TRUNCATED_LINEAGE_MESSAGE),
    ).toBeInTheDocument()
  })

  it('says when there is no lineage', async () => {
    useLineage({
      rootId: MOCK_LINEAGE_ROOT_ID,
      isTruncated: false,
      nodes: [mockTableLineage.nodes[0]],
      edges: [],
    })
    renderComponent()

    expect(await screen.findByText(NO_LINEAGE_MESSAGE)).toBeInTheDocument()
    expect(
      screen.queryByText(TRUNCATED_LINEAGE_MESSAGE),
    ).not.toBeInTheDocument()
  })

  it('requests the given direction and depth', async () => {
    let requestedUrl: URL | undefined
    server.use(
      http.get(
        `${REPO}/repo/v1/entity/:entityId/table/lineage`,
        ({ request }) => {
          requestedUrl = new URL(request.url)
          return HttpResponse.json(mockTableLineage)
        },
      ),
    )
    renderComponent({ versionNumber: 2, direction: 'UPSTREAM', maxDepth: 3 })

    await screen.findByText('Participants with samples')
    expect(requestedUrl?.pathname).toBe(
      `/repo/v1/entity/${MOCK_LINEAGE_ROOT_ID}.2/table/lineage`,
    )
    expect(requestedUrl?.searchParams.get('direction')).toBe('UPSTREAM')
    expect(requestedUrl?.searchParams.get('maxDepth')).toBe('3')
  })

  it('shows the error when the lineage cannot be loaded', async () => {
    server.use(
      http.get(`${REPO}/repo/v1/entity/:entityId/table/lineage`, () =>
        HttpResponse.json(
          { reason: 'You lack READ access to the requested entity.' },
          { status: 403 },
        ),
      ),
    )
    renderComponent()

    expect(
      await screen.findByText('You lack READ access to the requested entity.'),
    ).toBeInTheDocument()
  })
})
