import EntityIdTextField from '@/components/EntityFinder/EntityIdTextField'
import { FinderScope } from '@/components/EntityFinder/tree/EntityTree'
import { VersionSelectionType } from '@/components/EntityFinder/VersionSelectionType'
import { StyledFormControl } from '@/components/styled'
import { useGetSessionEnvironments } from '@/synapse-queries/curation/task/useInteractiveSession'
import { EntityType } from '@sage-bionetworks/synapse-client'
import {
  Alert,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material'
import {
  ENCLAVE_DURATION_LABEL,
  ENCLAVE_DURATION_MINUTES_OPTIONS,
  ENCLAVE_ENVIRONMENT_LABEL,
  ENCLAVE_INPUT_FOLDER_DESCRIPTION,
  ENCLAVE_INPUT_FOLDER_FINDER_PROMPT,
  ENCLAVE_INPUT_FOLDER_FINDER_TITLE,
  ENCLAVE_INPUT_FOLDER_LABEL,
  ENCLAVE_NO_ENVIRONMENTS_MESSAGE,
} from '../utils/constants'

export type EnclaveSessionFieldsValue = {
  inputFolderId: string
  environmentId: string
  maxDurationMinutes: number
}

export function isEnclaveSessionFieldsValueValid(
  value: EnclaveSessionFieldsValue,
): boolean {
  return !!value.inputFolderId.trim() && !!value.environmentId
}

export type EnclaveSessionFieldsProps = {
  value: EnclaveSessionFieldsValue
  onChange: (value: EnclaveSessionFieldsValue) => void
}

/**
 * Fields specific to an interactive session (enclave) task: the folder whose files are copied into the session, the
 * approved environment it runs, and how long it may run.
 */
export default function EnclaveSessionFields(props: EnclaveSessionFieldsProps) {
  const { value, onChange } = props
  const { data, isLoading, error } = useGetSessionEnvironments()
  const environments = data?.environments ?? []
  const selected = environments.find(e => e.id === value.environmentId)

  return (
    <Stack gap={2}>
      <EntityIdTextField
        label={ENCLAVE_INPUT_FOLDER_LABEL}
        value={value.inputFolderId}
        onChange={inputFolderId => onChange({ ...value, inputFolderId })}
        description={ENCLAVE_INPUT_FOLDER_DESCRIPTION}
        required
        entityFinderModalProps={{
          title: ENCLAVE_INPUT_FOLDER_FINDER_TITLE,
          promptCopy: ENCLAVE_INPUT_FOLDER_FINDER_PROMPT,
          confirmButtonCopy: 'Select',
          configuration: {
            initialScope: FinderScope.ALL_PROJECTS,
            initialContainer: 'root',
            selectMultiple: false,
            treeOnly: false,
            versionSelection: VersionSelectionType.DISALLOWED,
            selectableTypes: [EntityType.folder],
          },
        }}
      />
      {error && <Alert severity="error">{error.message}</Alert>}
      {!isLoading && !error && environments.length === 0 && (
        <Alert severity="warning">{ENCLAVE_NO_ENVIRONMENTS_MESSAGE}</Alert>
      )}
      <StyledFormControl fullWidth required>
        <InputLabel id="enclave-environment-label">
          {ENCLAVE_ENVIRONMENT_LABEL}
        </InputLabel>
        <Select
          labelId="enclave-environment-label"
          label={ENCLAVE_ENVIRONMENT_LABEL}
          value={value.environmentId}
          disabled={isLoading || environments.length === 0}
          onChange={e => onChange({ ...value, environmentId: e.target.value })}
        >
          {environments.map(environment => (
            <MenuItem key={environment.id} value={environment.id}>
              {environment.name}
            </MenuItem>
          ))}
        </Select>
        {selected?.packages && (
          <FormHelperText>
            Approved packages, and the only ones available (the session has
            no network):{' '}
            {selected.packages
              .map(p => `${p.name} ${p.version}`)
              .join(', ')}
          </FormHelperText>
        )}
      </StyledFormControl>
      <StyledFormControl fullWidth required>
        <InputLabel id="enclave-duration-label">
          {ENCLAVE_DURATION_LABEL}
        </InputLabel>
        <Select
          labelId="enclave-duration-label"
          label={ENCLAVE_DURATION_LABEL}
          value={value.maxDurationMinutes}
          onChange={e =>
            onChange({ ...value, maxDurationMinutes: Number(e.target.value) })
          }
        >
          {ENCLAVE_DURATION_MINUTES_OPTIONS.map(minutes => (
            <MenuItem key={minutes} value={minutes}>
              {minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hours`}
            </MenuItem>
          ))}
        </Select>
      </StyledFormControl>
    </Stack>
  )
}
