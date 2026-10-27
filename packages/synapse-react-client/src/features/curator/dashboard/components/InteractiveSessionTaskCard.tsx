import {
  getComputePageHref,
  OPEN_IN_COMPUTE_BUTTON_TEXT,
} from '@/features/compute/computePageHref'
import { TaskBundle } from '@sage-bionetworks/synapse-client'
import CurationTaskCardLayout, {
  deriveCardFields,
} from './CurationTaskCardLayout'
import NextStepButton from './NextStepButton'
import styles from './CurationTaskCard.module.scss'

export type InteractiveSessionTaskCardProps = {
  taskBundle: TaskBundle
}

/**
 * Card for an interactive session (enclave) task. Its session is started, used and ended on the task's Compute page.
 */
export default function InteractiveSessionTaskCard(
  props: InteractiveSessionTaskCardProps,
) {
  const { taskBundle } = props
  const task = taskBundle.task!
  const { title, description, principalIds } = deriveCardFields(task)

  return (
    <CurationTaskCardLayout
      taskBundle={taskBundle}
      title={title}
      description={description}
      taskType="Enclave"
      principalIds={principalIds}
      renderActionButton={({ expanded }) => (
        <NextStepButton
          className={styles.cardButton}
          buttonText={OPEN_IN_COMPUTE_BUTTON_TEXT}
          onClick={() => window.location.assign(getComputePageHref(task.taskId!))}
          expanded={expanded}
        />
      )}
    />
  )
}
