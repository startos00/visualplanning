"use server";

import { headers } from "next/headers";
import { db } from "@/app/lib/db";
import { ideas, type Idea } from "@/app/lib/db/schema";
import { auth } from "@/app/lib/auth";
import { eq, and, desc, asc } from "drizzle-orm";

export async function getIdeas(projectId?: string): Promise<Idea[]> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return [];

    const userId = session.user.id;

    if (projectId) {
      const results = await db
        .select()
        .from(ideas)
        .where(
          and(
            eq(ideas.userId, userId),
            eq(ideas.projectId, projectId),
            eq(ideas.status, "active")
          )
        )
        .orderBy(asc(ideas.priority), desc(ideas.createdAt));
      return results;
    }

    const results = await db
      .select()
      .from(ideas)
      .where(and(eq(ideas.userId, userId), eq(ideas.status, "active")))
      .orderBy(asc(ideas.priority), desc(ideas.createdAt));
    return results;
  } catch (error) {
    console.error("Error fetching ideas:", error);
    return [];
  }
}

export async function addIdea(
  content: string,
  projectId?: string,
  imageUrl?: string
): Promise<{ success: boolean; idea?: Idea; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;
    const now = new Date();

    const [newIdea] = await db
      .insert(ideas)
      .values({
        userId,
        projectId,
        content,
        imageUrl,
        status: "active",
        priority: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return { success: true, idea: newIdea };
  } catch (error) {
    console.error("Error adding idea:", error);
    return { success: false, error: "Failed to add idea" };
  }
}

export async function updateIdea(
  id: string,
  updates: { content?: string; priority?: number; status?: string; imageUrl?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;
    const now = new Date();

    await db
      .update(ideas)
      .set({
        ...updates,
        updatedAt: now,
      })
      .where(and(eq(ideas.id, id), eq(ideas.userId, userId)));

    return { success: true };
  } catch (error) {
    console.error("Error updating idea:", error);
    return { success: false, error: "Failed to update idea" };
  }
}

export async function deleteIdea(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;

    await db.delete(ideas).where(and(eq(ideas.id, id), eq(ideas.userId, userId)));

    return { success: true };
  } catch (error) {
    console.error("Error deleting idea:", error);
    return { success: false, error: "Failed to delete idea" };
  }
}

export async function archiveIdea(id: string): Promise<{ success: boolean; error?: string }> {
  return updateIdea(id, { status: "archived" });
}

export async function markIdeaProcessed(id: string): Promise<{ success: boolean; error?: string }> {
  return updateIdea(id, { status: "processed" });
}

export async function reorderIdeas(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;
    const now = new Date();

    // Update priority based on position in array
    await Promise.all(
      orderedIds.map((id, index) =>
        db
          .update(ideas)
          .set({ priority: index, updatedAt: now })
          .where(and(eq(ideas.id, id), eq(ideas.userId, userId)))
      )
    );

    return { success: true };
  } catch (error) {
    console.error("Error reordering ideas:", error);
    return { success: false, error: "Failed to reorder ideas" };
  }
}

export async function getArchivedIdeas(projectId?: string): Promise<Idea[]> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return [];

    const userId = session.user.id;

    if (projectId) {
      const results = await db
        .select()
        .from(ideas)
        .where(
          and(
            eq(ideas.userId, userId),
            eq(ideas.projectId, projectId),
            eq(ideas.status, "archived")
          )
        )
        .orderBy(desc(ideas.updatedAt));
      return results;
    }

    const results = await db
      .select()
      .from(ideas)
      .where(and(eq(ideas.userId, userId), eq(ideas.status, "archived")))
      .orderBy(desc(ideas.updatedAt));
    return results;
  } catch (error) {
    console.error("Error fetching archived ideas:", error);
    return [];
  }
}
