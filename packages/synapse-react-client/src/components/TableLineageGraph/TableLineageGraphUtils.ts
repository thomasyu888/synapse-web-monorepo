import {
  TableLineage,
  TableLineageNode,
} from '@/synapse-queries/table/TableLineage'
import { parseSynId } from '@/utils/functions/RegularExpressions'
import { getLinkToEntityPage } from '@/utils/functions/getSynapseWebClientLink'
import dagre from 'dagre'
import { ReactNode } from 'react'
import { ConnectionLineType, Edge, MarkerType, Node, Position } from 'reactflow'

export const LINEAGE_NODE_WIDTH = 220
export const LINEAGE_NODE_HEIGHT = 100
/** How often the lineage is re-fetched while a change is travelling through it, in ms */
export const LINEAGE_ACTIVE_POLL_INTERVAL = 3000
/** How often the lineage is re-fetched while every node is up to date, in ms, to notice a change that starts */
export const LINEAGE_IDLE_POLL_INTERVAL = 30_000

/**
 * A change is travelling through the lineage while a node is being built or is stale (it will rebuild). A view that
 * is already AVAILABLE stays AVAILABLE while it rebuilds, so a stale node is the only sign of that.
 */
export function getLineagePollInterval(lineage: TableLineage | undefined) {
  const isChanging = lineage?.nodes.some(
    node => node.tableState === 'PROCESSING' || node.isStale === true,
  )
  return isChanging ? LINEAGE_ACTIVE_POLL_INTERVAL : LINEAGE_IDLE_POLL_INTERVAL
}

export const RESTRICTED_NODE_NAME = 'Restricted'
export const NOT_FOUND_NODE_NAME = 'Deleted'
export const TRUNCATED_LINEAGE_MESSAGE =
  'This lineage is too large to show in full. Open a table further along the chain to see more.'
export const NO_LINEAGE_MESSAGE =
  'Nothing is built from this table, and it is not built from other tables.'

export type LineageNodeData = {
  lineageNode: TableLineageNode
  isRoot: boolean
  /** Rendered by React Flow's default node */
  label: ReactNode
}

export function getLineageNodeDisplayName(node: TableLineageNode): string {
  switch (node.access) {
    case 'READABLE':
      return node.name ?? node.id
    case 'RESTRICTED':
      return RESTRICTED_NODE_NAME
    case 'NOT_FOUND':
      return NOT_FOUND_NODE_NAME
  }
}

export function getLineageNodeHref(nodeId: string): string {
  const reference = parseSynId(nodeId)
  return reference
    ? getLinkToEntityPage(reference.targetId, reference.targetVersionNumber)
    : getLinkToEntityPage(nodeId)
}

/**
 * @returns The ids of the nodes whose index changed between two fetches of the same lineage: a later stateChangedOn
 *  or a different tableState
 */
export function getChangedNodeIds(
  previous: TableLineage | undefined,
  current: TableLineage | undefined,
): Set<string> {
  const changed = new Set<string>()
  if (!previous || !current) {
    return changed
  }
  const previousById = new Map(previous.nodes.map(node => [node.id, node]))
  for (const node of current.nodes) {
    const before = previousById.get(node.id)
    if (!before) {
      continue
    }
    const advanced =
      node.stateChangedOn !== undefined &&
      before.stateChangedOn !== undefined &&
      Date.parse(node.stateChangedOn) > Date.parse(before.stateChangedOn)
    if (advanced || node.tableState !== before.tableState) {
      changed.add(node.id)
    }
  }
  return changed
}

/**
 * A short relative time with second precision ("4s ago", "3m ago"), so a change can be watched as it spreads.
 */
export function formatTimeAgo(isoDate: string, nowMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - Date.parse(isoDate)) / 1000))
  if (seconds < 60) {
    return `${seconds}s ago`
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  return `${Math.floor(hours / 24)}d ago`
}

export function hasLineage(lineage: TableLineage): boolean {
  return lineage.edges.length > 0
}

/**
 * Converts the lineage into React Flow elements laid out left to right, so sources sit to the left of what is built
 * from them.
 */
export function getLineageFlowElements(
  lineage: TableLineage,
  classNames: {
    node: string
    root: string
    unreadable: string
    clickable: string
  },
  isClickable: (node: TableLineageNode) => boolean,
  renderLabel: (lineageNode: TableLineageNode, isRoot: boolean) => ReactNode,
  changedNodeIds: Set<string> = new Set(),
): { nodes: Node<LineageNodeData>[]; edges: Edge[] } {
  const nodes: Node<LineageNodeData>[] = lineage.nodes.map(lineageNode => {
    const isRoot = lineageNode.id === lineage.rootId
    return {
      id: lineageNode.id,
      position: { x: 0, y: 0 },
      data: { lineageNode, isRoot, label: renderLabel(lineageNode, isRoot) },
      connectable: false,
      draggable: false,
      style: { width: LINEAGE_NODE_WIDTH },
      className: [
        classNames.node,
        isRoot ? classNames.root : '',
        lineageNode.access === 'READABLE' ? '' : classNames.unreadable,
        isClickable(lineageNode) ? classNames.clickable : '',
      ]
        .filter(Boolean)
        .join(' '),
    }
  })
  const edges: Edge[] = lineage.edges.map(edge => ({
    id: `${edge.sourceId}->${edge.dependentId}`,
    source: edge.sourceId,
    target: edge.dependentId,
    // An edge is animated while the change it carries is arriving: its dependent is rebuilding, or just rebuilt.
    animated:
      changedNodeIds.has(edge.dependentId) ||
      lineage.nodes.some(
        node =>
          node.id === edge.dependentId && node.tableState === 'PROCESSING',
      ),
    type: ConnectionLineType.SimpleBezier,
    markerEnd: { type: MarkerType.ArrowClosed },
  }))
  return { nodes: layoutLeftToRight(nodes, edges), edges }
}

function layoutLeftToRight<T>(nodes: Node<T>[], edges: Edge[]): Node<T>[] {
  // A fresh graph per layout: positions must not depend on nodes from a previous lineage.
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 80 })
  nodes.forEach(node =>
    graph.setNode(node.id, {
      width: LINEAGE_NODE_WIDTH,
      height: LINEAGE_NODE_HEIGHT,
    }),
  )
  edges.forEach(edge => graph.setEdge(edge.source, edge.target))
  dagre.layout(graph)
  return nodes.map(node => {
    const { x, y } = graph.node(node.id)
    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      // dagre positions the node's center; React Flow positions its top left corner
      position: {
        x: x - LINEAGE_NODE_WIDTH / 2,
        y: y - LINEAGE_NODE_HEIGHT / 2,
      },
    }
  })
}
