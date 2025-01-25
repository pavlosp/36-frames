import exifReader from "exif-reader";
import { nanoid } from "nanoid";

export async function getImageTakenDate(file: File): Promise<Date | null> {
  try {
    console.log("Reading EXIF data from file:", file.name);
    const arrayBuffer = await file.arrayBuffer();
    const view = new DataView(arrayBuffer);

    // Check for EXIF magic bytes
    if (view.getUint16(0, false) !== 0xFFD8) {
      console.warn('Not a valid JPEG:', file.name);
      return null;
    }

    let offset = 2;
    while (offset < view.byteLength) {
      if (view.getUint16(offset, false) === 0xFFE1) {
        console.log("Found EXIF marker at offset:", offset);
        const exifLength = view.getUint16(offset + 2, false);
        const exifData = new Uint8Array(arrayBuffer.slice(offset + 4, offset + 2 + exifLength));
        const exif = exifReader(Buffer.from(exifData));

        if (typeof exif === 'object' && exif !== null && 'exif' in exif) {
          const exifInfo = exif as any;
          console.log("Parsed EXIF data:", exifInfo);
          if (exifInfo.exif?.DateTimeOriginal) {
            const date = new Date(exifInfo.exif.DateTimeOriginal);
            console.log("Extracted date:", date);
            return date;
          } else {
            console.warn("No DateTimeOriginal in EXIF data");
          }
        } else {
          console.warn("Invalid EXIF data structure:", exif);
        }
        break;
      }
      offset += 2 + view.getUint16(offset + 2, false);
    }
    console.warn("No EXIF marker found in file");
    return null;
  } catch (error) {
    console.error('Error reading EXIF:', error);
    return null;
  }
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