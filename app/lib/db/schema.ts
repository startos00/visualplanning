// IMPORTANT: Database schema is managed manually via SQL
// Run the SQL from schema.sql in Neon console - do NOT use drizzle-kit migrations
// This file contains TypeScript definitions for Drizzle queries only

import { pgTable, text, jsonb, integer, timestamp, varchar, primaryKey, uuid, serial, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";
import type { Edge, Viewport } from "reactflow";
import type { GrimpoNode, ModeSetting } from "../graph";
import type { AbyssalInventory, AbyssalPlacedItem } from "../abyssalGarden";

// Canvases table
export const canvases = pgTable("canvases", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name"),
  nodes: jsonb("nodes"),
  edges: jsonb("edges"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Graph state table
export const graphStates = pgTable(
  "graph_states",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(), // Session-based user identification
    nodes: jsonb("nodes").$type<GrimpoNode[]>().notNull().default([]),
    edges: jsonb("edges").$type<Edge[]>().notNull().default([]),
    modeSetting: varchar("mode_setting", { length: 20 }).notNull().default("auto"),
    viewport: jsonb("viewport").$type<Viewport>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.userId] }),
  }),
);

// Abyssal Garden state table
export const abyssalGardenStates = pgTable(
  "abyssal_garden_states",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    swallowedCount: integer("swallowed_count").notNull().default(0),
    abyssalCurrency: integer("abyssal_currency").notNull().default(0),
    inventory: jsonb("inventory").$type<AbyssalInventory>().notNull().default({
      "abyssal-rock": 0,
      "seaweed": 0,
      "bubble": 0,
      "small-coral": 0,
      "shrimp": 0,
      "plankton": 0,
      "starfish": 0,
      "sea-flowers": 0,
      "neon-sandcastle": 0,
      "big-coral": 0,
      "dumbo-octopus": 0,
      "crystalline-spire": 0,
      "turtle": 0,
      "shellfish": 0,
      "michelangelos-david": 0,
      "roman-ruin": 0,
      "sirens-tail": 0,
      "whales": 0,
      "lost-bounty": 0,
    }),
    gardenLayout: jsonb("garden_layout").$type<AbyssalPlacedItem[]>().notNull().default([]),
    awardedTasks: jsonb("awarded_tasks").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.userId] }),
  }),
);

// Grimpo states table
export const grimpoStates = pgTable("grimpo_states", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nodes: jsonb("nodes"),
  edges: jsonb("edges"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Better-Auth tables
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  image: varchar("image", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  providerType: text("provider_type"),
  password: text("password"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const verificationTokens = pgTable("verification_tokens", {
  id: text("id").primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PDF summaries table
export const pdfSummaries = pgTable(
  "pdf_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    pdfBlobUrl: text("pdf_blob_url").notNull(),
    pdfFilename: text("pdf_filename"),
    summaryMarkdown: text("summary_markdown").notNull(),
    summaryJson: jsonb("summary_json").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userNodeUnique: uniqueIndex("pdf_summaries_user_node_unique").on(table.userId, table.nodeId),
  }),
);

// PDF Highlights / Snippets table
// Stores both PDF highlights and manual notes (snippets)
export const highlights = pgTable(
  "highlights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    content: text("content").notNull(),
    comment: text("comment"),
    position: jsonb("position").$type<{
      boundingRect: any;
      rects: any[];
      pageNumber: number;
    }>(),
    categoryId: uuid("category_id").references(() => bookshelves.id, { onDelete: "set null" }),
    title: text("title"),
    type: text("type").notNull().default("highlight"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // Note: The unique constraint is handled via a partial unique index in SQL
    // (only applies to PDF highlights, not manual notes)
    // This allows manual notes to be duplicated
    categoryIdIdx: index("idx_highlights_category_id").on(table.categoryId),
    typeIdx: index("idx_highlights_type").on(table.type),
  }),
);

// Bookshelves table
export const bookshelves = pgTable("bookshelves", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User AI Preferences table
export const userAiPreferences = pgTable(
  "user_ai_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    agentType: text("agent_type").notNull(), // 'dumbo' | 'dumby'
    provider: text("provider").notNull(), // 'openai' | 'google' | 'anthropic'
    model: text("model").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userAgentUnique: uniqueIndex("user_ai_preferences_user_agent_unique").on(table.userId, table.agentType),
  }),
);

export type GraphState = typeof graphStates.$inferSelect;
export type NewGraphState = typeof graphStates.$inferInsert;
export type AbyssalGardenState = typeof abyssalGardenStates.$inferSelect;
export type NewAbyssalGardenState = typeof abyssalGardenStates.$inferInsert;
export type GrimpoState = typeof grimpoStates.$inferSelect;
export type NewGrimpoState = typeof grimpoStates.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type PdfSummary = typeof pdfSummaries.$inferSelect;
export type NewPdfSummary = typeof pdfSummaries.$inferInsert;
export type Highlight = typeof highlights.$inferSelect;
export type NewHighlight = typeof highlights.$inferInsert;
export type Bookshelf = typeof bookshelves.$inferSelect;
export type NewBookshelf = typeof bookshelves.$inferInsert;
export type UserAiPreference = typeof userAiPreferences.$inferSelect;
export type NewUserAiPreference = typeof userAiPreferences.$inferInsert;

