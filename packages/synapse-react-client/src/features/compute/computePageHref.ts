import {
  BackendDestinationEnum,
  getEndpoint,
} from '@/utils/functions/getEndpoint'

export const OPEN_IN_COMPUTE_BUTTON_TEXT = 'Open in Compute'

/**
 * The address of an interactive session task's Compute page in the Synapse web client.
 */
export function getComputePageHref(taskId: number) {
  return `${getEndpoint(BackendDestinationEnum.PORTAL_ENDPOINT)}Compute:${taskId}`
}
