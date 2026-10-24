import { Box, Typography } from '@mui/material'
import SqlWorksheet, { SqlWorksheetProps } from './SqlWorksheet'

/**
 * The SQL worksheet as a page of its own.
 */
export default function SqlWorksheetPage(props: SqlWorksheetProps) {
  return (
    <Box sx={{ px: 4, py: 3 }}>
      <Typography variant="headline1" component="h1" sx={{ mb: 1 }}>
        SQL Worksheet
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Query one table or view directly. SQL that combines tables (JOIN or
        UNION) runs as a scratch materialized view, which you can save as a view
        of its own.
      </Typography>
      <SqlWorksheet {...props} />
    </Box>
  )
}
