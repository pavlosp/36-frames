import { useCorbado } from '@corbado/react';
import { useQuery } from '@tanstack/react-query';
import type { SelectUser } from "@db/schema";

export function useUser() {
  const { loading: isLoading, isAuthenticated, user: corbadoUser, logout } = useCorbado();

  console.log('useUser hook state:', { 
    isLoading, 
    isAuthenticated, 
    corbadoUser: corbadoUser ? { 
      sub: corbadoUser.sub, 
      email: corbadoUser.email 
    } : null 
  });

  // Query to get user profile from our database
  const { data: dbUser } = useQuery<SelectUser>({
    queryKey: ['/api/users/profile'],
    queryFn: async () => {
      if (!corbadoUser?.sub) {
        console.log('No Corbado user ID available');
        return null;
      }

      console.log('Fetching user profile for:', corbadoUser.sub);
      const response = await fetch(`/api/users/profile?userId=${corbadoUser.sub}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log('User not found, creating new user');
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
    },
    enabled: !!corbadoUser?.sub && isAuthenticated,
    staleTime: 30000, // Cache for 30 seconds
    retry: false,
  });

  console.log('useUser hook result:', { 
    user: dbUser, 
    isLoading, 
    isAuthenticated 
  });

  return {
    user: isAuthenticated ? dbUser : null,
    isLoading,
    error: null,
    logout,
  };
}