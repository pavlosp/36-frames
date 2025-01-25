import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import UploadZone from "@/components/upload-zone";
import type { InsertAlbum } from "@db/schema";
import { useUser } from "@/hooks/use-user";
import { useCorbado } from '@corbado/react';

function CreateAlbum() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const { sessionToken } = useCorbado();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const createAlbum = useMutation({
    mutationFn: async (data: InsertAlbum & { photos: File[] }) => {
      if (!user?.id) {
        console.error('No user ID available:', user);
        throw new Error("You must be logged in to create an album");
      }

      if (!sessionToken) {
        console.error('No session token available');
        throw new Error("Authentication token not found");
      }

      console.log("Starting album creation with", data.photos.length, "photos");

      try {
        const formData = new FormData();
        formData.append("title", data.title);
        formData.append("description", data.description || "");
        formData.append("userId", user.id);

        // Add all processed photos to form data
        data.photos.forEach((photo) => {
          console.log("Adding to form:", photo.name);
          formData.append("photos", photo);
        });

        console.log("Creating album with user:", user.id);

        const res = await fetch("/api/albums", {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const error = await res.text();
          console.error('Album creation failed:', error);
          throw new Error(error);
        }

        const album = await res.json();
        // Invalidate queries to refresh the albums list
        queryClient.invalidateQueries({ queryKey: ['/api/albums'] });
        if (user?.username) {
          queryClient.invalidateQueries({ 
            queryKey: [`/api/users/${user.username}`] 
          });
        }

        return album;
      } catch (error: any) {
        console.error('Album creation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Album created successfully:', data);
      toast({
        title: "Album created!",
        description: "Your album has been created successfully.",
      });
      setLocation(`/album/${data.slug}`);
    },
    onError: (error: any) => {
      console.error('Album creation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      console.error('No user ID available during submit:', user);
      toast({
        title: "Error",
        description: "You must be logged in to create an album",
        variant: "destructive",
      });
      return;
    }
    if (!title) {
      toast({
        title: "Error",
        description: "Please enter a title for your album",
        variant: "destructive",
      });
      return;
    }
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one photo",
        variant: "destructive",
      });
      return;
    }
    if (files.length > 36) {
      toast({
        title: "Error",
        description: "Maximum 36 photos allowed",
        variant: "destructive",
      });
      return;
    }

    createAlbum.mutate({ 
      title, 
      description, 
      photos: files,
      userId: user.id,
    } as any);
  };

  const handleFilesChange = (newFiles: File[]) => {
    if (newFiles.length > 36) {
      toast({
        title: "Error",
        description: "Maximum 36 photos allowed",
        variant: "destructive"
      });
      setFiles(newFiles.slice(0, 36));
      return;
    }
    setFiles(newFiles);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-2xl">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/")}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">Create New Album</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Input
                placeholder="Album Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <UploadZone
              files={files}
              onFilesChange={handleFilesChange}
              maxFiles={36}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={createAlbum.isPending}
            >
              {createAlbum.isPending ? "Creating..." : "Create Album"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default CreateAlbum;