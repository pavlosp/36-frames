import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const albums = pgTable("albums", {
  id: serial("id").primaryKey(),
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

export const albumRelations = relations(albums, ({ many }) => ({
  photos: many(photos),
}));

export const photoRelations = relations(photos, ({ one }) => ({
  album: one(albums, {
    fields: [photos.albumId],
    references: [albums.id],
  }),
}));

export const insertAlbumSchema = createInsertSchema(albums);
export const selectAlbumSchema = createSelectSchema(albums);
export const insertPhotoSchema = createInsertSchema(photos);
export const selectPhotoSchema = createSelectSchema(photos);

export type Album = typeof albums.$inferSelect;
export type InsertAlbum = typeof albums.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = typeof photos.$inferInsert;
