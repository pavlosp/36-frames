import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { db } from "@db";
import { albums, photos } from "@db/schema";
import { nanoid } from "nanoid";
import sharp from "sharp";

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    files: 36,
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

export function registerRoutes(app: Express): Server {
  // Get all albums
  app.get("/api/albums", async (_req, res) => {
    const allAlbums = await db.query.albums.findMany({
      orderBy: (albums, { desc }) => [desc(albums.createdAt)],
    });
    res.json(allAlbums);
  });

  // Get single album with photos
  app.get("/api/albums/:slug", async (req, res) => {
    const album = await db.query.albums.findFirst({
      where: (albums, { eq }) => eq(albums.slug, req.params.slug),
      with: {
        photos: {
          orderBy: (photos, { asc }) => [asc(photos.order)],
        },
      },
    });

    if (!album) {
      return res.status(404).send("Album not found");
    }

    res.json({ album });
  });

  // Create new album
  app.post("/api/albums", upload.array("photos", 36), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).send("No photos uploaded");
      }

      const { title, description } = req.body;
      if (!title) {
        return res.status(400).send("Title is required");
      }

      // Create album
      const [album] = await db
        .insert(albums)
        .values({
          title,
          description,
          slug: `${nanoid(10)}`,
        })
        .returning();

      // Process and save photos
      const photoPromises = files.map(async (file, index) => {
        const optimized = await sharp(file.buffer)
          .resize(1200, 1200, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        const photoId = nanoid();
        const photoName = `${photoId}.jpg`;
        
        // In a real app, you would upload to cloud storage here
        // For this example, we'll use a fake URL
        const url = `/uploads/${photoName}`;

        return db.insert(photos).values({
          albumId: album.id,
          url,
          order: index,
        });
      });

      await Promise.all(photoPromises);

      res.json(album);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error creating album");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
