import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Album } from "@db/schema";
import { Camera, LogOut } from "lucide-react";
import AlbumGrid from "@/components/album-grid";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { data: albums, isLoading } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
  });
  const { logout } = useUser();
  const { toast } = useToast();

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            36 Frames
          </h1>
          <div className="flex items-center gap-2">
            <Link href="/create">
              <Button className="gap-2">
                <Camera className="h-4 w-4" />
                Create Album
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className="h-48 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <AlbumGrid albums={albums || []} />
        )}
      </div>
    </div>
  );
}