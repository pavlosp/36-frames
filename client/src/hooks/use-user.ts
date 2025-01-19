import { useCorbado } from '@corbado/react';
import type { SelectUser } from "@db/schema";

export function useUser() {
  const { loading: isLoading, isAuthenticated, user, logout } = useCorbado();

  // Convert Corbado user to our user type
  const userData: SelectUser | null = user ? {
    id: parseInt(user.id),
    username: user.name || user.email.split('@')[0],
    email: user.email,
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