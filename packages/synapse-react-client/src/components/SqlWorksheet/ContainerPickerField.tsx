import { EntityType } from '@sage-bionetworks/synapse-client'
import { Button, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { EntityFinderModal } from '../EntityFinder/EntityFinderModal'
import { FinderScope } from '../EntityFinder/tree/EntityTree'
import { VersionSelectionType } from '../EntityFinder/VersionSelectionType'

const CONTAINER_TYPES = [EntityType.project, EntityType.folder]

export type ContainerPickerFieldProps = {
  label: string
  /** The Synapse ID of the chosen project or folder, or '' */
  value: string
  onChange: (containerId: string) => void
  helperText?: string
}

/**
 * A Synapse ID field for a project or folder, which can be typed or chosen with the entity finder.
 */
export function ContainerPickerField(props: ContainerPickerFieldProps) {
  const { label, value, onChange, helperText } = props
  const [showFinder, setShowFinder] = useState(false)
  return (
    <>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <TextField
          label={label}
          value={value}
          onChange={e => onChange(e.target.value.trim())}
          placeholder="syn123"
          helperText={helperText}
          size="small"
          sx={{ minWidth: 240 }}
        />
        <Button variant="outlined" onClick={() => setShowFinder(true)}>
          Browse
        </Button>
      </Stack>
      <EntityFinderModal
        configuration={{
          initialScope: FinderScope.ALL_PROJECTS,
          initialContainer: 'root',
          selectMultiple: false,
          treeOnly: true,
          versionSelection: VersionSelectionType.DISALLOWED,
          selectableTypes: CONTAINER_TYPES,
          visibleTypesInTree: CONTAINER_TYPES,
        }}
        show={showFinder}
        title={`Choose a ${label.toLowerCase()}`}
        confirmButtonCopy="Select"
        onCancel={() => setShowFinder(false)}
        onConfirm={selected => {
          onChange(selected[0].targetId)
          setShowFinder(false)
        }}
      />
    </>
  )
}
