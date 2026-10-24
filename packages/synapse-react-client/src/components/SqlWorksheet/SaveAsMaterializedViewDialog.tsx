import { useCreateEntity } from '@/synapse-queries'
import { getLinkToEntityPage } from '@/utils/functions/getSynapseWebClientLink'
import { Alert, Link, Stack, TextField } from '@mui/material'
import {
  MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
  MaterializedView,
} from '@sage-bionetworks/synapse-types'
import { useState } from 'react'
import { ConfirmationDialog } from '../ConfirmationDialog'
import { ContainerPickerField } from './ContainerPickerField'

export const SAVE_AS_VIEW_TITLE = 'Save as materialized view'

export type SaveAsMaterializedViewDialogProps = {
  open: boolean
  sql: string
  defaultParentId?: string
  onClose: () => void
}

export function SaveAsMaterializedViewDialog(
  props: SaveAsMaterializedViewDialogProps,
) {
  const { open, sql, defaultParentId, onClose } = props
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState(defaultParentId ?? '')
  const {
    mutate: createEntity,
    data: savedView,
    error,
    isPending,
  } = useCreateEntity()

  const save = () => {
    const view: MaterializedView = {
      name,
      parentId,
      concreteType: MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
      definingSQL: sql,
      // Synapse derives a materialized view's columns from its definingSQL
      columnIds: [],
      isSearchEnabled: false,
    }
    createEntity(view)
  }

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
      {savedView && (
        <Alert severity="success">
          Saved as{' '}
          <Link href={getLinkToEntityPage(savedView.id!)}>
            {savedView.name} ({savedView.id})
          </Link>
          . Synapse builds it in the background.
        </Alert>
      )}
    </Stack>
  )

  return (
    <ConfirmationDialog
      open={open}
      title={SAVE_AS_VIEW_TITLE}
      content={content}
      onCancel={onClose}
      onConfirm={save}
      confirmButtonProps={{
        children: 'Save',
        disabled: !name || !parentId || isPending || !!savedView,
      }}
      cancelButtonProps={
        savedView ? { children: 'Close' } : { children: 'Cancel' }
      }
    />
  )
}
