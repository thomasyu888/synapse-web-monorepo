import EntityPageBreadcrumbs from '@/components/entity/page/breadcrumbs/EntityPageBreadcrumbs'
import CreatedByModifiedBy from '@/components/entity/page/CreatedByModifiedBy'
import { EntityActionMenuProps } from '@/components/entity/page/action_menu/EntityActionMenu'
import EntityPageTitleBar from '@/components/entity/page/title_bar/EntityPageTitleBar'
import { BreadcrumbItem } from '@/components/Breadcrumbs/Breadcrumbs'
import { useGetEntityPath } from '@/synapse-queries'
import { SqlWorksheetEntity } from '@/synapse-queries/table/SqlQuery'
import { getLinkToEntityPage } from '@/utils/functions/getSynapseWebClientLink'
import { parseSynId } from '@/utils/functions/RegularExpressions'
import { Link, Stack, Typography } from '@mui/material'
import { useMemo } from 'react'
import styles from './SqlWorksheet.module.scss'
import { getReferencedTableIds } from './SqlWorksheetUtils'

export const OPEN_IN_SQL_WORKSHEET_LABEL = 'Open in SQL Worksheet'
export const SQL_HEADING = 'SQL'
export const READS_HEADING = 'Reads'
const OPEN_IN_SQL_WORKSHEET_ACTION = 'OPEN_IN_SQL_WORKSHEET'

export type SqlWorksheetLandingPageProps = {
  worksheet: SqlWorksheetEntity
  /** Called when the user asks to open the worksheet in the SQL editor */
  onOpen: () => void
}

/**
 * The page of a saved SQL worksheet, in the manner of a RecordSet's: where it is, who made it, its SQL and the tables it
 * reads, with "Open in SQL Worksheet" to edit and run it.
 */
export function SqlWorksheetLandingPage(props: SqlWorksheetLandingPageProps) {
  const { worksheet, onOpen } = props
  const worksheetId = worksheet.id!
  const { data: entityPath } = useGetEntityPath(worksheetId)

  // The path starts at the root of Synapse, which is not shown.
  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const headers = entityPath?.path.slice(1) ?? []
    return headers.map((header, index) =>
      index === headers.length - 1
        ? { text: header.name, current: true }
        : { text: header.name, href: getLinkToEntityPage(header.id) },
    )
  }, [entityPath])

  const actionMenuProps: EntityActionMenuProps = useMemo(
    () => ({
      actionConfiguration: {
        [OPEN_IN_SQL_WORKSHEET_ACTION]: {
          visible: true,
          text: OPEN_IN_SQL_WORKSHEET_LABEL,
          onClick: onOpen,
        },
      },
      menuConfiguration: {
        DOWNLOAD: { visible: false },
        PRIMARY: { visible: false },
      },
      layout: {
        buttonActions: [
          {
            action: OPEN_IN_SQL_WORKSHEET_ACTION,
            icon: 'code',
            variant: 'contained',
          },
        ],
        downloadMenuActions: [],
        primaryMenuActions: [],
        primaryMenuText: '',
        primaryMenuEndIcon: 'verticalEllipsis',
      },
    }),
    [onOpen],
  )

  const sourceIds = useMemo(
    () => getReferencedTableIds(worksheet.definingSQL),
    [worksheet.definingSQL],
  )

  return (
    <div>
      <EntityPageBreadcrumbs items={breadcrumbs} />
      <div className={styles.landingBody}>
        <EntityPageTitleBar
          entityId={worksheetId}
          entityActionMenuProps={actionMenuProps}
        />
        <CreatedByModifiedBy entityId={worksheetId} />
        {worksheet.description && (
          <Typography variant="body1" className={styles.landingSection}>
            {worksheet.description}
          </Typography>
        )}
        <div className={styles.landingSection}>
          <Typography variant="headline3" component="h2">
            {SQL_HEADING}
          </Typography>
          <pre className={styles.sqlPreview}>{worksheet.definingSQL}</pre>
        </div>
        {sourceIds.length > 0 && (
          <div className={styles.landingSection}>
            <Typography variant="headline3" component="h2">
              {READS_HEADING}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              {sourceIds.map(sourceId => {
                const source = parseSynId(sourceId)!
                return (
                  <Link
                    key={sourceId}
                    href={getLinkToEntityPage(
                      source.targetId,
                      source.targetVersionNumber,
                    )}
                  >
                    {sourceId}
                  </Link>
                )
              })}
            </Stack>
          </div>
        )}
      </div>
    </div>
  )
}
