"use server";

import { headers } from "next/headers";
import { db } from "@/app/lib/db";
import { bookshelves, highlights } from "@/app/lib/db/schema";
import { auth } from "@/app/lib/auth";
import { eq, and } from "drizzle-orm";

export async function getBookshelves() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return [];

    const userId = session.user.id;
    const results = await db.select().from(bookshelves).where(eq(bookshelves.userId, userId));
    return results;
  } catch (error) {
    console.error("Error fetching bookshelves:", error);
    return [];
  }
}

export async function createBookshelf(name: string, color?: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;
    const now = new Date();

    const [newShelf] = await db.insert(bookshelves).values({
      userId,
      name,
      color,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return { success: true, bookshelf: newShelf };
  } catch (error) {
    console.error("Error creating bookshelf:", error);
    return { success: false, error: "Failed to create bookshelf" };
  }
}

export async function updateBookshelf(id: string, name: string, color?: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;
    const now = new Date();

    await db.update(bookshelves).set({
      name,
      color,
      updatedAt: now,
    }).where(
      and(
        eq(bookshelves.id, id),
        eq(bookshelves.userId, userId)
      )
    );

    return { success: true };
  } catch (error) {
    console.error("Error updating bookshelf:", error);
    return { success: false, error: "Failed to update bookshelf" };
  }
}

export async function deleteBookshelf(id: string, strategy: 'delete_all' | 'move_to_general' = 'move_to_general') {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;

    if (strategy === 'move_to_general') {
      // Set categoryId to null for all highlights in this shelf
      await db.update(highlights).set({
        categoryId: null,
        updatedAt: new Date(),
      }).where(
        and(
          eq(highlights.categoryId, id),
          eq(highlights.userId, userId)
        )
      );
    } else {
      // Delete all highlights in this shelf
      await db.delete(highlights).where(
        and(
          eq(highlights.categoryId, id),
          eq(highlights.userId, userId)
        )
      );
    }

    // Delete the bookshelf
    await db.delete(bookshelves).where(
      and(
        eq(bookshelves.id, id),
        eq(bookshelves.userId, userId)
      )
    );

    return { success: true };
  } catch (error) {
    console.error("Error deleting bookshelf:", error);
    return { success: false, error: "Failed to delete bookshelf" };
  }
}

