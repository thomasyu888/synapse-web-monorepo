import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { Row, SelectColumn } from '@sage-bionetworks/synapse-types'
import styles from './SqlWorksheet.module.scss'
import { WORKSHEET_ROW_LIMIT } from './SqlWorksheetUtils'

export const NO_ROWS_MESSAGE = 'The query returned no rows.'
export const ROW_LIMIT_MESSAGE = `Showing the first ${WORKSHEET_ROW_LIMIT} rows. To get all of them, save the SQL as a materialized view and query it.`

export type SqlWorksheetResultsProps = {
  columns: SelectColumn[]
  rows: Row[]
  isTruncated: boolean
}

export function SqlWorksheetResults({
  columns,
  rows,
  isTruncated,
}: SqlWorksheetResultsProps) {
  if (rows.length === 0) {
    return <Typography variant="body1">{NO_ROWS_MESSAGE}</Typography>
  }
  return (
    <>
      {isTruncated && (
        <Typography variant="smallText1" sx={{ mb: 1, display: 'block' }}>
          {ROW_LIMIT_MESSAGE}
        </Typography>
      )}
      <TableContainer className={styles.results}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map(column => (
                <TableCell key={column.name}>{column.name}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={row.rowId ?? rowIndex}>
                {row.values.map((value, columnIndex) => (
                  <TableCell key={columns[columnIndex]?.name ?? columnIndex}>
                    {value}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}
