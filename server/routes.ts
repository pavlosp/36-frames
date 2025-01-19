import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { db } from "@db";
import { albums, photos, users } from "@db/schema";
import { nanoid } from "nanoid";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import express from "express";
import { eq } from "drizzle-orm";

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    files: 36,
    fileSize: 1024 * 1024, // 1MB
  }
});

export function registerRoutes(app: Express): Server {
  // Serve static files from uploads directory
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Get user profile with their albums
  app.get("/api/users/:username", async (req, res) => {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        bio: users.bio,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.username, req.params.username))
      .limit(1);

    if (!user) {
      return res.status(404).send("User not found");
    }

    const userAlbums = await db.query.albums.findMany({
      where: (albums, { eq }) => eq(albums.userId, user.id),
      orderBy: (albums, { desc }) => [desc(albums.createdAt)],
    });

    res.json({ user, albums: userAlbums });
  });

  // Get all albums (public)
  app.get("/api/albums", async (_req, res) => {
    const allAlbums = await db.query.albums.findMany({
      orderBy: (albums, { desc }) => [desc(albums.createdAt)],
      with: {
        user: {
          columns: {
            username: true,
          },
        },
      },
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
        user: {
          columns: {
            username: true,
          },
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

      // Get the Corbado user ID from the request
      const userId = req.body.user?.id;
      if (!userId) {
        return res.status(401).send("User not authenticated");
      }

      // Create album
      const [album] = await db
        .insert(albums)
        .values({
          title,
          description,
          slug: `${nanoid(10)}`,
          userId: parseInt(userId),
        })
        .returning();

      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });

      // Process and save photos
      const photoPromises = files.map(async (file, index) => {
        const optimized = await sharp(file.buffer)
          .resize(1200, 1200, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ 
            quality: 80,
            mozjpeg: true,
            chromaSubsampling: '4:2:0'
          })
          .toBuffer();

        const photoId = nanoid();
        const photoName = `${photoId}.jpg`;
        const photoPath = path.join(uploadsDir, photoName);

        // Save the file to disk
        await fs.writeFile(photoPath, optimized);

        // Create URL using the static file server
        const url = `/uploads/${photoName}`;

        return db.insert(photos).values({
          albumId: album.id,
          url,
          order: index,
        });
      });

      try {
        await Promise.all(photoPromises);
      } catch (error) {
        // If photo processing fails, clean up the album
        await db.delete(albums).where(eq(albums.id, album.id));
        throw error;
      }

      res.json(album);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).send("One or more photos exceed the 1MB size limit");
      }
      res.status(500).send(error.message || "Error creating album");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}