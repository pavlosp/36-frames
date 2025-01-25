import EXIF from 'exif-js';
import { nanoid } from "nanoid";

export async function getImageTakenDate(file: File): Promise<Date> {
  return new Promise((resolve) => {
    const fileDate = new Date(file.lastModified);
    console.log("Starting EXIF extraction for:", file.name);

    try {
      EXIF.getData(file as any, function() {
        try {
          const allTags = EXIF.getAllTags(this);
          console.log("EXIF tags found:", allTags ? "yes" : "no");

          if (allTags) {
            const dateTimeOriginal = EXIF.getTag(this, "DateTimeOriginal");
            console.log("DateTimeOriginal:", dateTimeOriginal);

            if (dateTimeOriginal) {
              // EXIF dates are in format "YYYY:MM:DD HH:MM:SS"
              const dateStr = dateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
              const exifDate = new Date(dateStr);

              if (!isNaN(exifDate.getTime())) {
                console.log("Using EXIF date:", exifDate);
                resolve(exifDate);
                return;
              }
            }
          }

          console.log("Using file date:", fileDate);
          resolve(fileDate);
        } catch (error) {
          console.error("Error parsing EXIF:", error);
          resolve(fileDate);
        }
      });
    } catch (error) {
      console.error("Error reading EXIF:", error);
      resolve(fileDate);
    }
  });
}

export function formatDateForFilename(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function generateUniquePhotoFilename(originalFilename: string, date: Date): string {
  const timestamp = formatDateForFilename(date);
  const uniqueId = nanoid(6);
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  return `${timestamp}-${uniqueId}.${extension}`;
}

export async function compressImage(file: File): Promise<Blob> {
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
          console.log(`Compressed ${file.name}: ${(file.size / 1024).toFixed(1)}KB -> ${(blob.size / 1024).toFixed(1)}KB`);
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
}