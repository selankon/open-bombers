import { ReactNode, Suspense } from 'react'
import { LoadingSpinner } from '~components/Layout/LoadingSpinner'
import { ErrorBoundaries } from '~src/pages/ErrorBoundary'

export const SuspenseLoader = ({ children }: { children: ReactNode }) => (
  <ErrorBoundaries>
    {/* view level error boundary*/}
    <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
  </ErrorBoundaries>
)
