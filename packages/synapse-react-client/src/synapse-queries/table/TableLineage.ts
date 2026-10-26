/**
 * Response of GET /repo/v1/entity/{id}/table/lineage. Mirrors org.sagebionetworks.repo.model.table.TableLineage until
 * the generated @sage-bionetworks/synapse-client includes it.
 */

export type LineageDirection = 'UPSTREAM' | 'DOWNSTREAM' | 'BOTH'

/** What the caller may see of a node: READABLE nodes carry name, type and state; the others only their id. */
export type LineageAccess = 'READABLE' | 'RESTRICTED' | 'NOT_FOUND'

export type LineageTableState = 'AVAILABLE' | 'PROCESSING' | 'PROCESSING_FAILED'

export type TableLineageNode = {
  /** The id of the object, with its version when the dependency is pinned (e.g. 'syn123' or 'syn123.4') */
  id: string
  access: LineageAccess
  name?: string
  concreteType?: string
  tableState?: LineageTableState
  stateChangedOn?: string
  errorMessage?: string
  /**
   * True when the object is AVAILABLE but a readable source in the graph changed after it was built, is being rebuilt,
   * or is itself stale: the object will be rebuilt. Only set with tableState.
   */
  isStale?: boolean
}

/** The dependent object is built from the source. */
export type TableLineageEdge = {
  sourceId: string
  dependentId: string
}

export type TableLineage = {
  rootId: string
  nodes: TableLineageNode[]
  edges: TableLineageEdge[]
  isTruncated: boolean
}
