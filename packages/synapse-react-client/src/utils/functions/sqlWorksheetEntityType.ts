import { EntityType } from '@sage-bionetworks/synapse-client'

/**
 * The entity type of a SQL worksheet. The web client bundles the published @sage-bionetworks/synapse-client, whose
 * EntityType does not have sqlworksheet yet, so EntityType.sqlworksheet would be undefined there.
 */
export const SQL_WORKSHEET_ENTITY_TYPE = 'sqlworksheet' as EntityType
