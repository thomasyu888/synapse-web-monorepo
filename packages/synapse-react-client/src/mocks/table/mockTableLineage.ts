import { TableLineage } from '@/synapse-queries/table/TableLineage'
import {
  ENTITY_VIEW_CONCRETE_TYPE_VALUE,
  MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
  TABLE_ENTITY_CONCRETE_TYPE_VALUE,
} from '@sage-bionetworks/synapse-types'

export const MOCK_LINEAGE_ROOT_ID = 'syn9100003'

/**
 * Two source tables feed a materialized view (the root), which feeds a second view that is still rebuilding and a
 * third that failed. One source cannot be read by the caller, and one dependency names a deleted view.
 */
export const mockTableLineage: TableLineage = {
  rootId: MOCK_LINEAGE_ROOT_ID,
  isTruncated: false,
  nodes: [
    {
      id: MOCK_LINEAGE_ROOT_ID,
      access: 'READABLE',
      name: 'Participants with samples',
      concreteType: MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
      tableState: 'AVAILABLE',
      stateChangedOn: '2026-10-20T15:04:05.000Z',
    },
    {
      id: 'syn9100001',
      access: 'READABLE',
      name: 'Participants',
      concreteType: TABLE_ENTITY_CONCRETE_TYPE_VALUE,
      tableState: 'AVAILABLE',
      stateChangedOn: '2026-10-19T10:00:00.000Z',
    },
    {
      id: 'syn9100002.3',
      access: 'READABLE',
      name: 'Biospecimens',
      concreteType: ENTITY_VIEW_CONCRETE_TYPE_VALUE,
      tableState: 'AVAILABLE',
      stateChangedOn: '2026-10-19T11:00:00.000Z',
    },
    { id: 'syn9100009', access: 'RESTRICTED' },
    {
      id: 'syn9100004',
      access: 'READABLE',
      name: 'Samples per site',
      concreteType: MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
      tableState: 'PROCESSING',
      stateChangedOn: '2026-10-20T15:04:06.000Z',
    },
    {
      id: 'syn9100005',
      access: 'READABLE',
      name: 'Cohort summary',
      concreteType: MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
      tableState: 'PROCESSING_FAILED',
      stateChangedOn: '2026-10-20T15:04:07.000Z',
      errorMessage: "Column 'site' does not exist.",
    },
    { id: 'syn9100006', access: 'NOT_FOUND' },
  ],
  edges: [
    { sourceId: 'syn9100001', dependentId: MOCK_LINEAGE_ROOT_ID },
    { sourceId: 'syn9100002.3', dependentId: MOCK_LINEAGE_ROOT_ID },
    { sourceId: 'syn9100009', dependentId: MOCK_LINEAGE_ROOT_ID },
    { sourceId: MOCK_LINEAGE_ROOT_ID, dependentId: 'syn9100004' },
    { sourceId: MOCK_LINEAGE_ROOT_ID, dependentId: 'syn9100005' },
    { sourceId: MOCK_LINEAGE_ROOT_ID, dependentId: 'syn9100006' },
  ],
}

export const mockTruncatedTableLineage: TableLineage = {
  ...mockTableLineage,
  isTruncated: true,
}
