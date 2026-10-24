import { TableLineageNode } from '@/synapse-queries/table/TableLineage'
import { MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE } from '@sage-bionetworks/synapse-types'
import { convertToEntityType } from '@/utils/functions/EntityTypeUtils'
import { Chip, CircularProgress, Tooltip } from '@mui/material'
import { EntityTypeIcon } from '../EntityIcon'
import IconSvg from '../IconSvg/IconSvg'
import styles from './TableLineageGraph.module.scss'
import {
  formatTimeAgo,
  getLineageNodeDisplayName,
} from './TableLineageGraphUtils'

export const AVAILABLE_LABEL = 'Available'
export const PROCESSING_LABEL = 'Processing'
export const FAILED_LABEL = 'Failed'
export const ROOT_LABEL = 'Selected'
export const REBUILT_LABEL = 'Rebuilt'
export const UPDATED_LABEL = 'Updated'

function LineageNodeIcon({ node }: { node: TableLineageNode }) {
  if (node.access === 'RESTRICTED') {
    return <IconSvg icon="accessClosed" wrap={false} fontSize="small" />
  }
  if (!node.concreteType) {
    return <IconSvg icon="delete" wrap={false} fontSize="small" />
  }
  return (
    <EntityTypeIcon
      type={convertToEntityType(node.concreteType)}
      includeTooltip={false}
      wrap={false}
    />
  )
}

function LineageStateChip({ node }: { node: TableLineageNode }) {
  switch (node.tableState) {
    case 'AVAILABLE':
      return <Chip size="small" color="success" label={AVAILABLE_LABEL} />
    case 'PROCESSING':
      return (
        <Chip
          size="small"
          color="info"
          icon={<CircularProgress size={12} color="inherit" />}
          label={PROCESSING_LABEL}
        />
      )
    case 'PROCESSING_FAILED':
      return (
        <Tooltip title={node.errorMessage ?? ''}>
          <Chip size="small" color="error" label={FAILED_LABEL} />
        </Tooltip>
      )
    default:
      return null
  }
}

export type TableLineageNodeLabelProps = {
  node: TableLineageNode
  isRoot: boolean
  /** Whether the node's index changed since the previous fetch; the label flashes once to show it */
  recentlyChanged: boolean
  /** The time the relative "Rebuilt 4s ago" is measured from, in ms */
  nowMs: number
}

export function TableLineageNodeLabel({
  node,
  isRoot,
  recentlyChanged,
  nowMs,
}: TableLineageNodeLabelProps) {
  const name = getLineageNodeDisplayName(node)
  const changeLabel =
    node.concreteType === MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE
      ? REBUILT_LABEL
      : UPDATED_LABEL
  return (
    // Keyed on stateChangedOn so the flash replays each time the same node changes again
    <div
      key={node.stateChangedOn}
      className={recentlyChanged ? styles.recentlyChanged : undefined}
    >
      <div className={styles.nodeHeader}>
        <LineageNodeIcon node={node} />
        <Tooltip title={name} placement="top" enterNextDelay={300}>
          <span className={styles.nodeName}>{name}</span>
        </Tooltip>
      </div>
      <div className={styles.nodeFooter}>
        <span className={styles.nodeId}>
          {node.id}
          {isRoot && ` · ${ROOT_LABEL}`}
        </span>
        <LineageStateChip node={node} />
      </div>
      {node.stateChangedOn && (
        <div className={styles.nodeChangedOn}>
          {changeLabel} {formatTimeAgo(node.stateChangedOn, nowMs)}
        </div>
      )}
    </div>
  )
}
