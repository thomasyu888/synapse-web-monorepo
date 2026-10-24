import SynapseClient from '@/synapse-client'
import { useSynapseContext } from '@/utils/context/SynapseContext'
import {
  BUNDLE_MASK_QUERY_RESULTS,
  BUNDLE_MASK_QUERY_SELECT_COLUMNS,
} from '@/utils/SynapseConstants'
import { SynapseClientError } from '@sage-bionetworks/synapse-client/util/SynapseClientError'
import {
  MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
  MaterializedView,
  QueryBundleRequest,
  QueryResultBundle,
} from '@sage-bionetworks/synapse-types'
import { useMutation, UseMutationOptions } from '@tanstack/react-query'
import {
  planWorksheetQuery,
  SCRATCH_VIEW_NAME,
  WORKSHEET_ROW_LIMIT,
} from './SqlWorksheetUtils'

export type RunSqlWorksheetVariables = {
  sql: string
  /** The project or folder that holds the scratch view; required when the SQL combines tables */
  scratchParentId?: string
}

export type RunSqlWorksheetResult = {
  /** The table or view that was queried: the referenced table, or the scratch view */
  queriedEntityId: string
  /** Whether the SQL ran as the definingSQL of the scratch view */
  ranAsMaterializedView: boolean
  bundle: QueryResultBundle
}

export const SCRATCH_PARENT_REQUIRED_MESSAGE =
  'This SQL combines tables, so it runs as a materialized view. Choose a project or folder for the scratch view first.'
export const SCRATCH_VIEW_NOT_A_VIEW_MESSAGE = (parentId: string) =>
  `"${SCRATCH_VIEW_NAME}" in ${parentId} is not a materialized view. Rename it, or choose another project or folder.`

function getQueryRequest(entityId: string, sql: string): QueryBundleRequest {
  return {
    concreteType: 'org.sagebionetworks.repo.model.table.QueryBundleRequest',
    entityId,
    query: { sql, limit: WORKSHEET_ROW_LIMIT },
    partMask: BUNDLE_MASK_QUERY_RESULTS | BUNDLE_MASK_QUERY_SELECT_COLUMNS,
  }
}

async function findScratchView(
  parentId: string,
  accessToken: string | undefined,
): Promise<MaterializedView | undefined> {
  try {
    const { id } = await SynapseClient.lookupChildEntity(
      { parentId, entityName: SCRATCH_VIEW_NAME },
      accessToken,
    )
    const entity = await SynapseClient.getEntity<MaterializedView>(
      accessToken,
      id,
    )
    if (entity.concreteType !== MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE) {
      throw new Error(SCRATCH_VIEW_NOT_A_VIEW_MESSAGE(parentId))
    }
    return entity
  } catch (e) {
    if (e instanceof SynapseClientError && e.status === 404) {
      return undefined
    }
    throw e
  }
}

/**
 * The scratch view is one materialized view per parent, reused by every run: its definingSQL is replaced, which
 * makes Synapse rebuild it.
 */
async function saveScratchView(
  parentId: string,
  sql: string,
  accessToken: string | undefined,
): Promise<MaterializedView> {
  const existing = await findScratchView(parentId, accessToken)
  if (!existing) {
    const scratchView: MaterializedView = {
      name: SCRATCH_VIEW_NAME,
      parentId,
      concreteType: MATERIALIZED_VIEW_CONCRETE_TYPE_VALUE,
      definingSQL: sql,
      // Synapse derives a materialized view's columns from its definingSQL
      columnIds: [],
      isSearchEnabled: false,
    }
    return SynapseClient.createEntity(scratchView, accessToken)
  }
  if (existing.definingSQL === sql) {
    return existing
  }
  return SynapseClient.updateEntity(
    { ...existing, definingSQL: sql },
    accessToken,
  )
}

async function runQuery(
  entityId: string,
  sql: string,
  accessToken: string | undefined,
  onProgress: (message: string) => void,
): Promise<QueryResultBundle> {
  const status = await SynapseClient.getQueryTableAsyncJobResults(
    getQueryRequest(entityId, sql),
    accessToken,
    jobStatus => onProgress(jobStatus.progressMessage ?? ''),
  )
  return status.responseBody!
}

/**
 * Runs worksheet SQL. A query on one table runs directly; SQL that combines tables becomes the definingSQL of the
 * scratch view in the chosen parent, and the view is queried once Synapse has built it.
 *
 * @param onProgress Receives the progress messages of the running query (e.g. while the view is built)
 */
export function useRunSqlWorksheet(
  onProgress: (message: string) => void,
  options?: Partial<
    UseMutationOptions<
      RunSqlWorksheetResult,
      SynapseClientError | Error,
      RunSqlWorksheetVariables
    >
  >,
) {
  const { accessToken } = useSynapseContext()
  return useMutation<
    RunSqlWorksheetResult,
    SynapseClientError | Error,
    RunSqlWorksheetVariables
  >({
    ...options,
    mutationFn: async ({ sql, scratchParentId }) => {
      const plan = planWorksheetQuery(sql)
      switch (plan.kind) {
        case 'invalid':
          throw new Error(plan.reason)
        case 'direct': {
          const bundle = await runQuery(
            plan.entityId,
            sql,
            accessToken,
            onProgress,
          )
          return {
            queriedEntityId: plan.entityId,
            ranAsMaterializedView: false,
            bundle,
          }
        }
        case 'materializedView': {
          if (!scratchParentId) {
            throw new Error(SCRATCH_PARENT_REQUIRED_MESSAGE)
          }
          const scratchView = await saveScratchView(
            scratchParentId,
            sql,
            accessToken,
          )
          const bundle = await runQuery(
            scratchView.id!,
            `SELECT * FROM ${scratchView.id}`,
            accessToken,
            onProgress,
          )
          return {
            queriedEntityId: scratchView.id!,
            ranAsMaterializedView: true,
            bundle,
          }
        }
      }
    },
  })
}
