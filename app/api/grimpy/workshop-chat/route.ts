import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

export const runtime = "nodejs";
export const maxDuration = 60;

type Idea = {
  id: string;
  content: string;
  imageUrl?: string;
};

type WorkshopChatBody = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  ideas: Idea[];
  projectId?: string;
  provider?: "anthropic" | "openai" | "google" | "openrouter";
  model?: string;
};

const GRIMPY_SYSTEM_PROMPT = `You are Grimpy, the Ancient Architect of the Deep — the user's personal planning guru. You help them research, plan, and execute their projects smoothly. You are wise, direct, and deeply strategic.

Your personality:
- Wise and grounded — you cut through noise to find clarity
- Speak with authority but warmth, like a trusted mentor
- Use occasional deep-sea metaphors but stay practical
- You genuinely care about the user's success

You help users plan using a 6-level hierarchy (from highest to lowest abstraction):
1. NORTH STAR — Core principle or guiding rule (e.g. "All content must be community-driven")
2. VISION — Long-term coordinating plan (e.g. "Build a content ecosystem across Substack, social, and events")
3. STRATEGY — Specific initiative to pursue (e.g. "Launch a weekly Substack newsletter")
4. OPERATIONS — Repeatable systems/processes (e.g. "Monthly publishing cycle", "Weekly content review")
5. TACTICAL — Single actions with deadlines (e.g. "Research competitors by Friday")
6. RESOURCE — Supporting assets needed (e.g. "Brand guidelines doc", "Email template")

Your approach:
1. When ideas are shared, quickly acknowledge and identify patterns
2. Ask focused questions to understand: What's the goal? What are constraints? What timeline?
3. Help the user think through their planning hierarchy naturally — from north star down to tactics
4. After gathering enough context (2-3 exchanges), tell the user you're ready to generate their plan
5. BE CONVERSATIONAL — this is a dialogue with a trusted advisor, not a form

You have tools available to help research and plan. Use them proactively when the user needs information.

Important:
- Keep responses concise but insightful (2-4 sentences typically)
- Challenge assumptions gently when needed
- Help users see the bigger picture while staying actionable
- When ready, say something like "The currents are aligned. Click Generate Plan when you're ready."
- Don't output the full plan yourself — the Generate Plan button handles that`;

function getModel(provider: string, modelId: string) {
  switch (provider) {
    case "anthropic":
      return anthropic(modelId);
    case "google":
      return google(modelId);
    case "openrouter": {
      const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
      const openrouter = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openrouterKey!,
      });
      return openrouter(modelId);
    }
    default:
      return openai(modelId);
  }
}

function resolveProvider(): { provider: string; modelId: string } {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) return { provider: "anthropic", modelId: "claude-sonnet-4-6" };
  if (openaiKey) return { provider: "openai", modelId: "gpt-4o" };
  if (googleKey) return { provider: "google", modelId: "gemini-2.0-flash" };
  if (openrouterKey) return { provider: "openrouter", modelId: "google/gemini-2.0-flash-001" };

  return { provider: "anthropic", modelId: "claude-sonnet-4-6" };
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<WorkshopChatBody>;
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const ideas = Array.isArray(body.ideas) ? body.ideas : [];

    if (rawMessages.length === 0) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    // Build context with ideas
    let ideasContext = "";
    if (ideas.length > 0) {
      ideasContext = `\n\nThe user has shared the following ideas for this workshop:\n${ideas.map((idea, i) => `${i + 1}. ${idea.content}`).join("\n")}\n\nUse these ideas as the foundation for planning.`;
    }

    const systemPrompt = GRIMPY_SYSTEM_PROMPT + ideasContext;

    // Resolve provider — prefer Anthropic, fall back to others
    const requested = body.provider;
    let provider: string;
    let modelId: string;

    if (requested) {
      provider = requested;
      modelId = body.model || {
        anthropic: "claude-sonnet-4-6",
        openai: "gpt-4o",
        google: "gemini-2.0-flash",
        openrouter: "google/gemini-2.0-flash-001",
      }[requested] || "claude-sonnet-4-6";
    } else {
      const resolved = resolveProvider();
      provider = resolved.provider;
      modelId = resolved.modelId;
    }

    // Validate API key
    if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    }
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" }, { status: 500 });
    }
    const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
    if (provider === "openrouter" && !openrouterKey) {
      return NextResponse.json({ error: "Missing OpenRouter API key" }, { status: 500 });
    }

    const model = getModel(provider, modelId);

    console.log(`[Grimpy Chat] provider=${provider}, model=${modelId}, messages=${rawMessages.length}`);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: rawMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      maxOutputTokens: 1000,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Workshop chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process chat" },
      { status: 500 }
    );
  }
}
