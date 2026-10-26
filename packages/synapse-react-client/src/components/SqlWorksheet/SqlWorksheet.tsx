import {
  saveSqlWorksheet,
  SqlWorksheetEntity,
} from '@/synapse-queries/table/SqlQuery'
import { useSynapseContext } from '@/utils/context/SynapseContext'
import { parseSynId } from '@/utils/functions/RegularExpressions'
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { SynapseClientError } from '@sage-bionetworks/synapse-client/util/SynapseClientError'
import { useMutation } from '@tanstack/react-query'
import { KeyboardEvent, useMemo, useState } from 'react'
import TableLineageGraph from '../TableLineageGraph'
import { SaveSqlAs, SaveSqlDialog } from './SaveSqlDialog'
import styles from './SqlWorksheet.module.scss'
import { SqlWorksheetResults } from './SqlWorksheetResults'
import {
  getDefaultWorksheetSql,
  getWorksheetErrorHint,
  planWorksheetQuery,
} from './SqlWorksheetUtils'
import { useRunSqlWorksheet } from './useRunSqlWorksheet'

export const RUN_BUTTON_LABEL = 'Run'
export const SAVE_BUTTON_LABEL = 'Save'
export const SAVE_AS_WORKSHEET_BUTTON_LABEL = 'Save as worksheet'
export const SAVE_AS_VIEW_BUTTON_LABEL = 'Save as materialized view'
export const SAVED_MESSAGE = 'Saved'
export const RUNNING_QUERY_MESSAGE = 'Running query…'
export const LINEAGE_SOURCE_LABEL = 'Lineage of'

export type SqlWorksheetProps = {
  /** SQL to start with. When omitted, the worksheet's SQL, or `SELECT * FROM <entityId>` */
  initialSql?: string
  /** A table or view to start with */
  entityId?: string
  /** A saved worksheet to open: Save updates it */
  worksheet?: SqlWorksheetEntity
}

type WorksheetTab = 'results' | 'lineage'

function getErrorMessage(error: SynapseClientError | Error): string {
  return error instanceof SynapseClientError ? error.reason : error.message
}

/**
 * An editor to run Synapse SQL and see the results. A query on one table runs as a table query; SQL that combines
 * tables (JOIN, UNION) runs without saving anything. The SQL can be saved as a SQL worksheet, or as a materialized
 * view, which adds it to table lineage. The Lineage tab shows what each table the SQL reads is built from and what is
 * built from it.
 */
export default function SqlWorksheet(props: SqlWorksheetProps) {
  const { initialSql, entityId } = props
  const { accessToken } = useSynapseContext()
  const [worksheet, setWorksheet] = useState(props.worksheet)
  const [sql, setSql] = useState(
    () =>
      initialSql ??
      props.worksheet?.definingSQL ??
      getDefaultWorksheetSql(entityId),
  )
  const [progressMessage, setProgressMessage] = useState('')
  const [tab, setTab] = useState<WorksheetTab>('results')
  const [saveDialog, setSaveDialog] = useState<SaveSqlAs>()
  const [lineageSourceId, setLineageSourceId] = useState<string>()

  const plan = useMemo(() => planWorksheetQuery(sql), [sql])
  const combinesTables = plan.kind === 'combined'

  const {
    mutate: runSql,
    data: result,
    error,
    isPending,
  } = useRunSqlWorksheet(setProgressMessage, {
    onSuccess: runResult => setLineageSourceId(runResult.sourceIds[0]),
  })

  const {
    mutate: saveWorksheet,
    error: saveError,
    isPending: isSaving,
    isSuccess: isSaved,
    reset: resetSave,
  } = useMutation<SqlWorksheetEntity, SynapseClientError, SqlWorksheetEntity>({
    mutationFn: toSave => saveSqlWorksheet(toSave, accessToken),
    onSuccess: setWorksheet,
  })

  const lineageSource = lineageSourceId ? parseSynId(lineageSourceId) : null
  const errorMessage = error ? getErrorMessage(error) : undefined
  const errorHint = errorMessage
    ? getWorksheetErrorHint(errorMessage, combinesTables)
    : undefined

  const run = () => {
    setProgressMessage(RUNNING_QUERY_MESSAGE)
    runSql(sql)
  }

  const onEditorKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isPending) {
      e.preventDefault()
      run()
    }
  }

  const onSqlChange = (value: string) => {
    setSql(value)
    resetSave()
  }

  return (
    <Box>
      {worksheet && (
        <Typography variant="headline3" component="h2" sx={{ mb: 1 }}>
          {worksheet.name}
        </Typography>
      )}
      <TextField
        className={styles.editor}
        label="SQL"
        value={sql}
        onChange={e => onSqlChange(e.target.value)}
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
        {worksheet && (
          <Button
            variant="outlined"
            onClick={() => saveWorksheet({ ...worksheet, definingSQL: sql })}
            disabled={isSaving || sql === worksheet.definingSQL}
          >
            {SAVE_BUTTON_LABEL}
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={() => setSaveDialog('worksheet')}
          disabled={plan.kind === 'invalid'}
        >
          {SAVE_AS_WORKSHEET_BUTTON_LABEL}
        </Button>
        <Button
          variant="outlined"
          onClick={() => setSaveDialog('materializedView')}
          disabled={plan.kind === 'invalid'}
        >
          {SAVE_AS_VIEW_BUTTON_LABEL}
        </Button>
        {isSaved && (
          <Typography variant="smallText1">{SAVED_MESSAGE}</Typography>
        )}
      </div>
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError.reason}
        </Alert>
      )}
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
              <SqlWorksheetResults
                columns={result.columns}
                rows={result.rows}
                isTruncated={result.isTruncated}
              />
            )}
            {tab === 'lineage' && lineageSourceId && (
              <>
                {result.sourceIds.length > 1 && (
                  <TextField
                    select
                    size="small"
                    label={LINEAGE_SOURCE_LABEL}
                    value={lineageSourceId}
                    onChange={e => setLineageSourceId(e.target.value)}
                    sx={{ mb: 2, minWidth: 200 }}
                  >
                    {result.sourceIds.map(sourceId => (
                      <MenuItem key={sourceId} value={sourceId}>
                        {sourceId}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                {lineageSource && (
                  <TableLineageGraph
                    entityId={lineageSource.targetId}
                    versionNumber={lineageSource.targetVersionNumber}
                  />
                )}
              </>
            )}
          </div>
        </>
      )}
      {saveDialog && (
        <SaveSqlDialog
          open
          saveAs={saveDialog}
          sql={sql}
          defaultParentId={worksheet?.parentId}
          onClose={() => setSaveDialog(undefined)}
          onSaved={saved => saved.worksheet && setWorksheet(saved.worksheet)}
        />
      )}
    </Box>
  )
}
