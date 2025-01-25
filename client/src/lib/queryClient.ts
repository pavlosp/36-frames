import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        // Get the Corbado session token from localStorage
        const token = localStorage.getItem('cbdToken');
        console.log('API Request:', {
          url: queryKey[0],
          hasToken: !!token
        });

        const res = await fetch(queryKey[0] as string, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401) {
            // Clear the token if it's invalid
            localStorage.removeItem('cbdToken');
            throw new Error('Not authenticated');
          }

          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        return res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error.message === 'Not authenticated') return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    }
  },
});