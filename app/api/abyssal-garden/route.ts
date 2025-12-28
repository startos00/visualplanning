import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/app/lib/db";
import { abyssalGardenStates } from "@/app/lib/db/schema";
import { auth } from "@/app/lib/auth";
import { eq, and } from "drizzle-orm";
import type {
  AbyssalInventory,
  AbyssalPlacedItem,
  AbyssalItemId,
} from "@/app/lib/abyssalGarden";

const GARDEN_STATE_ID = "main";

const defaultInventory: AbyssalInventory = {
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
};

async function getOrCreateGardenState(userId: string) {
  const result = await db
    .select()
    .from(abyssalGardenStates)
    .where(and(eq(abyssalGardenStates.id, GARDEN_STATE_ID), eq(abyssalGardenStates.userId, userId)))
    .limit(1);

  if (result.length === 0) {
    try {
      const newState = await db
        .insert(abyssalGardenStates)
        .values({
          id: GARDEN_STATE_ID,
          userId,
          swallowedCount: 0,
          abyssalCurrency: 0,
          inventory: defaultInventory,
          gardenLayout: [],
          awardedTasks: {},
        })
        .returning();
      return newState[0];
    } catch (error) {
      // If insert fails due to race condition, try to fetch again
      const retryResult = await db
        .select()
        .from(abyssalGardenStates)
        .where(and(eq(abyssalGardenStates.id, GARDEN_STATE_ID), eq(abyssalGardenStates.userId, userId)))
        .limit(1);
      if (retryResult.length > 0) {
        return retryResult[0];
      }
      throw error;
    }
  }

  return result[0];
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const state = await getOrCreateGardenState(userId);

    return NextResponse.json({
      swallowedCount: state.swallowedCount,
      abyssalCurrency: state.abyssalCurrency,
      inventory: state.inventory as AbyssalInventory,
      gardenLayout: state.gardenLayout as AbyssalPlacedItem[],
      awardedTasks: state.awardedTasks as Record<string, unknown>,
    });
  } catch (error) {
    console.error("Error loading abyssal garden state:", error);
    return NextResponse.json({ error: "Failed to load abyssal garden state" }, { status: 500 });
  }
}

// Update swallowed count
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await request.json();
    const { field, value } = body;

    const state = await getOrCreateGardenState(userId);

    const whereClause = and(
      eq(abyssalGardenStates.id, GARDEN_STATE_ID),
      eq(abyssalGardenStates.userId, userId),
    );

    if (field === "swallowedCount") {
      await db
        .update(abyssalGardenStates)
        .set({
          swallowedCount: Math.max(0, Math.floor(value)),
          updatedAt: new Date(),
        })
        .where(whereClause);
    } else if (field === "abyssalCurrency") {
      await db
        .update(abyssalGardenStates)
        .set({
          abyssalCurrency: Math.max(0, Math.floor(value)),
          updatedAt: new Date(),
        })
        .where(whereClause);
    } else if (field === "inventory") {
      await db
        .update(abyssalGardenStates)
        .set({
          inventory: value as AbyssalInventory,
          updatedAt: new Date(),
        })
        .where(whereClause);
    } else if (field === "gardenLayout") {
      await db
        .update(abyssalGardenStates)
        .set({
          gardenLayout: value as AbyssalPlacedItem[],
          updatedAt: new Date(),
        })
        .where(whereClause);
    } else if (field === "awardedTasks") {
      await db
        .update(abyssalGardenStates)
        .set({
          awardedTasks: value as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(whereClause);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating abyssal garden state:", error);
    return NextResponse.json({ error: "Failed to update abyssal garden state" }, { status: 500 });
  }
}

