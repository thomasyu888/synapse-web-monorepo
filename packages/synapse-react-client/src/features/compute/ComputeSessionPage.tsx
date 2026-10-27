import { displayToast } from '@/components'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { SynapseSpinner } from '@/components/LoadingScreen/LoadingScreen'
import {
  useExecuteCurationTask,
  useGetCurationTask,
  useGetCurationTaskStatus,
} from '@/synapse-queries/curation/task/useCurationTask'
import {
  InteractiveSessionExecutionDetails,
  getInteractiveSessionDetails,
  getInteractiveSessionProperties,
  useEndInteractiveSession,
  useOpenInteractiveSession,
} from '@/synapse-queries/curation/task/useInteractiveSession'
import { useGetEntity } from '@/synapse-queries/entity/useEntity'
import { TaskStatus } from '@sage-bionetworks/synapse-client'
import { Alert, Box, Button, Chip, Link, Stack, Typography } from '@mui/material'
import {
  BackendDestinationEnum,
  getEndpoint,
} from '@/utils/functions/getEndpoint'
import { useEffect, useState } from 'react'
import styles from './ComputeSessionPage.module.scss'

export type ComputeSessionPageProps = {
  taskId: number
}

/**
 * The framed session may run scripts and keep its own storage (JupyterLab needs both), but it may not download files,
 * open windows, or navigate the Synapse page, so code running in the session cannot use the browser to take data out.
 */
export const SESSION_FRAME_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-modals'
export const STATUS_POLL_MS = 3000
export const START_SESSION_BUTTON_TEXT = 'Start session'
export const END_SESSION_BUTTON_TEXT = 'End session'
export const RECONNECT_BUTTON_TEXT = 'Reconnect'
export const NOT_A_SESSION_TASK_MESSAGE = 'This task does not run an interactive session.'
export const IN_REVIEW_MESSAGE =
  'The session has ended. Its outputs are waiting for review; nothing leaves the enclave until they are approved.'

type SessionView = 'notStarted' | 'busy' | 'running' | 'inReview' | 'other'

function getSessionView(status: TaskStatus | undefined, details: InteractiveSessionExecutionDetails | undefined): SessionView {
  if (status?.state === 'NOT_STARTED') {
    return 'notStarted'
  }
  if (status?.state === 'EXECUTING') {
    // A job is attached while the session is being started or ended.
    return details?.asyncJobId || details?.sessionState !== 'RUNNING' ? 'busy' : 'running'
  }
  if (status?.state === 'IN_REVIEW') {
    return 'inReview'
  }
  return 'other'
}

function InputsSummary(props: { inputFolderId?: string; inputPaths?: string[] }) {
  const { inputFolderId, inputPaths } = props
  const { data: folder } = useGetEntity(inputFolderId, undefined, { enabled: !!inputFolderId })
  if (!inputFolderId) {
    return null
  }
  return (
    <Box className={styles.inputs}>
      <Typography variant="smallText1">
        Inputs from{' '}
        <Link href={`${getEndpoint(BackendDestinationEnum.PORTAL_ENDPOINT)}Synapse:${inputFolderId}`}>
          {folder?.name ?? inputFolderId} ({inputFolderId})
        </Link>
        {inputPaths ? `, copied read-only into the session: ${inputPaths.map(p => `inputs/${p}`).join(', ')}` : ''}
      </Typography>
    </Box>
  )
}

function useMinutesLeft(endsOn: string | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30 * 1000)
    return () => clearInterval(interval)
  }, [])
  return endsOn ? Math.max(0, Math.round((new Date(endsOn).getTime() - now) / 60000)) : undefined
}

/**
 * The page of an interactive session task: the task, its inputs, and its running session, shown in a frame served
 * from the enclave's own site. Starting, opening and ending the session all go through Synapse.
 */
