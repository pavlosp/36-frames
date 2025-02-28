import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { Label } from "@/components/ui/label";
import { useCorbado } from '@corbado/react';

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export default function FirstTimeSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, createUser } = useUser();
  const { sessionToken } = useCorbado();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const validateUsername = (value: string): boolean => {
    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }
    if (value.length > 12) {
      setUsernameError("Username cannot exceed 12 characters");
      return false;
    }
    if (!USERNAME_REGEX.test(value)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      return false;
    }
    setUsernameError(null);
    return true;
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        // First create the user if it doesn't exist
        try {
          await createUser();
        } catch (error: any) {
          console.error('Failed to create user:', error);
          throw new Error('Failed to create user profile');
        }
      }

      if (!sessionToken) throw new Error("Authentication token not found");

      if (!validateUsername(username)) {
        throw new Error(usernameError || "Invalid username");
      }

      console.log('Updating profile with:', { userId: user?.id, username, bio }); // Debug log

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          userId: user?.id,
          username,
          bio,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update profile");
      }

      const data = await res.json();
      console.log('Profile update response:', data); // Debug log
      return data;
    },
    onSuccess: (data) => {
      console.log('Profile update successful:', data); // Debug log
      toast({
        title: "Profile updated!",
        description: "Your profile has been set up successfully.",
      });
      // Force a small delay to ensure state updates are processed
      setTimeout(() => {
        window.location.href = `/profile/${data.username}`; // Use direct navigation
      }, 100);
    },
    onError: (error: any) => {
      console.error('Profile update error:', error); // Debug log
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }
    if (!validateUsername(username)) {
      toast({
        title: "Error",
        description: usernameError,
        variant: "destructive",
      });
      return;
    }
    updateProfile.mutate();
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    validateUsername(value);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-6">Complete Your Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Choose a unique username"
              value={username}
              onChange={handleUsernameChange}
              maxLength={12}
              className={usernameError ? "border-red-500" : ""}
            />
            {usernameError && (
              <p className="text-sm text-red-500">
                {usernameError}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Use 3-12 characters, letters, numbers, and underscores only
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself (optional)"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={updateProfile.isPending || !!usernameError}
          >
            {updateProfile.isPending ? "Setting up..." : "Complete Setup"}
          </Button>
        </form>
      </Card>
    </div>
  );
}