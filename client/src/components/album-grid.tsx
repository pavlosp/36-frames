import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import type { Album } from "@db/schema";

interface AlbumGridProps {
  albums: Album[];
}

export default function AlbumGrid({ albums }: AlbumGridProps) {
  if (albums.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No albums yet. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {albums.map((album) => (
        <Link key={album.id} href={`/album/${album.slug}`}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <h2 className="font-semibold truncate mb-1">{album.title}</h2>
              {album.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {album.description}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
