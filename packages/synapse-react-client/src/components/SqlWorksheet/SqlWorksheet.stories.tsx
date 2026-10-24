import { registerTableQueryResult } from '@/mocks/msw/handlers/tableQueryService'
import mockRejectionReasonsTableQueryResultBundle from '@/mocks/query/mockRejectionReasonsTableQueryResultBundle'
import { Meta, StoryObj } from '@storybook/react-vite'
import SqlWorksheet, { SqlWorksheetProps } from './SqlWorksheet'

const MOCK_TABLE_ID =
  mockRejectionReasonsTableQueryResultBundle.queryResult!.queryResults.tableId
const MOCK_SQL = `SELECT * FROM ${MOCK_TABLE_ID}`

const meta: Meta<SqlWorksheetProps> = {
  title: 'Synapse/Table/SqlWorksheet',
  component: SqlWorksheet,
  parameters: { stack: 'mock' },
  loaders: [
    () =>
      registerTableQueryResult(
        { sql: MOCK_SQL },
        mockRejectionReasonsTableQueryResultBundle,
      ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const SingleTableQuery: Story = {
  args: { initialSql: MOCK_SQL },
}

export const Join: Story = {
  args: {
    initialSql:
      'SELECT p.id, p.age, s.type\nFROM syn9100001 p\nJOIN syn9100002 s ON s.participant = p.id',
  },
}

export const FromEntity: Story = {
  args: { entityId: MOCK_TABLE_ID },
}
