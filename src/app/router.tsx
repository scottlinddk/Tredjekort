import { createBrowserRouter } from 'react-router'
import { RootLayout } from './root-layout'
import { queryClient } from './queryClient'
import { roadAlignmentOptions } from '../features/map/hooks/useRoadAlignment'
import { junctionsOptions } from '../features/map/hooks/useJunctions'
import { RouteErrorBoundary } from '../shared/components/RouteErrorBoundary'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        index: true,
        ErrorBoundary: RouteErrorBoundary,
        lazy: async () => {
          const { MapRoute } = await import('../routes/map.route')
          return { Component: MapRoute }
        },
        loader: async () => {
          await Promise.all([
            queryClient.ensureQueryData(roadAlignmentOptions()),
            queryClient.ensureQueryData(junctionsOptions()),
          ])
          return null
        },
      },
      {
        path: 'junctions/:junctionId',
        ErrorBoundary: RouteErrorBoundary,
        lazy: async () => {
          const { JunctionRoute } = await import('../routes/junction.$id.route')
          return { Component: JunctionRoute }
        },
        loader: async () => {
          await queryClient.ensureQueryData(junctionsOptions())
          return null
        },
      },
      {
        path: 'about',
        ErrorBoundary: RouteErrorBoundary,
        lazy: async () => {
          const { AboutRoute } = await import('../routes/about.route')
          return { Component: AboutRoute }
        },
      },
    ],
  },
])
