import { SQL_WORKSHEET_ENTITY_TYPE } from '@/utils/functions/sqlWorksheetEntityType'
import { EntityType } from '@sage-bionetworks/synapse-client'

/** The entity types the Files tree lists; tables and views have a tab of their own. */
export const FILE_TREE_ENTITY_TYPES: EntityType[] = [
  EntityType.folder,
  EntityType.file,
  EntityType.link,
  EntityType.recordset,
  SQL_WORKSHEET_ENTITY_TYPE,
]
