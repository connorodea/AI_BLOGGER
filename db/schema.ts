import { pgTable, text, serial, timestamp, json, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  apiKey: text("api_key"),
  createdAt: timestamp("created_at").defaultNow()
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  slug: text("slug").unique().notNull(),
  keywords: json("keywords").$type<string[]>().notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default('draft'),
  userId: integer("user_id").references(() => users.id),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  publishedAt: timestamp("published_at")
});

export const distributions = pgTable("distributions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id),
  platform: text("platform").notNull(),
  status: text("status").notNull(),
  url: text("url"),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow()
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id),
  views: integer("views").notNull().default(0),
  engagement: integer("engagement").notNull().default(0),
  revenue: integer("revenue").notNull().default(0),
  date: timestamp("date").notNull()
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  isExecuted: boolean("is_executed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Distribution = typeof distributions.$inferSelect;
export type Analytics = typeof analytics.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertPostSchema = createInsertSchema(posts);
export const selectPostSchema = createSelectSchema(posts);
