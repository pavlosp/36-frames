import EXIF from 'exif-js';
import { nanoid } from "nanoid";

export async function getImageTakenDate(file: File): Promise<Date> {
  return new Promise((resolve) => {
    console.log("Starting EXIF extraction for file:", file.name);

    // First try to get the file's last modified date as a fallback
    const fileDate = new Date(file.lastModified);
    console.log("File last modified date:", fileDate);

    // Get EXIF data
    EXIF.getData(file as any, function(this: any) {
      const allTags = EXIF.getAllTags(this);
      console.log("Raw EXIF data:", allTags);

      // Try different date fields in order of preference
      const dateTimeOriginal = EXIF.getTag(this, "DateTimeOriginal");
      const dateTimeDigitized = EXIF.getTag(this, "DateTimeDigitized");
      const createDate = EXIF.getTag(this, "CreateDate");
      const modifyDate = EXIF.getTag(this, "ModifyDate");

      console.log("EXIF date fields found:", {
        dateTimeOriginal,
        dateTimeDigitized,
        createDate,
        modifyDate
      });

      // Try to use EXIF date first
      let dateStr = dateTimeOriginal || dateTimeDigitized || createDate || modifyDate;

      if (dateStr) {
        // EXIF dates are in format "YYYY:MM:DD HH:MM:SS"
        // Convert to standard ISO format
        dateStr = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
        const exifDate = new Date(dateStr);
        console.log("Successfully parsed EXIF date:", exifDate);
        resolve(exifDate);
      } else {
        // If no EXIF date found, use file's last modified date
        console.log("No EXIF date found, using file last modified date:", fileDate);
        resolve(fileDate);
      }
    });
  });
}

export function formatDateForFilename(date: Date): string {
  return date.toISOString()
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

// New function to compress image and preserve EXIF
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