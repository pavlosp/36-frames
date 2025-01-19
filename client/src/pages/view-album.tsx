import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Album, Photo } from "@db/schema";

export default function ViewAlbum() {
  const [, params] = useRoute("/album/:slug");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ album: Album & { photos: Photo[] } }>({
    queryKey: [`/api/albums/${params?.slug}`],
  });

  const handleShare = async () => {
    try {
      await navigator.share({
        title: data?.album.title,
        text: data?.album.description,
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

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{data.album.title}</h1>
          {data.album.description && (
            <p className="text-muted-foreground">{data.album.description}</p>
          )}
        </div>

        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 [&>*]:w-full [&>*]:break-inside-avoid"
        >
          {data.album.photos.map((photo) => (
            <div
              key={photo.id}
              className="relative pb-[56.25%] rounded-lg overflow-hidden bg-muted"
            >
              <img
                src={photo.url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}