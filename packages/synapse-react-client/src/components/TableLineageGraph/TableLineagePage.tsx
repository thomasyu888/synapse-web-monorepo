import { useGetEntityHeader } from '@/synapse-queries/entity/useGetEntityHeaders'
import { getLinkToEntityPage } from '@/utils/functions/getSynapseWebClientLink'
import { Box, Link, Typography } from '@mui/material'
import TableLineageGraph, { TableLineageGraphProps } from './TableLineageGraph'

export type TableLineagePageProps = Pick<
  TableLineageGraphProps,
  'entityId' | 'versionNumber' | 'direction' | 'maxDepth'
>

/**
 * The lineage of one table or view as a page of its own: a heading that links back to it, and the graph.
 */
export default function TableLineagePage(props: TableLineagePageProps) {
  const { entityId, versionNumber } = props
  const { data: header } = useGetEntityHeader(entityId, versionNumber)
  return (
    <Box sx={{ px: 4, py: 3 }}>
      <Typography variant="headline1" component="h1" sx={{ mb: 1 }}>
        Lineage
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        What{' '}
        <Link href={getLinkToEntityPage(entityId, versionNumber)}>
          {header?.name ?? entityId}
        </Link>{' '}
        is built from, and what is built from it. A view that rebuilds after a
        change flashes as the change reaches it.
      </Typography>
      <TableLineageGraph {...props} containerHeight="70vh" />
    </Box>
  )
}
