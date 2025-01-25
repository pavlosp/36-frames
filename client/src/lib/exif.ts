import exif from 'exif-reader';
import { nanoid } from "nanoid";

export async function getImageTakenDate(file: File): Promise<Date> {
  return new Promise((resolve) => {
    console.log("Starting EXIF extraction for file:", file.name);

    // Use file's last modified date as fallback
    const fileDate = new Date(file.lastModified);
    console.log("File last modified date:", fileDate.toISOString());

    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        if (!e.target?.result) {
          throw new Error("Failed to read file");
        }

        const buffer = e.target.result as ArrayBuffer;
        const exifData = exif(buffer);
        console.log("Raw EXIF data:", exifData);

        if (exifData?.image?.ModifyDate || exifData?.exif?.DateTimeOriginal) {
          const dateStr = exifData.exif.DateTimeOriginal || exifData.image.ModifyDate;
          const exifDate = new Date(dateStr);
          console.log("Successfully parsed EXIF date:", exifDate);
          resolve(exifDate);
        } else {
          console.log("No EXIF date found, using file modified date:", fileDate);
          resolve(fileDate);
        }
      } catch (error) {
        console.warn("Error reading EXIF:", error);
        console.log("Falling back to file modified date:", fileDate);
        resolve(fileDate);
      }
    };

    reader.onerror = () => {
      console.error("Error reading file");
      resolve(fileDate);
    };

    reader.readAsArrayBuffer(file);
  });
}

export function formatDateForFilename(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')  // Remove dashes and colons
    .replace(/\.\d{3}Z$/, '')  // Remove milliseconds and Z
    .replace('T', '_');  // Replace T with underscore
}

export function generateUniquePhotoFilename(originalFilename: string, date: Date): string {
  const timestamp = formatDateForFilename(date);
  const uniqueId = nanoid(6);
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `${timestamp}-${uniqueId}.${extension}`;
  console.log("Generated filename:", filename, "for original:", originalFilename);
  return filename;
}

// Compress image and preserve quality
export async function compressImage(file: File, maxWidth: number = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with quality 0.8
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          console.log(`Compressed ${file.name} from ${file.size} to ${blob.size} bytes`);
          resolve(blob);
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}