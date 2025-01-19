import { pgTable, text, serial, timestamp, integer, varchar, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 12 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  bio: text("bio"),
  currentChallenge: text("current_challenge"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const albums = pgTable("albums", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  slug: text("slug").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  albumId: integer("album_id").references(() => albums.id).notNull(),
  url: text("url").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  albums: many(albums),
}));

export const albumRelations = relations(albums, ({ many, one }) => ({
  photos: many(photos),
  user: one(users, {
    fields: [albums.userId],
    references: [users.id],
  }),
}));

export const photoRelations = relations(photos, ({ one }) => ({
  album: one(albums, {
    fields: [photos.albumId],
    references: [albums.id],
  }),
}));

// Schemas with validation
export const insertUserSchema = createInsertSchema(users, {
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(12, "Username cannot exceed 12 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email cannot exceed 255 characters"),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  currentChallenge: z.string().optional()
});

export const selectUserSchema = createSelectSchema(users);
export const insertAlbumSchema = createInsertSchema(albums);
export const selectAlbumSchema = createSelectSchema(albums);
export const insertPhotoSchema = createInsertSchema(photos);
export const selectPhotoSchema = createSelectSchema(photos);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Album = typeof albums.$inferSelect;
export type InsertAlbum = typeof albums.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = typeof photos.$inferInsert;

// Export select type
export type SelectUser = User;