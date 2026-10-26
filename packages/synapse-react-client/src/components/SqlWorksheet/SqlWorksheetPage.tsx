import { useGetEntity } from '@/synapse-queries'
import { isSqlWorksheet } from '@/synapse-queries/table/SqlQuery'
import { Alert, Box, LinearProgress, Typography } from '@mui/material'
import SqlWorksheet, { SqlWorksheetProps } from './SqlWorksheet'

export type SqlWorksheetPageProps = Pick<SqlWorksheetProps, 'initialSql'> & {
  /** A saved SQL worksheet to open, or a table or view to start querying */
  entityId?: string
}

/**
 * The SQL worksheet as a page of its own. Given a SQL worksheet, it opens it; given a table or view, it starts a new
 * worksheet that queries it.
 */
export default function SqlWorksheetPage(props: SqlWorksheetPageProps) {
  const { entityId, initialSql } = props
  const { data: entity, error, isLoading } = useGetEntity(entityId)
  const worksheet = entity && isSqlWorksheet(entity) ? entity : undefined
  return (
    <Box sx={{ px: 4, py: 3 }}>
      <Typography variant="headline1" component="h1" sx={{ mb: 1 }}>
        SQL Worksheet
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Query one table or view, or combine several with JOIN or UNION. Running
        SQL saves nothing. Save it as a worksheet to come back to it or share
        it, or as a materialized view to build a table from it.
      </Typography>
      {isLoading && <LinearProgress />}
      {error && <Alert severity="error">{error.reason}</Alert>}
      {(!entityId || entity) && (
        <SqlWorksheet
          // A fresh editor for each worksheet or table opened
          key={entity?.id}
          initialSql={initialSql}
          entityId={worksheet ? undefined : entityId}
          worksheet={worksheet}
        />
      )}
    </Box>
  )
}
