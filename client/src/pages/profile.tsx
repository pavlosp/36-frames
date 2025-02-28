import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Camera, Home, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import AlbumGrid from "@/components/album-grid";
import type { User, Album } from "@db/schema";
import { useCorbado } from '@corbado/react';

export default function Profile() {
  const [, params] = useRoute("/profile/:username");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: currentUser, logout } = useUser();
  const { sessionToken } = useCorbado();

  const { data, isLoading } = useQuery<{ user: User; albums: Album[] }>({
    queryKey: [`/api/users/${params?.username}`],
    meta: {
      token: sessionToken
    },
    enabled: !!params?.username && !!sessionToken,
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "Successfully logged out",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background animate-pulse">
        <div className="h-64 bg-muted" />
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
          <Button onClick={() => setLocation("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === data.user.id;

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          {!isOwnProfile && (
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          )}
          <div className="flex items-center gap-4 ml-auto">
            {isOwnProfile && (
              <Button
                onClick={() => setLocation("/create")}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Create Album
              </Button>
            )}
            {isOwnProfile && (
              <Button
                variant="outline"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </Button>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">@{data.user.username}</h1>
          {data.user.bio && (
            <p className="text-muted-foreground">{data.user.bio}</p>
          )}
        </div>

        <h2 className="text-xl font-semibold mb-4">Albums</h2>
        <AlbumGrid albums={data.albums} />
      </div>
    </div>
  );
}