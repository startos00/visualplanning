// Client-safe AI provider and model constants
// This file can be safely imported on both client and server

export type AgentType = "dumbo" | "dumby";
export type Provider = "openai" | "google" | "anthropic";

// Valid models per provider
export const VALID_MODELS: Record<Provider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  google: ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-3-flash-preview"],
  anthropic: ["claude-3-5-sonnet-latest", "claude-3-opus-latest", "claude-3-haiku-latest"],
};

// Default models per provider
export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  google: "gemini-1.5-flash",
  anthropic: "claude-3-5-sonnet-latest",
};

/**
 * Check if a model is valid for a given provider
 */
export function isValidModel(provider: Provider, model: string): boolean {
  return VALID_MODELS[provider].includes(model);
}

