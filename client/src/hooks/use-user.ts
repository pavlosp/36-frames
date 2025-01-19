import { useCorbado } from '@corbado/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SelectUser } from "@db/schema";
import React from 'react';

async function syncUser(corbadoUser: { id: string; email: string; name?: string }) {
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
    throw new Error(await response.text());
  }

  return response.json();
}

export function useUser() {
  const { loading: isLoading, isAuthenticated, user: corbadoUser, logout } = useCorbado();
  const queryClient = useQueryClient();

  // Sync Corbado user with our database
  const { mutate: syncUserMutation } = useMutation({
    mutationFn: syncUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
  });

  // When Corbado user changes, sync with our database
  React.useEffect(() => {
    if (corbadoUser && isAuthenticated) {
      syncUserMutation({
        id: corbadoUser.id,
        email: corbadoUser.email,
        name: corbadoUser.name,
      });
    }
  }, [corbadoUser, isAuthenticated, syncUserMutation]);

  // Convert Corbado user to our user type
  const userData: SelectUser | null = corbadoUser ? {
    id: corbadoUser.id, // Keep as string
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