// IMPORTANT: Database schema is managed manually via SQL
// Run the SQL from schema.sql in Neon console - do NOT use drizzle-kit migrations
// This file contains TypeScript definitions for Drizzle queries only

import { pgTable, text, jsonb, integer, timestamp, varchar, primaryKey, uuid, serial, boolean, uniqueIndex } from "drizzle-orm/pg-core";
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
      "neon-sandcastle": 0,
      "crystalline-spire": 0,
      "sirens-tail": 0,
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

