import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not create blob"));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          0.8
        );
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export default function UploadZone({
  files,
  onFilesChange,
  maxFiles = 36,
}: UploadZoneProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      try {
        // Check file sizes before processing
        const oversizedFiles = acceptedFiles.filter(
          file => file.size > 1024 * 1024
        );

        if (oversizedFiles.length > 0) {
          toast({
            title: "Files too large",
            description: `${oversizedFiles.length} file(s) exceed the 1MB limit. They will be automatically compressed.`,
            variant: "default"
          });
        }

        setIsProcessing(true);
        setProcessedCount(0);
        setTotalToProcess(acceptedFiles.length);

        // Compress all images in parallel
        const compressedFiles = await Promise.all(
          acceptedFiles.map(async (file, index) => {
            const compressed = await compressImage(file);
            setProcessedCount(prev => prev + 1);

            // Check if still too large after compression
            if (compressed.size > 1024 * 1024) {
              throw new Error(`File "${file.name}" is still too large after compression`);
            }

            return compressed;
          })
        );

        const newFiles = [...files, ...compressedFiles].slice(0, maxFiles);
        onFilesChange(newFiles);
      } catch (error: any) {
        console.error("Error compressing images:", error);
        toast({
          title: "Error processing images",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
        setProcessedCount(0);
        setTotalToProcess(0);
      }
    },
    [files, maxFiles, onFilesChange, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: maxFiles - files.length,
    disabled: isProcessing,
  });

  const handleRemoveFile = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
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
        } ${isProcessing ? "opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">
              Processing {processedCount}/{totalToProcess} images...
            </p>
          </div>
        ) : (
          <>
            <ImagePlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {isDragActive
                ? "Drop the photos here..."
                : "Drag & drop photos here, or click to select"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {files.length}/{maxFiles} photos (max 1MB each)
            </p>
          </>
        )}
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
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={(e) => handleRemoveFile(e, index)}
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