export default function ComputeSessionPage(props: ComputeSessionPageProps) {
  const { taskId } = props
  const { data: task, isLoading: isTaskLoading, error: taskError } = useGetCurationTask(taskId)
  const [isPolling, setIsPolling] = useState(false)
  const { data: status, error: statusError } = useGetCurationTaskStatus(taskId, {
    refetchInterval: query => {
      const busy = getSessionView(query.state.data, getInteractiveSessionDetails(query.state.data)) === 'busy'
      return isPolling || busy ? STATUS_POLL_MS : false
    },
  })
  const details = getInteractiveSessionDetails(status)
  const view = getSessionView(status, details)
  const minutesLeft = useMinutesLeft(details?.endsOn)

  const [sessionUrl, setSessionUrl] = useState<string>()
  const [showEndConfirmation, setShowEndConfirmation] = useState(false)

  const { mutate: openSession, isPending: isOpening } = useOpenInteractiveSession({
    onSuccess: access => setSessionUrl(access.sessionUrl),
    onError: error => displayToast(error.message, 'danger'),
  })
  const { mutate: startSession, isPending: isStarting } = useExecuteCurationTask({
    onSuccess: () => openSession(taskId),
    onError: error => displayToast(error.message, 'danger'),
    onSettled: () => setIsPolling(false),
  })
  const { mutate: endSession, isPending: isEnding } = useEndInteractiveSession({
    onSuccess: () => setSessionUrl(undefined),
    onError: error => displayToast(error.message, 'danger'),
    onSettled: () => setIsPolling(false),
  })

  const isRunning = view === 'running'
  useEffect(() => {
    // A link opens the session only once, so one is asked for whenever a running session has none on this page.
    if (isRunning && !sessionUrl && !isOpening) {
      openSession(taskId)
    }
  }, [isRunning, sessionUrl, isOpening, openSession, taskId])

  if (isTaskLoading) {
    return <SynapseSpinner />
  }
  if (taskError || statusError) {
    return <Alert severity="error">{(taskError ?? statusError)?.message}</Alert>
  }
  const sessionProperties = getInteractiveSessionProperties(task?.taskProperties)
  if (!task || !sessionProperties) {
    return <Alert severity="warning">{NOT_A_SESSION_TASK_MESSAGE}</Alert>
  }

  const inputCount = details?.inputFiles?.length

  return (
    <Box className={styles.page}>
      <Stack direction="row" className={styles.header} alignItems="center" gap={2}>
        <Box className={styles.title}>
          <Typography variant="headline3" component="h1">
            {task.dataType}
          </Typography>
          <Typography variant="smallText1" color="text.secondary">
            {task.instructions}
          </Typography>
        </Box>
        <Chip label={status?.state ?? 'Loading'} size="small" />
        {isRunning && minutesLeft !== undefined && (
          <Typography variant="smallText1">{minutesLeft} min left</Typography>
        )}
        {isRunning && inputCount !== undefined && (
          <Typography variant="smallText1">
            {inputCount} input {inputCount === 1 ? 'file' : 'files'}
          </Typography>
        )}
        {view === 'notStarted' && (
          <Button
            variant="contained"
            disabled={isStarting}
            onClick={() => {
              setIsPolling(true)
              startSession(taskId)
            }}
          >
            {START_SESSION_BUTTON_TEXT}
          </Button>
        )}
        {isRunning && (
          <>
            <Button variant="outlined" onClick={() => setSessionUrl(undefined)}>
              {RECONNECT_BUTTON_TEXT}
            </Button>
            <Button variant="contained" color="error" disabled={isEnding} onClick={() => setShowEndConfirmation(true)}>
              {END_SESSION_BUTTON_TEXT}
            </Button>
          </>
        )}
      </Stack>

      <InputsSummary
        inputFolderId={sessionProperties.inputFolderId}
        inputPaths={details?.inputFiles?.map(file => file.path ?? '')}
      />

      {details?.errorMessage && <Alert severity="error">{details.errorMessage}</Alert>}

      {(view === 'busy' || isStarting || isEnding) && (
        <Box className={styles.placeholder}>
          <SynapseSpinner />
          <Typography variant="body1">{isEnding ? 'Ending the session and collecting its outputs…' : 'Starting the session…'}</Typography>
        </Box>
      )}

      {isRunning && !isEnding && sessionUrl && (
        <iframe
          key={sessionUrl}
          className={styles.sessionFrame}
          src={sessionUrl}
          title={`Enclave session for ${task.dataType}`}
          sandbox={SESSION_FRAME_SANDBOX}
          referrerPolicy="no-referrer"
        />
      )}

      {view === 'inReview' && (
        <Box className={styles.placeholder}>
          <Alert severity="info">{IN_REVIEW_MESSAGE}</Alert>
          <ul aria-label="Outputs waiting for review">
            {details?.outputFiles?.map(output => (
              <li key={output.path}>
                {output.path} ({output.contentSize} bytes)
              </li>
            ))}
          </ul>
        </Box>
      )}

      <ConfirmationDialog
        open={showEndConfirmation}
        title={END_SESSION_BUTTON_TEXT}
        content="Ending the session stops it and sends the files in outputs/ for review. Everything else in the session is deleted, except the shared workspace."
        confirmButtonProps={{ children: END_SESSION_BUTTON_TEXT, color: 'error' }}
        onCancel={() => setShowEndConfirmation(false)}
        onConfirm={() => {
          setShowEndConfirmation(false)
          setIsPolling(true)
          endSession(taskId)
        }}
      />
    </Box>
  )
}
