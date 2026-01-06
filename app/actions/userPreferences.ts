"use server";

import { db } from "@/app/lib/db";
import { userAiPreferences } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/app/lib/auth";
import { headers } from "next/headers";
import type { AgentType, Provider } from "@/app/lib/ai/aiConstants";
import { isValidModel } from "@/app/lib/ai/aiConstants";

/**
 * Get user's AI preferences for both agents
 */
export async function getUserAiPreferences() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { error: "Unauthorized" };
    }

    const preferences = await db
      .select()
      .from(userAiPreferences)
      .where(eq(userAiPreferences.userId, session.user.id));

    const result: Record<AgentType, { provider: Provider; model: string } | null> = {
      dumbo: null,
      dumby: null,
    };

    for (const pref of preferences) {
      result[pref.agentType as AgentType] = {
        provider: pref.provider as Provider,
        model: pref.model,
      };
    }

    return { preferences: result };
  } catch (error) {
    console.error("Error fetching user AI preferences:", error);
    return { error: "Failed to fetch preferences" };
  }
}

/**
 * Update user's AI preference for a specific agent
 */
export async function updateUserAiPreference(
  agentType: AgentType,
  provider: Provider,
  model: string
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { error: "Unauthorized" };
    }

    // Validate provider/model combination
    if (!isValidModel(provider, model)) {
      return { error: `Invalid model "${model}" for provider "${provider}"` };
    }

    // Check if preference exists
    const existing = await db
      .select()
      .from(userAiPreferences)
      .where(
        and(
          eq(userAiPreferences.userId, session.user.id),
          eq(userAiPreferences.agentType, agentType)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing preference
      await db
        .update(userAiPreferences)
        .set({
          provider,
          model,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userAiPreferences.userId, session.user.id),
            eq(userAiPreferences.agentType, agentType)
          )
        );
    } else {
      // Create new preference
      await db.insert(userAiPreferences).values({
        userId: session.user.id,
        agentType,
        provider,
        model,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user AI preference:", error);
    return { error: "Failed to update preference" };
  }
}

/**
 * Delete user's AI preference for a specific agent (revert to defaults)
 */
export async function deleteUserAiPreference(agentType: AgentType) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { error: "Unauthorized" };
    }

    await db
      .delete(userAiPreferences)
      .where(
        and(
          eq(userAiPreferences.userId, session.user.id),
          eq(userAiPreferences.agentType, agentType)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("Error deleting user AI preference:", error);
    return { error: "Failed to delete preference" };
  }
}

