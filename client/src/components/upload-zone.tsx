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
        // Check if adding these files would exceed the limit
        if (files.length + acceptedFiles.length > maxFiles) {
          toast({
            title: "Too many files",
            description: `Maximum ${maxFiles} photos allowed. Please remove some photos first.`,
            variant: "destructive"
          });
          return;
        }

        // Process files without compression
        const newFiles = [...files, ...acceptedFiles];
        onFilesChange(newFiles);
      } catch (error: any) {
        console.error("Error processing images:", error);
        toast({
          title: "Error processing images",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [files, maxFiles, onFilesChange, toast]
  );

  const onDropRejected = useCallback((fileRejections: any[]) => {
    const tooManyFiles = fileRejections.some(
      rejection => rejection.errors.some(error => error.code === 'too-many-files')
    );

    if (tooManyFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${maxFiles} photos at once. Please select fewer files.`,
        variant: "destructive"
      });
    }
  }, [maxFiles, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: maxFiles - files.length,
    disabled: isProcessing || files.length >= maxFiles,
    validator: (file) => {
      if (files.length + 1 > maxFiles) {
        return {
          code: "too-many-files",
          message: `Maximum ${maxFiles} photos allowed`
        };
      }
      return null;
    }
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
        } ${isProcessing || files.length >= maxFiles ? "opacity-50" : ""}`}
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
                : files.length >= maxFiles
                ? `Maximum ${maxFiles} photos reached`
                : "Drag & drop photos here, or click to select"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {files.length}/{maxFiles} photos
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