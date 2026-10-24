import { useGetTableLineage } from '@/synapse-queries/table/useGetTableLineage'
import {
  LineageDirection,
  TableLineageNode,
} from '@/synapse-queries/table/TableLineage'
import { Alert, Typography } from '@mui/material'
import { MouseEvent, useCallback, useMemo, useState } from 'react'
import ReactFlow, { Controls, Node, ReactFlowProvider } from 'reactflow'
import { ErrorBanner, SynapseErrorBoundary } from '../error/ErrorBanner'
import { SynapseSpinner } from '../LoadingScreen/LoadingScreen'
import styles from './TableLineageGraph.module.scss'
import {
  getChangedNodeIds,
  getLineageFlowElements,
  getLineageNodeHref,
  hasLineage,
  LINEAGE_POLL_INTERVAL,
  LineageNodeData,
  NO_LINEAGE_MESSAGE,
  TRUNCATED_LINEAGE_MESSAGE,
} from './TableLineageGraphUtils'
import { TableLineageNodeLabel } from './TableLineageNodeLabel'
import 'reactflow/dist/style.css'

export type TableLineageGraphProps = {
  /** The table, view or materialized view whose lineage is shown */
  entityId: string
  versionNumber?: number
  /** Which dependencies to show. Default BOTH */
  direction?: LineageDirection
  /** How many dependency steps to follow in each direction. Default is the backend's (10) */
  maxDepth?: number
  /** CSS height of the graph. Default 400px */
  containerHeight?: string
  /**
   * Called when a readable node is clicked. When omitted, clicking a node opens that table in Synapse.
   */
  onNodeClick?: (node: TableLineageNode) => void
}

const CLASS_NAMES = {
  node: styles.node,
  root: styles.rootNode,
  unreadable: styles.unreadableNode,
  clickable: styles.clickable,
}

const isReadable = (node: TableLineageNode) => node.access === 'READABLE'

const NO_CHANGES = new Set<string>()

function TableLineageReactFlow(props: TableLineageGraphProps) {
  const {
    entityId,
    versionNumber,
    direction = 'BOTH',
    maxDepth,
    containerHeight = '400px',
    onNodeClick,
  } = props

  const params = useMemo(
    () => ({ entityId, versionNumber, direction, maxDepth }),
    [entityId, versionNumber, direction, maxDepth],
  )
  // Polls while shown (react-query pauses it while the browser tab is hidden), so a change can be watched travelling
  // downstream. dataUpdatedAt advances on every fetch, which keeps the "Rebuilt 4s ago" times current.
  const {
    data: lineage,
    dataUpdatedAt,
    isLoading,
    error,
  } = useGetTableLineage(params, { refetchInterval: LINEAGE_POLL_INTERVAL })

  // Compare each fetch with the previous one, to flash the nodes whose index just changed. A fetch that returns the
  // same lineage keeps the same object (react-query's structural sharing), so the changes are cleared then.
  const [previousFetch, setPreviousFetch] = useState({ lineage, dataUpdatedAt })
  const [changedNodeIds, setChangedNodeIds] = useState(NO_CHANGES)
  if (dataUpdatedAt !== previousFetch.dataUpdatedAt) {
    setChangedNodeIds(
      lineage === previousFetch.lineage
        ? NO_CHANGES
        : getChangedNodeIds(previousFetch.lineage, lineage),
    )
    setPreviousFetch({ lineage, dataUpdatedAt })
  }

  const elements = useMemo(() => {
    if (!lineage) {
      return undefined
    }
    const renderLabel = (node: TableLineageNode, isRoot: boolean) => (
      <TableLineageNodeLabel
        node={node}
        isRoot={isRoot}
        recentlyChanged={changedNodeIds.has(node.id)}
        nowMs={dataUpdatedAt}
      />
    )
    return getLineageFlowElements(
      lineage,
      CLASS_NAMES,
      isReadable,
      renderLabel,
      changedNodeIds,
    )
  }, [lineage, changedNodeIds, dataUpdatedAt])

  const onClickFlowNode = useCallback(
    (_event: MouseEvent, node: Node<LineageNodeData>) => {
      const { lineageNode } = node.data
      if (!isReadable(lineageNode)) {
        return
      }
      if (onNodeClick) {
        onNodeClick(lineageNode)
      } else {
        window.location.assign(getLineageNodeHref(lineageNode.id))
      }
    },
    [onNodeClick],
  )

  if (isLoading) {
    return <SynapseSpinner />
  }
  if (error) {
    return <ErrorBanner error={error} />
  }
  if (!lineage || !elements) {
    return null
  }

  return (
    <div className={styles.container}>
      {lineage.isTruncated && (
        <Alert severity="info" sx={{ mb: 1 }}>
          {TRUNCATED_LINEAGE_MESSAGE}
        </Alert>
      )}
      {!hasLineage(lineage) && (
        <Typography variant="body1" sx={{ mb: 1 }}>
          {NO_LINEAGE_MESSAGE}
        </Typography>
      )}
      <div
        role="graphics-doc"
        aria-label={`Lineage of ${lineage.rootId}`}
        style={{ width: '100%', height: containerHeight }}
      >
        <ReactFlow
          nodes={elements.nodes}
          edges={elements.edges}
          onNodeClick={onClickFlowNode}
          nodesConnectable={false}
          nodesDraggable={false}
          zoomOnScroll={false}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  )
}

/**
 * Shows the lineage of a table or view as a graph: the tables and views it is built from on the left, and the
 * materialized views built from it on the right, each with the current state of its index.
 */
export default function TableLineageGraph(props: TableLineageGraphProps) {
  return (
    <SynapseErrorBoundary>
      <ReactFlowProvider>
        <TableLineageReactFlow {...props} />
      </ReactFlowProvider>
    </SynapseErrorBoundary>
  )
}
