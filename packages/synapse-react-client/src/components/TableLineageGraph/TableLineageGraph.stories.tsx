import { getTableLineageHandlers } from '@/mocks/msw/handlers/tableLineageHandlers'
import {
  MOCK_LINEAGE_ROOT_ID,
  mockTableLineage,
  mockTruncatedTableLineage,
} from '@/mocks/table/mockTableLineage'
import { MOCK_REPO_ORIGIN } from '@/utils/functions/getEndpoint'
import { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import TableLineageGraph, { TableLineageGraphProps } from './TableLineageGraph'

const meta: Meta<TableLineageGraphProps> = {
  title: 'Synapse/Table/TableLineageGraph',
  component: TableLineageGraph,
  parameters: { stack: 'mock' },
  args: {
    entityId: MOCK_LINEAGE_ROOT_ID,
    containerHeight: '500px',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Lineage: Story = {
  parameters: {
    msw: {
      handlers: {
        tableLineage: getTableLineageHandlers(
          MOCK_REPO_ORIGIN,
          mockTableLineage,
        ),
      },
    },
  },
}

export const Truncated: Story = {
  parameters: {
    msw: {
      handlers: {
        tableLineage: getTableLineageHandlers(
          MOCK_REPO_ORIGIN,
          mockTruncatedTableLineage,
        ),
      },
    },
  },
}

export const NoLineage: Story = {
  parameters: {
    msw: {
      handlers: {
        tableLineage: getTableLineageHandlers(MOCK_REPO_ORIGIN, {
          rootId: MOCK_LINEAGE_ROOT_ID,
          isTruncated: false,
          nodes: [mockTableLineage.nodes[0]],
          edges: [],
        }),
      },
    },
  },
}

export const CustomNodeClick: Story = {
  args: { onNodeClick: fn() },
}
