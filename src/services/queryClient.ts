import { QueryClient } from '@tanstack/react-query'

// All data is local: no retries, no refetch on focus, never stale until a mutation updates it
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      networkMode: 'always',
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
      networkMode: 'always',
    },
  },
})

export default queryClient
