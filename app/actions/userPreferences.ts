"use server";

import { db } from "@/app/lib/db";
import { userAiPreferences } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { safeGetSession } from "@/app/lib/safeSession";
import type { AgentType, Provider } from "@/app/lib/ai/aiConstants";
import { isValidModel, VALID_MODELS } from "@/app/lib/ai/aiConstants";

/**
 * Get user's AI preferences for both agents
 */
export async function getUserAiPreferences() {
  try {
    const { session, error, debug } = await safeGetSession();
    if (!session) return { error: error ?? "Unauthorized", debug: debug ?? undefined };

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
    // Gracefully handle missing table in dev/new environments.
    // Neon/Postgres uses SQLSTATE 42P01 for "undefined_table".
    const code = (error as any)?.code;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7dbc43bc-e431-48bc-a404-d2c7ab4b2a70', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/actions/userPreferences.ts:39',
        message: 'getUserAiPreferences failed',
        data: { code, name: (error as any)?.name },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'verify',
        hypothesisId: 'H1'
      })
    }).catch(() => {});
    // #endregion
    if (code === "42P01") {
      const empty: Record<AgentType, { provider: Provider; model: string } | null> = {
        dumbo: null,
        dumby: null,
      };
      return { preferences: empty };
    }
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
    const { session, error, debug } = await safeGetSession();
    if (!session) return { error: error ?? "Unauthorized", debug: debug ?? undefined };

    // Validate provider/model combination
    if (!isValidModel(provider, model)) {
      console.error(`Invalid model "${model}" for provider "${provider}". Valid models:`, VALID_MODELS[provider]);
      return { error: `Invalid model "${model}" for provider "${provider}". Please select a valid model from the dropdown.` };
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
    const err = error as any;
    // Provide more specific error messages
    if (err?.code === "42P01") {
      return { error: "Database table not found. Please run migrations." };
    }
    if (err?.message?.includes("violates unique constraint")) {
      return { error: "Preference already exists. Please try again." };
    }
    if (err?.message?.includes("violates foreign key constraint")) {
      return { error: "Invalid user or agent type." };
    }
    // Return sanitized error message for user-facing errors
    const errorMessage = err?.message || "Failed to update preference";
    return { error: errorMessage };
  }
}

/**
 * Delete user's AI preference for a specific agent (revert to defaults)
 */
export async function deleteUserAiPreference(agentType: AgentType) {
  try {
    const { session, error, debug } = await safeGetSession();
    if (!session) return { error: error ?? "Unauthorized", debug: debug ?? undefined };

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

