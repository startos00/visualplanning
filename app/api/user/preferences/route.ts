import { NextResponse } from "next/server";
import { safeGetSession } from "@/app/lib/safeSession";
import { getUserAiPreferences, updateUserAiPreference, deleteUserAiPreference } from "@/app/actions/userPreferences";
import type { AgentType, Provider } from "@/app/lib/ai/aiConstants";
import { isValidModel } from "@/app/lib/ai/aiConstants";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { session, error, debug } = await safeGetSession();
    if (!session) {
      if (error) return NextResponse.json({ error, debug }, { status: 503 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getUserAiPreferences();
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.preferences);
  } catch (error) {
    console.error("Error in GET /api/user/preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session, error, debug } = await safeGetSession();
    if (!session) {
      if (error) return NextResponse.json({ error, debug }, { status: 503 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { agentType, provider, model } = body;

    if (!agentType || !provider || !model) {
      return NextResponse.json(
        { error: "Missing required fields: agentType, provider, model" },
        { status: 400 }
      );
    }

    if (agentType !== "dumbo" && agentType !== "dumby") {
      return NextResponse.json(
        { error: "Invalid agentType. Must be 'dumbo' or 'dumby'" },
        { status: 400 }
      );
    }

    // Validate model is valid for provider
    if (!isValidModel(provider as Provider, model)) {
      return NextResponse.json(
        { error: `Model "${model}" is not available for ${provider}. Please select a different model.` },
        { status: 400 }
      );
    }

    // Check API key availability (warning only, allow save)
    let apiKeyWarning: string | null = null;
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      apiKeyWarning = "Missing API key for OpenAI. Please configure OPENAI_API_KEY in your environment.";
    } else if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
      apiKeyWarning = "Missing API key for Anthropic. Please configure ANTHROPIC_API_KEY in your environment.";
    } else if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      apiKeyWarning = "Missing API key for Google. Please configure GOOGLE_GENERATIVE_AI_API_KEY in your environment.";
    } else if (provider === "openrouter" && !process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_KEY) {
      apiKeyWarning = "Missing API key for OpenRouter. Please configure OPENROUTER_API_KEY or OPENROUTER_KEY in your environment.";
    }

    const result = await updateUserAiPreference(
      agentType as AgentType,
      provider as Provider,
      model
    );

    if ("error" in result) {
      // Return the specific error from the server action
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      warning: apiKeyWarning || undefined
    });
  } catch (error) {
    console.error("Error in POST /api/user/preferences:", error);
    const err = error as any;
    // Provide more context in error response
    const errorMessage = err?.message || "Failed to update preference. Please check your connection and try again.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { session, error, debug } = await safeGetSession();
    if (!session) {
      if (error) return NextResponse.json({ error, debug }, { status: 503 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get("agentType");

    if (!agentType || (agentType !== "dumbo" && agentType !== "dumby")) {
      return NextResponse.json(
        { error: "Missing or invalid agentType query parameter" },
        { status: 400 }
      );
    }

    const result = await deleteUserAiPreference(agentType as AgentType);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/user/preferences:", error);
    return NextResponse.json(
      { error: "Failed to delete preference" },
      { status: 500 }
    );
  }
}

