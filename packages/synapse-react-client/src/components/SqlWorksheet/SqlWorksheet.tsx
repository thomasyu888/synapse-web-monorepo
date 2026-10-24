import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { SynapseClientError } from '@sage-bionetworks/synapse-client/util/SynapseClientError'
import { KeyboardEvent, useMemo, useState } from 'react'
import TableLineageGraph from '../TableLineageGraph'
import { ContainerPickerField } from './ContainerPickerField'
import { SaveAsMaterializedViewDialog } from './SaveAsMaterializedViewDialog'
import styles from './SqlWorksheet.module.scss'
import { SqlWorksheetResults } from './SqlWorksheetResults'
import {
  getDefaultWorksheetSql,
  getWorksheetErrorHint,
  planWorksheetQuery,
  SCRATCH_PARENT_STORAGE_KEY,
  SCRATCH_VIEW_NAME,
} from './SqlWorksheetUtils'
import { useRunSqlWorksheet } from './useRunSqlWorksheet'

export const RUN_BUTTON_LABEL = 'Run'
export const SAVE_BUTTON_LABEL = 'Save as materialized view'
export const SCRATCH_PARENT_LABEL = 'Scratch project or folder'
export const BUILDING_VIEW_MESSAGE = 'Building view…'
export const RUNNING_QUERY_MESSAGE = 'Running query…'

export type SqlWorksheetProps = {
  /** SQL to start with. When omitted and entityId is given, `SELECT * FROM <entityId>` */
  initialSql?: string
  /** A table or view to start with */
  entityId?: string
}

type WorksheetTab = 'results' | 'lineage'

function getErrorMessage(error: SynapseClientError | Error): string {
  return error instanceof SynapseClientError ? error.reason : error.message
}

/**
 * An editor to run Synapse SQL and see the results. A query on one table runs directly. SQL that combines tables
 * (JOIN, UNION) runs as a materialized view named {@link SCRATCH_VIEW_NAME} in a project or folder the user chooses,
 * and can be saved as a materialized view of its own. The Lineage tab shows what the queried table is built from and
 * what is built from it.
 */
export default function SqlWorksheet(props: SqlWorksheetProps) {
  const { initialSql, entityId } = props
  const [sql, setSql] = useState(
    () => initialSql ?? getDefaultWorksheetSql(entityId),
  )
  const [scratchParentId, setScratchParentId] = useState(
    () => localStorage.getItem(SCRATCH_PARENT_STORAGE_KEY) ?? '',
  )
  const [progressMessage, setProgressMessage] = useState('')
  const [tab, setTab] = useState<WorksheetTab>('results')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const plan = useMemo(() => planWorksheetQuery(sql), [sql])
  const combinesTables = plan.kind === 'materializedView'

  const {
    mutate: runSql,
    data: result,
    error,
    isPending,
  } = useRunSqlWorksheet(setProgressMessage)

  const errorMessage = error ? getErrorMessage(error) : undefined
  const errorHint = errorMessage
    ? getWorksheetErrorHint(errorMessage, combinesTables)
    : undefined

  const run = () => {
    setProgressMessage(
      combinesTables ? BUILDING_VIEW_MESSAGE : RUNNING_QUERY_MESSAGE,
    )
    runSql({ sql, scratchParentId: scratchParentId || undefined })
  }

  const onEditorKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isPending) {
      e.preventDefault()
      run()
    }
  }

  const onScratchParentChange = (parentId: string) => {
    setScratchParentId(parentId)
    localStorage.setItem(SCRATCH_PARENT_STORAGE_KEY, parentId)
  }

  return (
    <Box>
      <TextField
        className={styles.editor}
        label="SQL"
        value={sql}
        onChange={e => setSql(e.target.value)}
        onKeyDown={onEditorKeyDown}
        placeholder="SELECT * FROM syn123"
        multiline
        minRows={6}
        fullWidth
        helperText="Ctrl+Enter (⌘+Enter on a Mac) to run"
        slotProps={{ htmlInput: { spellCheck: false } }}
      />
      <div className={styles.toolbar}>
        <Button
          variant="contained"
          onClick={run}
          disabled={isPending || sql.trim() === ''}
        >
          {RUN_BUTTON_LABEL}
        </Button>
        <Button
          variant="outlined"
          onClick={() => setShowSaveDialog(true)}
          disabled={plan.kind === 'invalid'}
        >
          {SAVE_BUTTON_LABEL}
        </Button>
        {combinesTables && (
          <ContainerPickerField
            label={SCRATCH_PARENT_LABEL}
            value={scratchParentId}
            onChange={onScratchParentChange}
            helperText={`This SQL combines tables, so it runs as "${SCRATCH_VIEW_NAME}" there`}
          />
        )}
      </div>
      {isPending && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="smallText1">{progressMessage}</Typography>
        </Box>
      )}
      {errorMessage && !isPending && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
          {errorHint && (
            <Typography variant="smallText1" sx={{ display: 'block', mt: 1 }}>
              {errorHint}
            </Typography>
          )}
        </Alert>
      )}
      {result && !isPending && (
        <>
          <Tabs
            value={tab}
            onChange={(_e, value: WorksheetTab) => setTab(value)}
          >
            <Tab value="results" label="Results" />
            <Tab value="lineage" label="Lineage" />
          </Tabs>
          <div className={styles.panel}>
            {tab === 'results' && (
              <SqlWorksheetResults bundle={result.bundle} />
            )}
            {tab === 'lineage' && (
              <TableLineageGraph entityId={result.queriedEntityId} />
            )}
          </div>
        </>
      )}
      <SaveAsMaterializedViewDialog
        // A fresh dialog each time it opens, so a previous save does not linger
        key={String(showSaveDialog)}
        open={showSaveDialog}
        sql={sql}
        defaultParentId={scratchParentId || undefined}
        onClose={() => setShowSaveDialog(false)}
      />
    </Box>
  )
}
