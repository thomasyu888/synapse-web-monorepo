import { RequestAccessWithOneApplicationButton } from '@/features/gaas/RequestAccessWithOneApplicationButton'
import SynapseClient from '@/synapse-client'
import { useGetAllDownloadListActionsRequired } from '@/synapse-queries'
import { useSynapseContext } from '@/utils/context/SynapseContext'
import useTrackTransientListItems from '@/utils/hooks/useTrackTransientListItems'
import { Box } from '@mui/material'
import { AvailableFilesResponse } from '@sage-bionetworks/synapse-types'
import { times } from 'lodash-es'
import { LoadingActionRequiredCard } from './ActionRequiredCard/ActionRequiredCard'
import { ActionRequiredListItem } from './ActionRequiredListItem'

/** Caps how many download list files go into one unified access request. */
const MAX_UNIFIED_REQUEST_FILES = 1000

async function getDownloadListEntityIds(accessToken: string | undefined) {
  const entityIds: string[] = []
  let nextPageToken: string | undefined = undefined
  do {
    const response: AvailableFilesResponse = await SynapseClient.getAvailableFilesToDownload(
      {
        concreteType:
          'org.sagebionetworks.repo.model.download.AvailableFilesRequest',
        nextPageToken,
      },
      accessToken,
    )
    entityIds.push(...response.page.map(item => item.fileEntityId))
    nextPageToken = response.nextPageToken
  } while (nextPageToken && entityIds.length < MAX_UNIFIED_REQUEST_FILES)
  return entityIds.slice(0, MAX_UNIFIED_REQUEST_FILES)
}

export function DownloadListActionsRequired() {
  const { accessToken } = useSynapseContext()
  // This component will track all completed actions, based on which actions are omitted from the ActionsRequiredResponse as the user performs required tasks
  // For accurate tracking, we must make sure we have all data. So we will fetch all pages instead of one page at a time.
  const { data: currentActionsRequired, isLoading } =
    useGetAllDownloadListActionsRequired({
      throwOnError: true,
    })

  // PORTALS-2950 - Keep a record of actions that disappear from the server response - i.e. the 'completed' actions
  const allCompleteAndIncompleteActions = useTrackTransientListItems(
    currentActionsRequired,
  )

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          pt: 5,
        }}
      >
        {allCompleteAndIncompleteActions.length > 0 && (
          <Box>
            <RequestAccessWithOneApplicationButton
              getEntityIds={() => getDownloadListEntityIds(accessToken)}
            />
          </Box>
        )}
        {allCompleteAndIncompleteActions.map((item, index) => {
          if (item) {
            return (
              <ActionRequiredListItem
                key={index}
                action={item.action}
                count={item.count}
              />
            )
          } else return false
        })}
        {isLoading && times(3).map(k => <LoadingActionRequiredCard key={k} />)}
      </Box>
    </>
  )
}
