import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import UploadZone from "@/components/upload-zone";
import type { InsertAlbum } from "@db/schema";

export default function CreateAlbum() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const createAlbum = useMutation({
    mutationFn: async (data: InsertAlbum & { photos: File[] }) => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      data.photos.forEach((photo) => {
        formData.append("photos", photo);
      });

      const res = await fetch("/api/albums", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Album created!",
        description: "Your album has been created successfully.",
      });
      setLocation(`/album/${data.slug}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

    createAlbum.mutate({ title, description, photos: files });
  };

  const handleFilesChange = (newFiles: File[]) => {
    if (newFiles.length > 36) {
      toast({
        title: "Error",
        description: "Maximum 36 photos allowed",
        variant: "destructive",
      });
      setFiles(newFiles.slice(0, 36)); // Only keep first 36 files
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