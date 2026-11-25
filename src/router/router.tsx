import { useMemo } from 'react'
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router-dom'
import { NavigationDependingProviders } from '~src/Providers'
import { useRootRoutes } from '~src/router/routes/root'

export const AppRoutes = () => {
  const root = useRootRoutes()

  // Use the base URL from Vite config
  const basename = import.meta.env.BASE_URL

  const router = useMemo(
    () =>
      createBrowserRouter(
        [
          {
            element: (
              <NavigationDependingProviders>
                <ScrollRestoration />
                <Outlet />
              </NavigationDependingProviders>
            ),
            children: [root],
          },
        ],
        { basename }
      ),
    // The routes are static
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  return <RouterProvider router={router} />
}
