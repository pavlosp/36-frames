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
import { eq, asc } from "drizzle-orm";
import { authenticateUser } from "./middleware/auth";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    files: 36,
    fileSize: 1024 * 1024, // 1MB
  },
});

export function registerRoutes(app: Express): Server {
  // Serve static files from uploads directory
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Move the profile endpoint before other user-related routes to ensure proper routing
  app.get("/api/users/profile", authenticateUser, async (req, res) => {
    console.log("GET /api/users/profile endpoint hit");
    try {
      const userId = req.userId; // This is the Corbado user ID from auth middleware
      console.log("Fetching profile for user:", userId);

      // Debug: Log the query we're about to make
      console.log("Looking up user in database with ID:", userId);

      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          bio: users.bio,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      console.log("Database query result:", user || "No user found");

      if (!user) {
        console.log("User not found in database:", userId);
        return res.status(404).json({ error: "User not found" });
      }

      console.log("Found user profile:", user);
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Protected route - requires authentication
  app.get("/api/albums", authenticateUser, async (_req, res) => {
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

  // Public route - no authentication required
  app.get("/api/albums/:slug", async (req, res) => {
    try {
      const album = await db.query.albums.findFirst({
        where: (albums, { eq }) => eq(albums.slug, req.params.slug),
        with: {
          photos: {
            orderBy: (photos, { asc }) => [
              asc(photos.takenAt),
              asc(photos.createdAt),
            ],
          },
          user: {
            columns: {
              username: true,
              bio: true, // Add this to include the bio field
            },
          },
        },
      });

      if (!album) {
        return res.status(404).send("Album not found");
      }

      console.log(
        `Retrieved album ${album.slug} with ${album.photos.length} photos`,
      );
      res.json({ album });
    } catch (error) {
      console.error("Error fetching album:", error);
      res.status(500).send("Error fetching album");
    }
  });

  // Protected route - requires authentication
  app.get("/api/users/:username", authenticateUser, async (req, res) => {
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


  // Protected route - used by useUser hook

  // Protected route - requires authentication
  app.post("/api/users/create", authenticateUser, async (req, res) => {
    try {
      const { id, email } = req.body;
      console.log("Received create user request:", { id, email });

      // Verify the authenticated user matches the requested user ID
      if (id !== req.userId) {
        console.log("User ID mismatch:", {
          requestId: id,
          authUserId: req.userId,
        });
        return res
          .status(403)
          .json({ error: "Unauthorized: User ID mismatch" });
      }

      if (!id || !email) {
        return res.status(400).json({ error: "ID and email are required" });
      }

      // Check if user already exists first
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (existingUser) {
        console.log(
          "User already exists, returning existing user:",
          existingUser,
        );
        return res.status(200).json(existingUser);
      }

      // Only create new user if one doesn't exist
      console.log("Creating new user:", { id, email });
      const [newUser] = await db
        .insert(users)
        .values({
          id,
          email,
          username: null,
          bio: null,
        })
        .returning();

      console.log("Created new user:", newUser);
      res.json(newUser);
    } catch (error: any) {
      console.error("Error in user creation:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Create album - requires auth
  app.post(
    "/api/albums",
    authenticateUser,
    upload.array("photos", 36),
    async (req, res) => {
      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).send("No photos uploaded");
        }

        const { title, description, userId } = req.body;
        console.log("Creating album:", { title, description, userId });

        // Verify the authenticated user matches the requested user ID
        if (userId !== req.userId) {
          return res
            .status(403)
            .json({ error: "Unauthorized: User ID mismatch" });
        }

        if (!title) {
          return res.status(400).send("Title is required");
        }

        if (!userId) {
          console.log("Missing userId in request body:", req.body);
          return res.status(401).send("User not authenticated");
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user) {
          console.log("User not found:", userId);
          return res.status(404).send("User not found");
        }

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

        const uploadsDir = path.join(process.cwd(), "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });

        const photoPromises = files.map(async (file, index) => {
          const dateMatch = file.originalname.match(/^(\d{8})_(\d{6})/);
          let takenDate: Date | null = null;

          if (dateMatch) {
            const [_, dateStr, timeStr] = dateMatch;
            const year = dateStr.slice(0, 4);
            const month = dateStr.slice(4, 6);
            const day = dateStr.slice(6, 8);
            const hour = timeStr.slice(0, 2);
            const minute = timeStr.slice(2, 4);
            const second = timeStr.slice(4, 6);
            takenDate = new Date(
              `${year}-${month}-${day}T${hour}:${minute}:${second}`,
            );
            console.log(
              `Extracted date from filename ${file.originalname}:`,
              takenDate,
            );
          }

          const photoPath = path.join(uploadsDir, file.originalname);
          await fs.writeFile(photoPath, file.buffer);
          console.log("Saved photo:", file.originalname);

          return db.insert(photos).values({
            albumId: album.id,
            url: `/uploads/${file.originalname}`,
            order: index,
            takenAt: takenDate,
          });
        });

        try {
          await Promise.all(photoPromises);
          console.log("All photos processed and saved");
        } catch (error) {
          console.error("Error saving photos:", error);
          await db.delete(albums).where(eq(albums.id, album.id));
          throw error;
        }

        res.json(album);
      } catch (error: any) {
        console.error("Error creating album:", error);
        if (error.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .send("One or more photos exceed the 1MB size limit");
        }
        res.status(500).send(error.message || "Error creating album");
      }
    },
  );

  // Update profile - requires auth
  app.put("/api/users/profile", authenticateUser, async (req, res) => {
    try {
      const { username, bio, userId } = req.body;
      console.log("Updating profile for user:", { username, bio, userId });

      // Verify the authenticated user matches the requested user ID
      if (userId !== req.userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized: User ID mismatch" });
      }

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Username is already taken" });
      }

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

  const httpServer = createServer(app);
  return httpServer;
}