import { useCorbado } from '@corbado/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SelectUser } from "@db/schema";
import React from 'react';

async function syncUser(corbadoUser: { id: string; email: string; name?: string }) {
  console.log('Syncing Corbado user:', corbadoUser); // Debug log

  if (!corbadoUser.id || !corbadoUser.email) {
    console.error('Invalid Corbado user data:', corbadoUser);
    throw new Error('Invalid user data');
  }

  const response = await fetch('/api/users/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: corbadoUser.id,
      email: corbadoUser.email,
      username: corbadoUser.name || corbadoUser.email.split('@')[0],
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('User sync failed:', error);
    throw new Error(error);
  }

  const data = await response.json();
  console.log('User sync successful:', data); // Debug log
  return data;
}

export function useUser() {
  const { loading: isLoading, isAuthenticated, user: corbadoUser, logout } = useCorbado();
  const queryClient = useQueryClient();

  // Sync Corbado user with our database
  const { mutate: syncUserMutation } = useMutation({
    mutationFn: syncUser,
    onSuccess: (data) => {
      console.log('User sync mutation successful:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error) => {
      console.error('User sync mutation failed:', error);
    },
  });

  // When Corbado user changes, sync with our database
  React.useEffect(() => {
    console.log('Corbado auth state:', { isAuthenticated, corbadoUser }); // Debug log

    if (corbadoUser && isAuthenticated) {
      console.log('Triggering user sync for:', corbadoUser); // Debug log
      syncUserMutation({
        id: corbadoUser.id,
        email: corbadoUser.email,
        name: corbadoUser.name,
      });
    }
  }, [corbadoUser, isAuthenticated, syncUserMutation]);

  // Convert Corbado user to our user type
  const userData: SelectUser | null = corbadoUser ? {
    id: corbadoUser.id,
    username: corbadoUser.name || corbadoUser.email.split('@')[0],
    email: corbadoUser.email,
    bio: null,
    currentChallenge: null,
    createdAt: new Date(),
  } : null;

  return {
    user: isAuthenticated ? userData : null,
    isLoading,
    error: null,
    logout,
  };
}