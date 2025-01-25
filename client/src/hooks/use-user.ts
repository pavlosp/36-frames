import { useCorbado } from '@corbado/react';
import { useQuery } from '@tanstack/react-query';
import type { SelectUser } from "@db/schema";

export function useUser() {
  const { loading: isLoading, isAuthenticated, user: corbadoUser, logout } = useCorbado();

  // Query to get user profile from our database
  const { data: dbUser } = useQuery<SelectUser>({
    queryKey: ['/api/users/profile'],
    queryFn: async () => {
      if (!corbadoUser?.sub) {
        return null;
      }

      const response = await fetch(`/api/users/profile?userId=${corbadoUser.sub}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Create new user in our database
          const createResponse = await fetch('/api/users/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: corbadoUser.sub,
              email: corbadoUser.email,
            }),
            credentials: 'include',
          });

          if (!createResponse.ok) {
            throw new Error('Failed to create user profile');
          }

          return createResponse.json();
        }
        throw new Error('Failed to fetch user profile');
      }

      return response.json();
    },
    enabled: !!corbadoUser?.sub && isAuthenticated,
    staleTime: 30000, // Cache for 30 seconds
    retry: false,
  });

  return {
    user: isAuthenticated ? dbUser : null,
    isLoading,
    error: null,
    logout,
  };
}