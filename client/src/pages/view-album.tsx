import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Album, Photo } from "@db/schema";
import { useEffect } from "react";

export default function ViewAlbum() {
  const [, params] = useRoute("/album/:slug");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ album: Album & { photos: Photo[]; user: { username: string; bio?: string | null } } }>({
    queryKey: [`/api/albums/${params?.slug}`],
  });

  useEffect(() => {
    if (data?.album) {
      document.title = `36 Frames - ${data.album.title}`;
    }
    return () => {
      document.title = "36 Frames";
    };
  }, [data?.album]);

  const handleShare = async () => {
    try {
      await navigator.share({
        title: data?.album?.title,
        text: data?.album?.description,
        url: window.location.href,
      });
    } catch {
      // Fallback to copying URL
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Album link has been copied to clipboard",
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

  if (!data?.album) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Album not found</h1>
          <Button onClick={() => setLocation("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8">
        {/* Site Description */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">36 Frames</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Curate your own photo stories in 36 frames. Tell your stories and share beautifully-crafted albums with friends and family in one click.
          </p>
        </div>

        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleShare} variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* User Info Box */}
        <div className="bg-primary/5 rounded-lg p-4 mb-6 border border-primary/10">
          <p className="font-bold mb-1">@{data.album.user.username}</p>
          {data.album.user.bio && (
            <p className="text-sm text-muted-foreground">{data.album.user.bio}</p>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-medium text-muted-foreground mb-2">Album:</h2>
          <h1 className="text-3xl font-bold mb-2">{data.album.title}</h1>
          {data.album.description && (
            <p className="text-muted-foreground">{data.album.description}</p>
          )}
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {data.album.photos.map((photo) => (
            <div
              key={photo.id}
              className="break-inside-avoid-column rounded-lg overflow-hidden bg-muted shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              <img
                src={photo.url}
                alt=""
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}