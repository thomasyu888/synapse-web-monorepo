/** The SynapseWebClient place that hosts the GaaS dashboard. */
export const GAAS_ROUTER_BASE_NAME = '/GaaS:default'

export const GAAS_NEW_REQUEST_PATH = 'request/new'
export const GAAS_MY_REQUESTS_PATH = 'requests'
export const GAAS_DAC_PATH = 'dac'
export const GAAS_COORDINATOR_PATH = 'coordinator'
export const GAAS_REGISTER_PATH = 'register'

export const ENTITY_IDS_PARAM = 'entityIds'

/** Link to a new unified access request for the given entities. */
export function getGaasNewRequestHref(entityIds: string[]) {
  const params = new URLSearchParams({ [ENTITY_IDS_PARAM]: entityIds.join(',') })
  return `${GAAS_ROUTER_BASE_NAME}/${GAAS_NEW_REQUEST_PATH}?${params.toString()}`
}
