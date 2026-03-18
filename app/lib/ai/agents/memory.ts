/**
 * Grimpy Memory Service — persistent project-level memory across conversations.
 *
 * Grimpy can save insights, decisions, preferences, learnings, and context
 * that persist across sessions. On each conversation start, relevant memories
 * are auto-injected into the system prompt so Grimpy builds understanding
 * over time.
 */

import { db } from "@/app/lib/db";
import { grimpyMemories } from "@/app/lib/db/schema";
import { eq, and, desc, ilike, sql } from "drizzle-orm";

export type MemoryCategory =
  | "insight"     // Patterns, observations about the project
  | "decision"    // Decisions made and their reasoning
  | "preference"  // User preferences and working style
  | "learning"    // Lessons learned, mistakes to avoid
  | "context";    // Background info about the project/domain

export interface SaveMemoryInput {
  userId: string;
  projectId: string;
  category: MemoryCategory;
  content: string;
  metadata?: Record<string, unknown>;
  importance?: number; // 1-10, default 5
}

export interface RecallMemoriesInput {
  userId: string;
  projectId: string;
  category?: MemoryCategory;
  query?: string;
  limit?: number;
}

/**
 * Save a memory to the persistent store.
 */
export async function saveMemory({
  userId,
  projectId,
  category,
  content,
  metadata,
  importance = 5,
}: SaveMemoryInput): Promise<{ id: string; saved: boolean }> {
  try {
    const [memory] = await db
      .insert(grimpyMemories)
      .values({
        userId,
        projectId,
        category,
        content,
        metadata: metadata || {},
        importance,
      })
      .returning({ id: grimpyMemories.id });

    return { id: memory.id, saved: true };
  } catch (error) {
    console.error("Failed to save memory:", error);
    return { id: "", saved: false };
  }
}

/**
 * Recall memories from the persistent store.
 * Optionally filter by category or search by content.
 */
export async function recallMemories({
  userId,
  projectId,
  category,
  query,
  limit = 20,
}: RecallMemoriesInput): Promise<Array<{
  id: string;
  category: string;
  content: string;
  importance: number;
  createdAt: Date;
}>> {
  try {
    const conditions = [
      eq(grimpyMemories.userId, userId),
      eq(grimpyMemories.projectId, projectId),
    ];

    if (category) {
      conditions.push(eq(grimpyMemories.category, category));
    }

    if (query) {
      conditions.push(ilike(grimpyMemories.content, `%${query}%`));
    }

    const memories = await db
      .select({
        id: grimpyMemories.id,
        category: grimpyMemories.category,
        content: grimpyMemories.content,
        importance: grimpyMemories.importance,
        createdAt: grimpyMemories.createdAt,
      })
      .from(grimpyMemories)
      .where(and(...conditions))
      .orderBy(desc(grimpyMemories.importance), desc(grimpyMemories.createdAt))
      .limit(limit);

    return memories;
  } catch (error) {
    console.error("Failed to recall memories:", error);
    return [];
  }
}

/**
 * Delete a specific memory by ID.
 */
export async function forgetMemory({
  userId,
  memoryId,
}: {
  userId: string;
  memoryId: string;
}): Promise<{ deleted: boolean }> {
  try {
    await db
      .delete(grimpyMemories)
      .where(
        and(eq(grimpyMemories.id, memoryId), eq(grimpyMemories.userId, userId))
      );
    return { deleted: true };
  } catch (error) {
    console.error("Failed to forget memory:", error);
    return { deleted: false };
  }
}

/**
 * Get top memories for system prompt injection.
 * Returns the most important/recent memories formatted for LLM context.
 */
export async function getMemoryContext({
  userId,
  projectId,
  maxMemories = 15,
}: {
  userId: string;
  projectId: string;
  maxMemories?: number;
}): Promise<string> {
  const memories = await recallMemories({
    userId,
    projectId,
    limit: maxMemories,
  });

  if (memories.length === 0) return "";

  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m.content);
  }

  let context = "\n\n## Your Memory (persistent across conversations)\n";
  context += "You have accumulated the following memories about this project:\n\n";

  const categoryLabels: Record<string, string> = {
    insight: "Insights & Patterns",
    decision: "Decisions Made",
    preference: "User Preferences",
    learning: "Lessons Learned",
    context: "Project Context",
  };

  for (const [cat, items] of Object.entries(grouped)) {
    context += `### ${categoryLabels[cat] || cat}\n`;
    for (const item of items) {
      context += `- ${item}\n`;
    }
    context += "\n";
  }

  context += "Use these memories to provide more personalized, context-aware assistance. Save new memories when you learn important things about the project or user.\n";

  return context;
}
