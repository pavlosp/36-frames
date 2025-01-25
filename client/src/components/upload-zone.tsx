import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import exifr from 'exifr';

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

  const processImage = async (file: File): Promise<File> => {
    try {
      // Get photo date from EXIF
      console.log("Starting EXIF extraction for:", file.name);
      const exif = await exifr.parse(file, {
        pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'],
        translateKeys: true,
        translateValues: true,
      });

      console.log("EXIF data:", exif);

      // Get the date from EXIF or fallback to file date
      const takenDate = exif?.DateTimeOriginal || 
                       exif?.CreateDate || 
                       exif?.ModifyDate || 
                       new Date(file.lastModified);

      console.log("Photo date for", file.name, ":", takenDate);

      // Generate unique filename with date
      const newFilename = generateUniqueFilename(file.name, takenDate);
      console.log("Generated filename:", newFilename);

      // Compress image
      const compressedBlob = await compressImage(file);
      console.log(
        `Compressed ${file.name}: ${(file.size / 1024).toFixed(1)}KB -> ${(
          compressedBlob.size / 1024
        ).toFixed(1)}KB`
      );

      // Create new File with compressed data and new filename
      return new File([compressedBlob], newFilename, { type: "image/jpeg" });
    } catch (error) {
      console.error("Error processing image:", error);
      // If EXIF extraction fails, fallback to using file date
      const fallbackDate = new Date(file.lastModified);
      const newFilename = generateUniqueFilename(file.name, fallbackDate);
      const compressedBlob = await compressImage(file);
      return new File([compressedBlob], newFilename, { type: "image/jpeg" });
    }
  };

  const generateUniqueFilename = (originalFilename: string, date: Date): string => {
    const pad = (num: number) => String(num).padStart(2, '0');
    const timestamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
    return `${timestamp}-${uniqueId}.${extension}`;
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        const maxWidth = 1200;
        const ratio = Math.min(maxWidth / img.width, 1);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        // Draw image
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            resolve(blob);
          },
          'image/jpeg',
          0.85
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  };

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

        setIsProcessing(true);
        setTotalToProcess(acceptedFiles.length);
        setProcessedCount(0);

        // Process all files
        const processedFiles = [];
        for (const file of acceptedFiles) {
          const processedFile = await processImage(file);
          processedFiles.push(processedFile);
          setProcessedCount(prev => prev + 1);
        }

        // Add processed files to existing files
        const newFiles = [...files, ...processedFiles];
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
        setProcessedCount(0);
        setTotalToProcess(0);
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
      "image/*": [".jpeg", ".jpg", ".png", ".heic", ".avif"],
    },
    maxFiles: maxFiles - files.length,
    disabled: isProcessing || files.length >= maxFiles,
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