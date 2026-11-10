import { GaasRequestListFilter } from '@/features/gaas/gaasEnums'
import { SynapseErrorBoundary } from '@/components/error/ErrorBanner'
import SWCPageLayout from '@/components/layout/SWCPageLayout'
import { useGetCurrentUserBundle } from '@/synapse-queries/user/useUserBundle'
import { useSynapseContext } from '@/utils/context/SynapseContext'
import { Box, Typography } from '@mui/material'
import { ReactNode, useMemo } from 'react'
import {
  createBrowserRouter,
  createMemoryRouter,
  Navigate,
  NavLink,
  Outlet,
  RouteObject,
  RouterProvider,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'
import { RouterProvider as DOMRouterProvider } from 'react-router/dom'
import { DataUseRegister } from './DataUseRegister'
import { GaasRequestDetail, GaasRequestDetailMode } from './GaasRequestDetail'
import { GaasRequestList } from './GaasRequestList'
import {
  ENTITY_IDS_PARAM,
  GAAS_COORDINATOR_PATH,
  GAAS_DAC_PATH,
  GAAS_MY_REQUESTS_PATH,
  GAAS_NEW_REQUEST_PATH,
  GAAS_REGISTER_PATH,
  GAAS_ROUTER_BASE_NAME,
} from './gaasRoutes'
import { UnifiedAccessRequestWizard } from './UnifiedAccessRequestWizard'

export type GaasDashboardProps = {
  /** Base path of the dashboard. Default is /GaaS:default */
  routerBaseName?: string
  /** If true use a MemoryRouter, which prevents the browser URL from updating. For tests and demos. */
  useMemoryRouter?: boolean
  /** Initial entries for the MemoryRouter */
  initialEntries?: string[]
}

function LinkTab(props: { href: string; children: ReactNode }) {
  return (
    <NavLink className="Tab" role="tab" to={props.href}>
      <Typography variant="buttonLink">{props.children}</Typography>
    </NavLink>
  )
}

function NewRequestRoute() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialEntityIds = useMemo(
    () =>
      (searchParams.get(ENTITY_IDS_PARAM) ?? '')
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0),
    [searchParams],
  )
  return (
    <UnifiedAccessRequestWizard
      initialEntityIds={initialEntityIds}
      onSubmitted={request =>
        navigate(`/${GAAS_MY_REQUESTS_PATH}/${request.id}`)
      }
    />
  )
}

function RequestDetailRoute(props: { mode: GaasRequestDetailMode }) {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    return null
  }
  return <GaasRequestDetail key={id} requestId={id} mode={props.mode} />
}

function SignInRequired() {
  return (
    <Typography variant="body1">
      Sign in to request data or review requests. The Data Use Register is
      public.
    </Typography>
  )
}

/**
 * Governance-as-a-Service: one application for data governed by several AMPs, Federated DAC review,
 * the Central Coordinator's queue and the public Data Use Register.
 */
export function GaasDashboard(props: GaasDashboardProps) {
  const {
    routerBaseName = GAAS_ROUTER_BASE_NAME,
    useMemoryRouter = false,
    initialEntries,
  } = props
  const { accessToken } = useSynapseContext()
  const isSignedIn = !!accessToken
  const { data: userBundle } = useGetCurrentUserBundle(undefined, {
    enabled: isSignedIn,
  })
  const isCoordinator = !!userBundle?.isACTMember

  const routes: RouteObject[] = useMemo(() => {
    const signedIn = (element: ReactNode) =>
      isSignedIn ? element : <SignInRequired />
    return [
      {
        path: '/',
        element: (
          <SWCPageLayout header={{ title: 'Data Governance (GaaS)' }}>
            <div className="pageContent" style={{ marginTop: '2rem' }}>
              <div className="ReviewerDashboard">
                <div className="Tabs" role="tablist">
                  {isSignedIn && (
                    <>
                      <LinkTab href={`/${GAAS_NEW_REQUEST_PATH}`}>New request</LinkTab>
                      <LinkTab href={`/${GAAS_MY_REQUESTS_PATH}`}>My requests</LinkTab>
                      <LinkTab href={`/${GAAS_DAC_PATH}`}>DAC review</LinkTab>
                    </>
                  )}
                  {isCoordinator && (
                    <LinkTab href={`/${GAAS_COORDINATOR_PATH}`}>Coordinator</LinkTab>
                  )}
                  <LinkTab href={`/${GAAS_REGISTER_PATH}`}>Data Use Register</LinkTab>
                </div>
                <Box className="TabContentContainer">
                  <SynapseErrorBoundary>
                    <Outlet />
                  </SynapseErrorBoundary>
                </Box>
              </div>
            </div>
          </SWCPageLayout>
        ),
        children: [
          {
            index: true,
            element: (
              <Navigate
                to={isSignedIn ? `/${GAAS_MY_REQUESTS_PATH}` : `/${GAAS_REGISTER_PATH}`}
                replace
              />
            ),
          },
          { path: GAAS_NEW_REQUEST_PATH, element: signedIn(<NewRequestRoute />) },
          {
            path: GAAS_MY_REQUESTS_PATH,
            element: signedIn(
              <GaasRequestList
                filter={GaasRequestListFilter.MINE}
                detailPath={`/${GAAS_MY_REQUESTS_PATH}`}
                emptyMessage="You have no unified access requests."
              />,
            ),
          },
          {
            path: `${GAAS_MY_REQUESTS_PATH}/:id`,
            element: signedIn(<RequestDetailRoute mode="requester" />),
          },
          {
            path: GAAS_DAC_PATH,
            element: signedIn(
              <GaasRequestList
                filter={GaasRequestListFilter.DAC_QUEUE}
                detailPath={`/${GAAS_DAC_PATH}`}
                emptyMessage="No requests are waiting for your DAC."
              />,
            ),
          },
          {
            path: `${GAAS_DAC_PATH}/:id`,
            element: signedIn(<RequestDetailRoute mode="dac" />),
          },
          {
            path: GAAS_COORDINATOR_PATH,
            element: isCoordinator ? (
              <GaasRequestList
                filter={GaasRequestListFilter.COORDINATOR}
                detailPath={`/${GAAS_COORDINATOR_PATH}`}
                emptyMessage="No unified access requests yet."
                heldFirst
              />
            ) : null,
          },
          {
            path: `${GAAS_COORDINATOR_PATH}/:id`,
            element: isCoordinator ? (
              <RequestDetailRoute mode="coordinator" />
            ) : null,
          },
          { path: GAAS_REGISTER_PATH, element: <DataUseRegister /> },
        ],
      },
    ]
  }, [isSignedIn, isCoordinator])

  const router = useMemo(() => {
    if (useMemoryRouter) {
      return createMemoryRouter(routes, {
        basename: routerBaseName,
        initialEntries: initialEntries?.map(entry => `${routerBaseName}${entry}`),
      })
    }
    return createBrowserRouter(routes, { basename: routerBaseName })
  }, [useMemoryRouter, routes, routerBaseName, initialEntries])

  if (useMemoryRouter) {
    return <RouterProvider router={router} />
  }
  return <DOMRouterProvider router={router} />
}

export default GaasDashboard
