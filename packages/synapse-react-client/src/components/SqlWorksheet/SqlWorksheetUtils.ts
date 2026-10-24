import { parseSynId } from '@/utils/functions/RegularExpressions'

export const SCRATCH_VIEW_NAME = 'SQL worksheet scratch'
export const SCRATCH_PARENT_STORAGE_KEY = 'synapse-sql-worksheet-scratch-parent'
/** The most rows a worksheet run shows */
export const WORKSHEET_ROW_LIMIT = 100
export const JOIN_COLUMN_HINT =
  'Columns of a JOIN keep their table prefix (s.tissue) unless aliased, and some words, such as cohort, are reserved. Alias JOIN columns with AS, for example SELECT s.tissue AS tissue.'
export const NO_TABLE_MESSAGE =
  'Add the table to query, for example: SELECT * FROM syn123'

/**
 * How a worksheet runs its SQL. Synapse only allows a query on one table at a time; SQL that combines tables (JOIN,
 * UNION, or several FROM targets) can only be the definingSQL of a materialized view, so it runs as one.
 */
export type WorksheetPlan =
  | { kind: 'direct'; entityId: string; versionNumber?: number }
  | { kind: 'materializedView'; sourceIds: string[] }
  | { kind: 'invalid'; reason: string }

// String literals and comments may contain anything, including "from syn1" or "join"; they are blanked out before
// the SQL is scanned.
function removeLiteralsAndComments(sql: string): string {
  return sql
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
}

/**
 * @returns The distinct tables and views named after FROM or JOIN, in order of appearance, with any version
 *  (e.g. ['syn1', 'syn2.3'])
 */
export function getReferencedTableIds(sql: string): string[] {
  const scanned = removeLiteralsAndComments(sql)
  const ids = Array.from(
    scanned.matchAll(/\b(?:from|join)\s+(syn\d+(?:\.\d+)?)\b/gi),
    match => match[1].toLowerCase(),
  )
  return Array.from(new Set(ids))
}

export function combinesTables(sql: string): boolean {
  return (
    /\b(?:join|union)\b/i.test(removeLiteralsAndComments(sql)) ||
    getReferencedTableIds(sql).length > 1
  )
}

export function planWorksheetQuery(sql: string): WorksheetPlan {
  const sourceIds = getReferencedTableIds(sql)
  if (sourceIds.length === 0) {
    return { kind: 'invalid', reason: NO_TABLE_MESSAGE }
  }
  if (combinesTables(sql)) {
    return { kind: 'materializedView', sourceIds }
  }
  const reference = parseSynId(sourceIds[0])!
  return {
    kind: 'direct',
    entityId: reference.targetId,
    versionNumber: reference.targetVersionNumber,
  }
}

export function getDefaultWorksheetSql(entityId?: string): string {
  return entityId ? `SELECT * FROM ${entityId}` : ''
}

/**
 * @returns Advice for an error from SQL that ran as a materialized view, when the backend's reason points at a column
 *  name; otherwise undefined
 */
export function getWorksheetErrorHint(
  reason: string,
  combinesTables: boolean,
): string | undefined {
  return combinesTables && /unknown column|reserved/i.test(reason)
    ? JOIN_COLUMN_HINT
    : undefined
}
