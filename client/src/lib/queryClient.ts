import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey, meta }) => {
        const headers: Record<string, string> = {};

        // Add auth token if provided in meta
        if (meta?.token) {
          headers['Authorization'] = `Bearer ${meta.token}`;
        }

        const res = await fetch(queryKey[0] as string, {
          headers,
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
      mutationFn: async ({ 
        url, 
        method = 'POST', 
        body,
        formData,
        token 
      }: { 
        url: string; 
        method?: string; 
        body?: any;
        formData?: FormData;
        token?: string;
      }) => {
        const headers: Record<string, string> = {};

        // Only add Content-Type for JSON requests
        if (!formData) {
          headers['Content-Type'] = 'application/json';
        }

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(url, {
          method,
          headers,
          body: formData || (body ? JSON.stringify(body) : undefined),
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