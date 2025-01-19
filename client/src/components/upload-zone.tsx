import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
}

export default function UploadZone({
  files,
  onFilesChange,
  maxFiles = 36,
}: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
      onFilesChange(newFiles);
    },
    [files, maxFiles, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: maxFiles - files.length,
  });

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`p-8 border-dashed cursor-pointer text-center ${
          isDragActive ? "border-primary" : ""
        }`}
      >
        <input {...getInputProps()} />
        <ImagePlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          {isDragActive
            ? "Drop the photos here..."
            : "Drag & drop photos here, or click to select"}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {files.length}/{maxFiles} photos
        </p>
      </Card>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="w-full h-full object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
