import SynapseClient from '@/synapse-client'
import { EntityType } from '@sage-bionetworks/synapse-client'
import { EntityHeader, MaterializedView } from '@sage-bionetworks/synapse-types'
import { normalizeSql } from './SqlWorksheetUtils'

/**
 * @returns The materialized views directly in the given project or folder whose definingSQL matches the given SQL,
 *  ignoring layout and keyword case
 */
export async function findMaterializedViewsWithSql(
  parentId: string,
  sql: string,
  accessToken: string | undefined,
): Promise<MaterializedView[]> {
  const headers: EntityHeader[] = []
  let nextPageToken: string | undefined
  do {
    const page = await SynapseClient.getEntityChildren(
      {
        parentId,
        includeTypes: [EntityType.materializedview],
        nextPageToken,
      },
      accessToken,
    )
    headers.push(...page.page)
    nextPageToken = page.nextPageToken
  } while (nextPageToken)

  const target = normalizeSql(sql)
  const views = await Promise.all(
    headers.map(header =>
      SynapseClient.getEntity<MaterializedView>(accessToken, header.id),
    ),
  )
  return views.filter(view => normalizeSql(view.definingSQL) === target)
}
