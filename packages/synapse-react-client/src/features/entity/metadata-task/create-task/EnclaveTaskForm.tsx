import { INTERACTIVE_SESSION_PROPERTIES_CONCRETE_TYPE } from '@/synapse-queries/curation/task/useInteractiveSession'
import { Alert, Stack } from '@mui/material'
import { CurationTask } from '@sage-bionetworks/synapse-client'
import noop from 'lodash-es/noop'
import { useState } from 'react'
import {
  ENCLAVE_DEFAULT_DURATION_MINUTES,
  GENERIC_SAVE_ERROR_MESSAGE,
} from '../utils/constants'
import CommonTaskFields from './CommonTaskFields'
import EnclaveSessionFields, {
  EnclaveSessionFieldsValue,
  isEnclaveSessionFieldsValueValid,
} from './EnclaveSessionFields'
import ProjectSelectorField from './ProjectSelectorField'
import TaskFormActions from './TaskFormActions'
import TaskFormHeader from './TaskFormHeader'
import { useCurationTaskFormState } from './useCurationTaskFormState'

export type EnclaveTaskFormProps = {
  /** Present when the host page already has a project context; otherwise the user chooses a project. */
  projectId?: string
  /** Called after the task is created. */
  onCreated?: (task: CurationTask) => void
  /** Shows a "Back" button that returns to the category picker. */
  onBack?: () => void
  /** Shows a "Back to All Tasks" button that exits the create flow. */
  onExit?: () => void
  pageTitle?: string
  pageDescription?: string
}

/**
 * The create form for an interactive session (enclave) task. Synapse sets the task's execution details itself, and
 * the session is started from the task's Compute page.
 */
export default function EnclaveTaskForm(props: EnclaveTaskFormProps) {
  const { projectId, onCreated, onBack, onExit, pageTitle, pageDescription } =
    props
  const form = useCurationTaskFormState({ projectId })
  const [session, setSession] = useState<EnclaveSessionFieldsValue>({
    inputFolderId: '',
    environmentId: '',
    maxDurationMinutes: ENCLAVE_DEFAULT_DURATION_MINUTES,
  })

  const isValid =
    form.isCommonFieldsValid &&
    form.isProjectValid &&
    isEnclaveSessionFieldsValueValid(session)

  async function handleSubmit() {
    const created = await form.submitTaskAndStatus({
      projectId: form.effectiveProjectId,
      dataType: form.dataType.trim(),
      instructions: form.instructions.trim(),
      assigneePrincipalId: form.assigneePrincipalId || undefined,
      // The generated CurationTaskProperties union does not include this type yet.
      taskProperties: {
        concreteType: INTERACTIVE_SESSION_PROPERTIES_CONCRETE_TYPE,
        inputFolderId: session.inputFolderId.trim(),
        environmentId: session.environmentId,
        maxDurationMinutes: session.maxDurationMinutes,
      } as unknown as CurationTask['taskProperties'],
    })
    onCreated?.(created)
  }

  return (
    <Stack gap={3}>
      <TaskFormHeader
        onExit={onExit}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
      />

      <Stack gap={3} sx={{ width: '100%', maxWidth: 700, mx: 'auto' }}>
        {form.showProjectSelector && (
          <ProjectSelectorField
            value={form.selectedProjectId}
            onChange={form.setSelectedProjectId}
          />
        )}
        <CommonTaskFields
          dataType={form.dataType}
          onDataTypeChange={form.setDataType}
          dueDate={form.displayedDueDate}
          onDueDateChange={form.setPendingDueDate}
          instructions={form.instructions}
          onInstructionsChange={form.setInstructions}
          assigneePrincipalId={form.assigneePrincipalId}
          onAssigneePrincipalIdChange={form.setAssigneePrincipalId}
        />
        <EnclaveSessionFields value={session} onChange={setSession} />
        {form.error && (
          <Alert severity="error">
            {form.error.reason ?? GENERIC_SAVE_ERROR_MESSAGE}
          </Alert>
        )}
      </Stack>

      <TaskFormActions
        isEditMode={false}
        isPending={form.isPending}
        isValid={isValid}
        onSubmit={() => void handleSubmit().catch(noop)}
        onBack={onBack}
        canDelete={false}
        showDeleteConfirmation={false}
        onRequestDelete={noop}
        onConfirmDelete={noop}
        onCancelDelete={noop}
        isDeletePending={false}
      />
    </Stack>
  )
}
