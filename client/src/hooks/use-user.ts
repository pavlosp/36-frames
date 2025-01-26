import { useCorbado } from '@corbado/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { SelectUser } from "@db/schema";

export function useUser() {
  const { loading: corbadoLoading, isAuthenticated, user: corbadoUser, sessionToken, logout } = useCorbado();

  console.log('useUser hook state:', { 
    corbadoLoading, 
    isAuthenticated, 
    hasToken: !!sessionToken,
    corbadoUser: corbadoUser ? { 
      sub: corbadoUser.sub, 
      email: corbadoUser.email 
    } : null 
  });

  // Mutation for creating a new user
  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!corbadoUser?.sub || !sessionToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          id: corbadoUser.sub,
          email: corbadoUser.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      return response.json();
    },
  });

  // Query to get user profile from our database
  const { data: dbUser, error, isLoading: dbLoading, refetch } = useQuery<SelectUser>({
    queryKey: ['/api/users/profile'],
    meta: {
      token: sessionToken
    },
    queryFn: async () => {
      if (!isAuthenticated || !corbadoUser?.sub || !sessionToken) {
        console.log('Not authenticated or missing token/user ID');
        return null;
      }

      console.log('Fetching user profile for:', corbadoUser.sub);
      try {
        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });

        if (response.ok) {
          const user = await response.json();
          console.log('Fetched existing user profile:', user);
          return user;
        }

        // Only try to create a user if we get a 404
        if (response.status === 404) {
          console.log('User not found, deferring user creation to first-time setup');
          return null;
        }

        // For other errors, throw them
        const error = await response.text();
        console.error('Failed to fetch user profile:', error);
        throw new Error('Failed to fetch user profile');
      } catch (error) {
        console.error('Error in user profile fetch:', error);
        throw error;
      }
    },
    enabled: isAuthenticated && !!corbadoUser?.sub && !!sessionToken,
    staleTime: 30000, // Cache for 30 seconds
    retry: false,
  });

  console.log('useUser hook result:', { 
    user: dbUser, 
    isLoading: corbadoLoading || (isAuthenticated && dbLoading), 
    isAuthenticated,
    error 
  });

  return {
    user: isAuthenticated ? dbUser : null,
    isLoading: corbadoLoading || (isAuthenticated && dbLoading),
    error,
    logout,
    createUser: createUserMutation.mutateAsync,
  };
}