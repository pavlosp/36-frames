import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        // Get the Corbado session token from the cookie
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('cbo_session_token='))
          ?.split('=')[1];

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
      // Add mutation defaults to include auth token
      mutationFn: async ({ url, method = 'POST', body }: { url: string; method?: string; body?: any }) => {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('cbo_session_token='))
          ?.split('=')[1];

        console.log('API Mutation:', {
          url,
          method,
          hasToken: !!token,
        });

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Not authenticated');
          }

          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        return res.json();
      },
      retry: false,
    }
  },
});