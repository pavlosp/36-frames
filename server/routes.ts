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

  // Sync Corbado user with our database
  app.post("/api/users/sync", async (req, res) => {
    try {
      const { id, email, username } = req.body;
      console.log("Syncing user:", { id, email, username }); // Debug log

      if (!id || !email || !username) {
        console.log("Missing user data:", { id, email, username }); // Debug log
        return res.status(400).send("Missing required user data");
      }

      // First try to find existing user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (existingUser) {
        console.log("Found existing user:", existingUser); // Debug log

        // Update the existing user if needed
        const [updatedUser] = await db
          .update(users)
          .set({
            email,
            username,
          })
          .where(eq(users.id, id))
          .returning();

        return res.json(updatedUser);
      }

      // Create new user if none exists
      const [newUser] = await db
        .insert(users)
        .values({
          id,
          email,
          username,
          bio: null,
        })
        .returning();

      console.log("Created new user:", newUser); // Debug log
      res.json(newUser);
    } catch (error: any) {
      console.error("Error syncing user:", error);
      res.status(500).send(error.message);
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

      const { title, description, userId } = req.body;
      console.log("Creating album with data:", { title, description, userId }); // Debug log

      if (!title) {
        return res.status(400).send("Title is required");
      }

      // Validate user ID
      if (!userId) {
        console.log("Missing userId in request body:", req.body); // Debug log
        return res.status(401).send("User not authenticated");
      }

      // Verify user exists before creating album
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        console.log("User not found in database:", userId); // Debug log
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

      console.log("Created album:", album); // Debug log

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

      console.log("Updated user profile:", updatedUser); // Debug log
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
      console.log("Fetching profile for user:", userId); // Debug log

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

      console.log("Found user profile:", user); // Debug log
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}