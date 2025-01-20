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

export default function FirstTimeSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          username,
          bio,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update profile");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Profile updated!",
        description: "Your profile has been set up successfully.",
      });
      setLocation(`/profile/${data.username}`);
    },
    onError: (error: any) => {
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
    updateProfile.mutate();
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
              onChange={(e) => setUsername(e.target.value)}
              maxLength={12}
            />
            <p className="text-sm text-muted-foreground">
              This will be your public profile URL
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
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? "Setting up..." : "Complete Setup"}
          </Button>
        </form>
      </Card>
    </div>
  );
}