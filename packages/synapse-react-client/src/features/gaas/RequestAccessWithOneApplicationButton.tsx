import { displayToast } from '@/components/ToastMessage/ToastMessage'
import { Button } from '@mui/material'
import { useState } from 'react'
import { getGaasNewRequestHref } from './gaasRoutes'

export type RequestAccessWithOneApplicationButtonProps = {
  /** Resolves the entities to request. Called on click, so the list is only computed when the user asks for it. */
  getEntityIds: () => Promise<string[]>
}

/**
 * Opens a unified access request (GaaS) for the selected data, instead of one request per access requirement.
 */
export function RequestAccessWithOneApplicationButton(
  props: RequestAccessWithOneApplicationButtonProps,
) {
  const { getEntityIds } = props
  const [isResolving, setIsResolving] = useState(false)

  const onClick = async () => {
    setIsResolving(true)
    try {
      const entityIds = await getEntityIds()
      window.location.assign(getGaasNewRequestHref(entityIds))
    } catch (error) {
      displayToast(
        `Could not collect the selected files: ${(error as Error).message}`,
        'danger',
      )
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <Button variant="outlined" disabled={isResolving} onClick={onClick}>
      Request access with one application
    </Button>
  )
}
