import {
  saveSqlWorksheet,
  SQL_WORKSHEET_CONCRETE_TYPE_VALUE,
  SqlWorksheetEntity,
} from '@/synapse-queries/table/SqlQuery'
import SynapseClient from '@/synapse-client'
import { useSynapseContext } from '@/utils/context/SynapseContext'
import { getLinkToEntityPage } from '@/utils/functions/getSynapseWebClientLink'
import { Alert, Link, Stack, TextField } from '@mui/material'
import { SynapseClientError } from '@sage-bionetworks/synapse-client/util/SynapseClientError'
import {
  MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
  MaterializedView,
} from '@sage-bionetworks/synapse-types'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { ConfirmationDialog } from '../ConfirmationDialog'
import { ContainerPickerField } from './ContainerPickerField'
import { findMaterializedViewsWithSql } from './findMaterializedViewsWithSql'

export type SaveSqlAs = 'worksheet' | 'materializedView'

export const SAVE_DIALOG_TITLES: Record<SaveSqlAs, string> = {
  worksheet: 'Save as SQL worksheet',
  materializedView: 'Save as materialized view',
}
export const CREATE_ANYWAY_LABEL = 'Create anyway'
export const DUPLICATE_VIEW_MESSAGE =
  'This project or folder already has a materialized view with this SQL:'

/** worksheet is set when the SQL was saved as a worksheet */
export type SavedSql = {
  id: string
  name: string
  worksheet?: SqlWorksheetEntity
}

export type SaveSqlDialogProps = {
  open: boolean
  saveAs: SaveSqlAs
  sql: string
  defaultParentId?: string
  onClose: () => void
  /** Called once the SQL is saved */
  onSaved?: (saved: SavedSql) => void
}

type SaveVariables = { name: string; parentId: string; allowDuplicate: boolean }

type SaveResult =
  | { kind: 'saved'; saved: SavedSql }
  | { kind: 'duplicates'; views: MaterializedView[] }

/**
 * Saves the SQL as a new SQL worksheet or materialized view in a chosen project or folder. Before creating a
 * materialized view, it looks for views there with the same SQL, since each one is rebuilt whenever its sources change.
 */
export function SaveSqlDialog(props: SaveSqlDialogProps) {
  const { open, saveAs, sql, defaultParentId, onClose, onSaved } = props
  const { accessToken } = useSynapseContext()
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState(defaultParentId ?? '')

  const {
    mutate: save,
    data: result,
    variables,
    error,
    isPending,
  } = useMutation<SaveResult, SynapseClientError, SaveVariables>({
    mutationFn: async ({ name, parentId, allowDuplicate }) => {
      if (saveAs === 'worksheet') {
        const worksheet = await saveSqlWorksheet(
          {
            name,
            parentId,
            concreteType: SQL_WORKSHEET_CONCRETE_TYPE_VALUE,
            definingSQL: sql,
          },
          accessToken,
        )
        return { kind: 'saved', saved: { ...toSaved(worksheet), worksheet } }
      }
      if (!allowDuplicate) {
        const views = await findMaterializedViewsWithSql(
          parentId,
          sql,
          accessToken,
        )
        if (views.length > 0) {
          return { kind: 'duplicates', views }
        }
      }
      const view = await SynapseClient.createEntity<MaterializedView>(
        {
          name,
          parentId,
          concreteType: MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
          definingSQL: sql,
          // Synapse derives a materialized view's columns from its definingSQL
          columnIds: [],
          isSearchEnabled: false,
        },
        accessToken,
      )
      return { kind: 'saved', saved: toSaved(view) }
    },
    onSuccess: saveResult => {
      if (saveResult.kind === 'saved') {
        onSaved?.(saveResult.saved)
      }
    },
  })

  const saved = result?.kind === 'saved' ? result.saved : undefined
  // A warning applies to the project or folder it was found in, so choosing another one checks again.
  const duplicates =
    result?.kind === 'duplicates' && variables?.parentId === parentId
      ? result.views
      : undefined

  const content = (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField
        label="Name"
        value={name}
        onChange={e => setName(e.target.value)}
        required
        fullWidth
      />
      <ContainerPickerField
        label="Project or folder"
        value={parentId}
        onChange={setParentId}
      />
      {error && <Alert severity="error">{error.reason}</Alert>}
      {duplicates && (
        <Alert severity="warning">
          {DUPLICATE_VIEW_MESSAGE}{' '}
          {duplicates.map((view, index) => (
            <span key={view.id}>
              {index > 0 && ', '}
              <Link href={getLinkToEntityPage(view.id!)}>
                {view.name} ({view.id})
              </Link>
            </span>
          ))}
          . Each view is rebuilt whenever its sources change.
        </Alert>
      )}
      {saved && (
        <Alert severity="success">
          Saved as{' '}
          <Link href={getLinkToEntityPage(saved.id)}>
            {saved.name} ({saved.id})
          </Link>
          {saveAs === 'materializedView' &&
            '. Synapse builds it in the background.'}
        </Alert>
      )}
    </Stack>
  )

  return (
    <ConfirmationDialog
      open={open}
      title={SAVE_DIALOG_TITLES[saveAs]}
      content={content}
      onCancel={onClose}
      onConfirm={() =>
        save({ name, parentId, allowDuplicate: duplicates !== undefined })
      }
      confirmButtonProps={{
        children: duplicates ? CREATE_ANYWAY_LABEL : 'Save',
        disabled: !name || !parentId || isPending || !!saved,
      }}
      cancelButtonProps={saved ? { children: 'Close' } : { children: 'Cancel' }}
    />
  )
}

function toSaved(entity: { id?: string; name: string }): SavedSql {
  return { id: entity.id!, name: entity.name }
}
