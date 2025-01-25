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
import exifReader from "exif-reader";

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

  // Create new user
  app.post("/api/users/create", async (req, res) => {
    try {
      const { id, email } = req.body;
      console.log("Creating new user:", { id, email }); // Debug log

      if (!id || !email) {
        return res.status(400).json({ error: "ID and email are required" });
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (existingUser) {
        console.log("User already exists:", existingUser);
        return res.json(existingUser);
      }

      // Create new user with null username that needs to be set later
      const [newUser] = await db
        .insert(users)
        .values({
          id,
          email,
          username: null, // Set username to null initially
          bio: null,
        })
        .returning();

      console.log("Created new user:", newUser);
      res.json(newUser);
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

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
          orderBy: [
            { takenAt: 'asc', nulls: 'last' },
            { order: 'asc' }
          ],
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

  // Create new album with EXIF support
  app.post("/api/albums", upload.array("photos", 36), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).send("No photos uploaded");
      }

      const { title, description, userId } = req.body;
      console.log("Creating album with data:", { title, description, userId });

      if (!title) {
        return res.status(400).send("Title is required");
      }

      if (!userId) {
        console.log("Missing userId in request body:", req.body);
        return res.status(401).send("User not authenticated");
      }

      // Verify user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        console.log("User not found in database:", userId);
        return res.status(404).send("User not found");
      }

      // Create album
      const [album] = await db
        .insert(albums)
        .values({
          title,
          description,
          slug: `${nanoid(10)}`,
          userId: userId,
        })
        .returning();

      console.log("Created album:", album);

      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });

      // Process photos and extract EXIF data
      const photoPromises = files.map(async (file, index) => {
        const sharpImage = sharp(file.buffer);
        const metadata = await sharpImage.metadata();

        let takenAt: Date | null = null;

        try {
          if (metadata.exif) {
            const exif = exifReader(metadata.exif);
            if (exif.exif?.DateTimeOriginal) {
              takenAt = new Date(exif.exif.DateTimeOriginal);
            }
          }
        } catch (error) {
          console.warn("Failed to extract EXIF data:", error);
        }

        const optimized = await sharpImage
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

        // Save the file
        await fs.writeFile(photoPath, optimized);

        const url = `/uploads/${photoName}`;

        return db.insert(photos).values({
          albumId: album.id,
          url,
          order: index,
          takenAt: takenAt || null,
        });
      });

      try {
        await Promise.all(photoPromises);
      } catch (error) {
        await db.delete(albums).where(eq(albums.id, album.id));
        throw error;
      }

      res.json(album);
    } catch (error: any) {
      console.error("Error creating album:", error);
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).send("One or more photos exceed the 1MB size limit");
      }
      res.status(500).send(error.message || "Error creating album");
    }
  });

  // Update user profile
  app.put("/api/users/profile", async (req, res) => {
    try {
      const { username, bio, userId } = req.body;
      console.log("Updating profile for user:", { username, bio, userId }); // Debug log

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }

      // Check if username is already taken by another user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Username is already taken" });
      }

      // Update user profile
      const [updatedUser] = await db
        .update(users)
        .set({
          username,
          bio: bio || null,
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log("Updated user profile:", updatedUser);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Get user profile
  app.get("/api/users/profile", async (req, res) => {
    try {
      const userId = req.query.userId;
      console.log("Fetching profile for user:", userId);

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId as string))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log("Found user profile:", user);
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}