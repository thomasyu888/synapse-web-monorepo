import { getFileColumnModelId } from '@/components/SynapseTable/SynapseTableUtils'
import { RequestAccessWithOneApplicationButton } from '@/features/gaas/RequestAccessWithOneApplicationButton'
import SynapseClient from '@/synapse-client'
import { SynapseConstants } from '@/utils'
import { useSynapseContext } from '@/utils/context/SynapseContext'
import { Box, Typography } from '@mui/material'
import {
  ColumnModel,
  QueryBundleRequest,
} from '@sage-bionetworks/synapse-types'
import { noop, times } from 'lodash-es'
import { useEffect } from 'react'
import { useGetActionsRequiredForTableQuery } from '../../synapse-queries/entity/useActionsRequiredForTableQuery'
import useTrackTransientListItems from '../../utils/hooks/useTrackTransientListItems'
import { LoadingActionRequiredCard } from './ActionRequiredCard/ActionRequiredCard'
import { ActionRequiredListItem } from './ActionRequiredListItem'

export type TableQueryActionsRequiredProps = {
  /** The query request to use to select rows to check if actions are required. */
  queryBundleRequest: QueryBundleRequest
  /** The column models of the table */
  columnModels: ColumnModel[]
  /** Invoked when the number of required actions changes. Can be used to set UI state based on if all actions have been fulfilled */
  onNumberOfRequiredActionsChanged?: (actionsRequired: number) => void
}

/** Caps how many rows go into one unified access request. */
const MAX_UNIFIED_REQUEST_ROWS = 1000

/**
 * Collects the entity IDs in the table's file column, with the user's current facet selections and filters applied.
 */
async function getTableQueryEntityIds(
  queryBundleRequest: QueryBundleRequest,
  fileColumn: ColumnModel,
  accessToken: string | undefined,
) {
  const { selectedFacets, additionalFilters } = queryBundleRequest.query
  const result = await SynapseClient.getQueryTableResults(
    {
      ...queryBundleRequest,
      partMask: SynapseConstants.BUNDLE_MASK_QUERY_RESULTS,
      query: {
        sql: `SELECT "${fileColumn.name}" FROM ${queryBundleRequest.entityId}`,
        selectedFacets,
        additionalFilters,
        offset: 0,
        limit: MAX_UNIFIED_REQUEST_ROWS,
      },
    },
    accessToken,
  )
  const ids =
    result.queryResult?.queryResults.rows.map(row => row.values[0]) ?? []
  return Array.from(
    new Set(ids.filter((id): id is string => typeof id === 'string' && id !== '')),
  )
}

/**
 * Displays an interactive list of actions required to take for a user to gain access to Synapse entities referenced in
 * a table query.
 */
export function TableQueryActionsRequired(
  props: TableQueryActionsRequiredProps,
) {
  const {
    queryBundleRequest,
    columnModels,
    onNumberOfRequiredActionsChanged = noop,
  } = props
  const { accessToken } = useSynapseContext()
  const fileColumnId = getFileColumnModelId(columnModels)
  const fileColumn = columnModels.find(cm => cm.id === fileColumnId)

  // This component will track all completed actions, based on which actions are omitted from the ActionsRequiredResponse
  // as the user performs required tasks
  const { data: currentActionsRequired, isLoading } =
    useGetActionsRequiredForTableQuery(queryBundleRequest, columnModels, {
      throwOnError: true,
    })

  // PORTALS-2950 - Keep a record of actions that disappear from the server response - i.e. the 'completed' actions
  const allCompleteAndIncompleteActions = useTrackTransientListItems(
    currentActionsRequired,
  )

  useEffect(() => {
    if (currentActionsRequired) {
      onNumberOfRequiredActionsChanged(currentActionsRequired.length)
    }
  }, [currentActionsRequired, onNumberOfRequiredActionsChanged])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      {/* If no actions were ever required, show a message */}
      {!isLoading && allCompleteAndIncompleteActions.length === 0 && (
        <Typography
          variant={'body1Italic'}
          sx={{ p: 4, textAlign: 'center', color: 'grey.700' }}
        >
          All requirements have been met. No actions are required.
        </Typography>
      )}
      {fileColumn && allCompleteAndIncompleteActions.length > 0 && (
        <Box>
          <RequestAccessWithOneApplicationButton
            getEntityIds={() =>
              getTableQueryEntityIds(queryBundleRequest, fileColumn, accessToken)
            }
          />
        </Box>
      )}
      {allCompleteAndIncompleteActions.map((item, index) => (
        <ActionRequiredListItem
          key={index}
          action={item.action}
          count={item.count}
        />
      ))}
      {isLoading && times(3).map(k => <LoadingActionRequiredCard key={k} />)}
    </Box>
  )
}
