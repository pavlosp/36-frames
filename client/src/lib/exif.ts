import EXIF from 'exif-js';
import { nanoid } from "nanoid";

export async function getImageTakenDate(file: File): Promise<Date | null> {
  return new Promise((resolve) => {
    console.log("Starting EXIF extraction for file:", file.name);

    // Create an Image object to load the file
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = function() {
      console.log("Image loaded, extracting EXIF data...");
      EXIF.getData(img as any, function(this: any) {
        console.log("Raw EXIF data:", EXIF.getAllTags(this));

        const dateTimeOriginal = EXIF.getTag(this, "DateTimeOriginal");
        const dateTimeDigitized = EXIF.getTag(this, "DateTimeDigitized");
        const createDate = EXIF.getTag(this, "CreateDate");

        console.log("Found date fields:", {
          dateTimeOriginal,
          dateTimeDigitized,
          createDate
        });

        // Try different date fields in order of preference
        let dateStr = dateTimeOriginal || dateTimeDigitized || createDate;

        if (dateStr) {
          // EXIF dates are in format "YYYY:MM:DD HH:MM:SS"
          // Convert to standard ISO format
          dateStr = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
          const date = new Date(dateStr);
          console.log("Parsed date:", date);
          URL.revokeObjectURL(objectUrl);
          resolve(date);
        } else {
          console.warn("No EXIF date found in:", file.name);
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        }
      });
    };

    img.onerror = function() {
      console.error("Error loading image:", file.name);
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
}

export function formatDateForFilename(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function generateUniquePhotoFilename(originalFilename: string, date: Date | null): string {
  const timestamp = date ? formatDateForFilename(date) : formatDateForFilename(new Date());
  const uniqueId = nanoid(6); // Short unique ID
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  return `${timestamp}-${uniqueId}.${extension}`;
}