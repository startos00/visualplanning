import { db } from "@/app/lib/db";
import { userAiPreferences } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { AgentType, Provider } from "./aiConstants";
import { DEFAULT_MODELS, isValidModel } from "./aiConstants";

export type { AgentType, Provider };
export { DEFAULT_MODELS, isValidModel };

export interface UserPreference {
  provider: Provider;
  model: string;
}

/**
 * Get user's AI preference for a specific agent
 * Returns null if no preference exists
 */
export async function getUserPreference(
  userId: string,
  agentType: AgentType
): Promise<UserPreference | null> {
  try {
    const result = await db
      .select()
      .from(userAiPreferences)
      .where(and(eq(userAiPreferences.userId, userId), eq(userAiPreferences.agentType, agentType)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const pref = result[0];
    return {
      provider: pref.provider as Provider,
      model: pref.model,
    };
  } catch (error) {
    console.error(`Error fetching user preference for ${agentType}:`, error);
    return null;
  }
}

/**
 * Get provider and model with fallback chain:
 * 1. User preference from database
 * 2. Request parameters (if provided)
 * 3. Environment variables
 * 4. Hardcoded defaults
 */
export async function getProviderAndModel(
  userId: string,
  agentType: AgentType,
  requestProvider?: string,
  requestModel?: string
): Promise<{ provider: Provider; model: string }> {
  // 1. Check user preference first
  const userPref = await getUserPreference(userId, agentType);
  if (userPref) {
    return userPref;
  }

  // 2. Check request parameters
  if (requestProvider && requestModel) {
    const provider = normalizeProvider(requestProvider);
    if (provider && isValidModel(provider, requestModel)) {
      return { provider, model: requestModel };
    }
  }

  // 3. Check environment variables
  const envProvider = getEnvProvider(agentType);
  const envModel = getEnvModel(agentType, envProvider);
  if (envProvider && envModel) {
    return { provider: envProvider, model: envModel };
  }

  // 4. Hardcoded defaults
  if (agentType === "dumbo") {
    return { provider: "google", model: DEFAULT_MODELS.google };
  } else {
    // dumby
    return { provider: "openai", model: DEFAULT_MODELS.openai };
  }
}

/**
 * Normalize provider string to valid Provider type
 */
function normalizeProvider(provider: string): Provider | null {
  const normalized = provider.trim().toLowerCase();
  if (normalized === "openai" || normalized === "google" || normalized === "anthropic" || normalized === "openrouter") {
    return normalized as Provider;
  }
  return null;
}


/**
 * Get provider from environment variables
 */
function getEnvProvider(agentType: AgentType): Provider | null {
  const envVar =
    agentType === "dumbo"
      ? process.env.DUMBO_CHAT_PROVIDER
      : process.env.DUMBY_INTERROGATE_PROVIDER;
  if (!envVar) return null;
  return normalizeProvider(envVar);
}

/**
 * Get model from environment variables with provider fallback
 */
function getEnvModel(agentType: AgentType, provider: Provider | null): string | null {
  const envVar =
    agentType === "dumbo"
      ? process.env.DUMBO_CHAT_MODEL
      : process.env.DUMBY_INTERROGATE_MODEL;
  if (envVar) {
    return envVar.trim();
  }
  // If no env model but we have a provider, use default for that provider
  if (provider) {
    return DEFAULT_MODELS[provider];
  }
  return null;
}

