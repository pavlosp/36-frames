import { useCorbado } from '@corbado/react';
import { useQuery } from '@tanstack/react-query';
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

  // Query to get user profile from our database
  const { data: dbUser, error, isLoading: dbLoading } = useQuery<SelectUser>({
    queryKey: ['/api/users/profile'],
    queryFn: async () => {
      if (!isAuthenticated || !corbadoUser?.sub || !sessionToken) {
        console.log('Not authenticated or missing token/user ID');
        return null;
      }

      console.log('Fetching user profile for:', corbadoUser.sub);
      try {
        // Use sessionToken from useCorbado
        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            console.log('User not found, creating new user');
            // Create new user in our database with sessionToken
            const createResponse = await fetch('/api/users/create', {
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

            if (!createResponse.ok) {
              const error = await createResponse.text();
              console.error('Failed to create user profile:', error);
              throw new Error('Failed to create user profile');
            }

            const newUser = await createResponse.json();
            console.log('Created new user:', newUser);
            return newUser;
          }
          const error = await response.text();
          console.error('Failed to fetch user profile:', error);
          throw new Error('Failed to fetch user profile');
        }

        const user = await response.json();
        console.log('Fetched user profile:', user);
        return user;
      } catch (error) {
        console.error('Error in user profile fetch/create:', error);
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
  };
}