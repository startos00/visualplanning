"use client";

import { useState, useEffect } from "react";
import { Settings, X, Check } from "lucide-react";
import { AbyssalDropdown } from "./AbyssalDropdown";
import type { AgentType, Provider } from "@/app/lib/ai/aiConstants";
import { VALID_MODELS, DEFAULT_MODELS } from "@/app/lib/ai/aiConstants";

type AiProviderSelectorProps = {
  agentType: AgentType;
  currentProvider: Provider;
  currentModel: string;
  onSave: (provider: Provider, model: string) => Promise<void>;
  className?: string;
};

export function AiProviderSelector({
  agentType,
  currentProvider,
  currentModel,
  onSave,
  className = "",
}: AiProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Initialize with validated values - never return empty string
  const getValidModel = (provider: Provider, model: string): string => {
    if (!provider) return DEFAULT_MODELS.google || VALID_MODELS.google?.[0] || "gemini-1.5-flash";
    if (model && VALID_MODELS[provider]?.includes(model)) {
      return model;
    }
    return DEFAULT_MODELS[provider] || VALID_MODELS[provider]?.[0] || DEFAULT_MODELS.google || "gemini-1.5-flash";
  };
  
  const getValidProvider = (provider: Provider | undefined): Provider => {
    if (provider && ["openai", "google", "anthropic"].includes(provider)) {
      return provider;
    }
    return "google";
  };
  
  const safeProvider = getValidProvider(currentProvider);
  const safeModel = getValidModel(safeProvider, currentModel || "");
  
  const [selectedProvider, setSelectedProvider] = useState<Provider>(safeProvider);
  const [selectedModel, setSelectedModel] = useState<string>(safeModel);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state when props change
  useEffect(() => {
    const validProvider = getValidProvider(currentProvider);
    const validModel = getValidModel(validProvider, currentModel || "");
    setSelectedProvider(validProvider);
    setSelectedModel(validModel);
  }, [currentProvider, currentModel]);

  // When provider changes, reset model to default for that provider if current model is invalid
  useEffect(() => {
    if (selectedProvider) {
      const validModel = getValidModel(selectedProvider, selectedModel);
      if (validModel !== selectedModel && validModel) {
        setSelectedModel(validModel);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider]);

  const providerOptions = [
    { label: "OpenAI", value: "openai" },
    { label: "Google (Gemini)", value: "google" },
    { label: "Anthropic (Claude)", value: "anthropic" },
  ];

  const modelOptions = VALID_MODELS[selectedProvider]?.map((model) => ({
    label: formatModelName(model),
    value: model,
  })) || [];
  
  // Ensure selectedModel is valid for selectedProvider - always use a valid model (never empty)
  const isValidSelection = modelOptions.length > 0 && selectedModel && modelOptions.some(opt => opt.value === selectedModel);
  const displayModel = isValidSelection 
    ? selectedModel 
    : (DEFAULT_MODELS[selectedProvider] || VALID_MODELS[selectedProvider]?.[0] || DEFAULT_MODELS.google || "gemini-1.5-flash");

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Ensure we're saving a valid model for the selected provider
      const validModel = VALID_MODELS[selectedProvider]?.includes(selectedModel) 
        ? selectedModel 
        : DEFAULT_MODELS[selectedProvider];
      
      // Call onSave callback which handles the API call
      await onSave(selectedProvider, validModel);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    const validProvider = currentProvider || "google";
    const validModel = getValidModel(validProvider, currentModel || "");
    setSelectedProvider(validProvider);
    setSelectedModel(validModel);
    setError(null);
    setIsOpen(false);
  };

  const hasChanges =
    selectedProvider !== currentProvider || selectedModel !== currentModel;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-full p-1.5 hover:bg-white/10 transition-colors"
        title={`Configure ${agentType} AI settings`}
      >
        <Settings className="h-4 w-4 text-white/70 hover:text-white" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-cyan-300/30 bg-slate-950/95 p-6 shadow-[0_0_32px_rgba(34,211,238,0.4)] backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-cyan-50">
                AI Settings - {agentType === "dumbo" ? "Dumbo" : "Dumby"}
              </h3>
              <button
                onClick={handleCancel}
                className="rounded-full p-1 hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4 text-cyan-300/70" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/50 bg-red-950/50 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-cyan-400/60">
                  Provider
                </label>
                <AbyssalDropdown
                  options={providerOptions}
                  value={selectedProvider}
                  onChange={(value) => setSelectedProvider(value as Provider)}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-cyan-400/60">
                  Model
                </label>
                {modelOptions.length > 0 && displayModel ? (
                  <AbyssalDropdown
                    options={modelOptions}
                    value={displayModel}
                    onChange={(value) => {
                      // Ensure the selected value is valid before updating
                      if (value && VALID_MODELS[selectedProvider]?.includes(value)) {
                        setSelectedModel(value);
                      } else {
                        const fallback = DEFAULT_MODELS[selectedProvider] || VALID_MODELS[selectedProvider]?.[0];
                        if (fallback) {
                          setSelectedModel(fallback);
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="rounded-full border border-red-500/50 bg-red-950/20 px-3 py-1 text-xs text-red-200">
                    No models available for {formatProviderName(selectedProvider)}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-cyan-300/20 bg-slate-900/60 p-3">
                <div className="text-xs text-cyan-300/70">
                  <div className="mb-1">
                    <strong>Current:</strong> {formatProviderName(currentProvider)} →{" "}
                    {formatModelName(currentModel)}
                  </div>
                  {hasChanges && (
                    <div className="text-cyan-200">
                      <strong>New:</strong> {formatProviderName(selectedProvider)} →{" "}
                      {formatModelName(selectedModel)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-cyan-300/20 bg-slate-950/60 px-4 py-2 text-sm text-cyan-300/70 transition-all hover:bg-slate-950/80"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="flex-1 rounded-lg border border-cyan-300/30 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-50 transition-all hover:bg-cyan-500/30 hover:shadow-[0_0_16px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatProviderName(provider: Provider): string {
  const names: Record<Provider, string> = {
    openai: "OpenAI",
    google: "Google",
    anthropic: "Anthropic",
  };
  return names[provider];
}

function formatModelName(model: string): string {
  // Format model names to be more readable
  const formatted = model
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
  return formatted;
}

