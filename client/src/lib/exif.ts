import EXIF from 'exif-js';
import { nanoid } from "nanoid";

export async function getImageTakenDate(file: File): Promise<Date | null> {
  return new Promise((resolve) => {
    console.log("Starting EXIF extraction for file:", file.name);

    // First read the file into an ArrayBuffer
    const reader = new FileReader();

    reader.onload = function(e) {
      if (!e.target?.result) {
        console.error("Failed to read file:", file.name);
        resolve(null);
        return;
      }

      // Create a binary string from the file data
      const binaryString = e.target.result;
      console.log("File loaded, extracting EXIF data...");

      // Get EXIF data directly from binary data
      EXIF.getData(file, function(this: any) {
        const allTags = EXIF.getAllTags(this);
        console.log("Raw EXIF data for", file.name, ":", allTags);

        // Try different date fields in order of preference
        const dateTimeOriginal = EXIF.getTag(this, "DateTimeOriginal");
        const dateTimeDigitized = EXIF.getTag(this, "DateTimeDigitized");
        const createDate = EXIF.getTag(this, "CreateDate");
        const modifyDate = EXIF.getTag(this, "ModifyDate");

        console.log("Found date fields for", file.name, ":", {
          dateTimeOriginal,
          dateTimeDigitized,
          createDate,
          modifyDate
        });

        // Try different date fields in order of preference
        let dateStr = dateTimeOriginal || dateTimeDigitized || createDate || modifyDate;

        if (dateStr) {
          // EXIF dates are in format "YYYY:MM:DD HH:MM:SS"
          // Convert to standard ISO format
          dateStr = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
          const date = new Date(dateStr);
          console.log("Successfully parsed date for", file.name, ":", date);
          resolve(date);
        } else {
          // If no EXIF date found, try to extract from filename (assuming format YYYYMMDD)
          const dateMatch = file.name.match(/(\d{4})(\d{2})(\d{2})/);
          if (dateMatch) {
            const [_, year, month, day] = dateMatch;
            const date = new Date(Number(year), Number(month) - 1, Number(day));
            console.log("Extracted date from filename:", date);
            resolve(date);
          } else {
            console.warn("No date found in EXIF or filename:", file.name);
            resolve(null);
          }
        }
      });
    };

    reader.onerror = function() {
      console.error("Error reading file:", file.name);
      resolve(null);
    };

    // Start reading the file as binary string
    reader.readAsBinaryString(file);
  });
}

export function formatDateForFilename(date: Date): string {
  const pad = (num: number) => num.toString().padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

export function generateUniquePhotoFilename(originalFilename: string, date: Date | null): string {
  const timestamp = date ? formatDateForFilename(date) : formatDateForFilename(new Date());
  const uniqueId = nanoid(6); // Short unique ID
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  return `${timestamp}-${uniqueId}.${extension}`;
}