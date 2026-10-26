import { useGetEntity } from '@/synapse-queries'
import { isSqlWorksheet } from '@/synapse-queries/table/SqlQuery'
import { Alert, Box, Button, LinearProgress, Typography } from '@mui/material'
import { useState } from 'react'
import SqlWorksheet, { SqlWorksheetProps } from './SqlWorksheet'
import { SqlWorksheetLandingPage } from './SqlWorksheetLandingPage'

export const BACK_TO_WORKSHEET_LABEL = 'Back to worksheet page'

export type SqlWorksheetPageProps = Pick<SqlWorksheetProps, 'initialSql'> & {
  /** A saved SQL worksheet to open, or a table or view to start querying */
  entityId?: string
}

/**
 * The SQL worksheet as a page of its own. Given a saved SQL worksheet, it shows the worksheet's page, from which it
 * opens in the editor; given a table or view, it starts a new worksheet that queries it.
 */
export default function SqlWorksheetPage(props: SqlWorksheetPageProps) {
  const { entityId, initialSql } = props
  const { data: entity, error, isLoading, refetch } = useGetEntity(entityId)
  const worksheet = entity && isSqlWorksheet(entity) ? entity : undefined
  const [isEditing, setIsEditing] = useState(false)

  if (worksheet && !isEditing) {
    return (
      <SqlWorksheetLandingPage
        worksheet={worksheet}
        onOpen={() => setIsEditing(true)}
      />
    )
  }

  const backToWorksheet = () => {
    // The editor saves the worksheet itself, so the page reads it again.
    void refetch()
    setIsEditing(false)
  }

  return (
    <Box sx={{ px: 4, py: 3 }}>
      {worksheet && (
        <Button variant="text" onClick={backToWorksheet} sx={{ mb: 1 }}>
          {BACK_TO_WORKSHEET_LABEL}
        </Button>
      )}
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
