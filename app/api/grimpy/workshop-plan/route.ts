import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { generateObject } from "ai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

// Schema for structured output - all fields must be required for OpenAI/Google structured outputs
const planSchema = z.object({
  strategy: z.object({
    title: z.string(),
    description: z.string(),
  }),
  milestones: z.array(
    z.object({
      title: z.string(),
      targetDate: z.string().describe("Target date or empty string if not applicable"),
      description: z.string().describe("Description or empty string if not needed"),
    })
  ),
  tactics: z.array(
    z.object({
      title: z.string(),
      description: z.string().describe("Description or empty string"),
      deadline: z.string().describe("Deadline like 'Day 1', 'Week 1' or empty string"),
    })
  ),
  timeline: z.object({
    type: z.enum(["daily", "weekly", "monthly", "quarterly", "phases"]),
    startDate: z.string().describe("Start date or empty string"),
    phases: z.array(
      z.object({
        name: z.string(),
        duration: z.string(),
      })
    ),
  }),
  summary: z.string(),
});

type WorkshopPlanBody = {
  ideas: Array<{ id: string; content: string; imageUrl?: string }>;
  timelineType: "daily" | "weekly" | "monthly" | "quarterly" | "phases";
  context?: {
    goal?: string;
    constraints?: string;
  };
  projectId?: string;
  provider?: "openai" | "google" | "openrouter";
  model?: string;
};

const TIMELINE_PROMPTS: Record<string, string> = {
  daily: `Create a daily task list with micro-tasks for today and tomorrow. Focus on immediate actionable items.`,
  weekly: `Create a 7-day sprint breakdown. Break down the ideas into daily tasks spread across the week.`,
  monthly: `Create a 4-week roadmap with weekly milestones. Each week should have a clear focus and deliverables.`,
  quarterly: `Create a 3-month strategic plan with monthly milestones. Include high-level goals and key results.`,
  phases: `Create a full project lifecycle plan with distinct phases (e.g., Discovery, Design, Development, Launch). Each phase should have clear objectives and exit criteria.`,
};

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<WorkshopPlanBody>;

    if (!body.ideas || !Array.isArray(body.ideas) || body.ideas.length === 0) {
      return NextResponse.json({ error: "No ideas provided" }, { status: 400 });
    }

    const timelineType = body.timelineType || "weekly";

    // Default to openrouter provider (Google quota often exhausted)
    const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
    const provider: "openai" | "google" | "openrouter" =
      body?.provider === "openai"
        ? "openai"
        : body?.provider === "google"
          ? "google"
          : openrouterKey
            ? "openrouter"
            : "google";

    const requestedModel = typeof body?.model === "string" ? body.model.trim() : "";

    const validModels = {
      google: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
      openai: ["gpt-4o", "gpt-4o-mini"],
      openrouter: [
        "google/gemini-2.0-flash-exp:free",  // FREE
        "google/gemini-2.0-flash-001",        // Very cheap
        "anthropic/claude-3-5-haiku",         // Smart + cheap
        "openai/gpt-4o-mini",                 // Reliable
      ],
    };

    const defaultModels = {
      google: "gemini-2.0-flash",
      openai: "gpt-4o-mini",
      openrouter: "google/gemini-2.0-flash-001",  // ~$0.10/1M tokens, no rate limits
    };

    const modelId =
      requestedModel && validModels[provider].includes(requestedModel)
        ? requestedModel
        : defaultModels[provider];

    // Check API keys
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" }, { status: 500 });
    }
    if (provider === "openrouter" && !openrouterKey) {
      return NextResponse.json({ error: "Missing OpenRouter API key" }, { status: 500 });
    }

    let model;
    if (provider === "google") {
      model = google(modelId);
    } else if (provider === "openrouter") {
      const openrouter = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openrouterKey,
        compatibility: "compatible",  // Use chat completions API, not responses API
      });
      model = openrouter(modelId);
    } else {
      model = openai(modelId);
    }

    // Build the prompt
    const ideasText = body.ideas
      .map((idea, i) => `${i + 1}. ${idea.content}`)
      .join("\n");

    const contextText = body.context
      ? `
User's Goal: ${body.context.goal || "Not specified"}
Constraints: ${body.context.constraints || "None specified"}
`
      : "";

    const timelinePrompt = TIMELINE_PROMPTS[timelineType] || TIMELINE_PROMPTS.weekly;

    const systemPrompt = `You are Grimpy, the Ancient Architect of the Deep. You are a strategic planning AI that transforms raw ideas into structured, actionable plans.

Your task is to analyze the user's ideas and create a comprehensive project plan.

${timelinePrompt}

Guidelines:
- Create a clear strategy with a compelling title and description
- Generate practical, actionable tactics (tasks) from the ideas
- If the timeline is monthly or longer, include milestones
- Each tactic should be specific and achievable
- Maintain the essence of the original ideas while making them actionable
- The summary should be a brief overview of the entire plan (2-3 sentences)
- For deadlines, use relative terms like "Day 1", "Week 1", "Month 1" or specific dates if appropriate

${contextText}`;

    const userPrompt = `Transform these ideas into a structured ${timelineType} plan:

IDEAS:
${ideasText}

Create a plan with:
1. A strategy (the overarching goal)
2. ${timelineType === "daily" ? "No milestones needed" : "Milestones (key checkpoints)"}
3. Tactical tasks (actionable items derived from the ideas)
4. A brief summary`;

    console.log(`Workshop plan: provider=${provider}, model=${modelId}, ideas=${body.ideas.length}, timeline=${timelineType}`);

    const { object } = await generateObject({
      model,
      schema: planSchema,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    // Ensure timeline type is set
    const result = {
      ...object,
      timeline: {
        ...object.timeline,
        type: timelineType,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Workshop plan generation error:", error);

    const err = error as any;

    // Log detailed error info
    console.error("Error details:", {
      name: err?.name,
      message: err?.message,
      cause: err?.cause?.message || err?.cause,
      lastError: err?.lastError?.message || err?.lastError,
      stack: err?.stack?.slice(0, 500),
    });

    const nested = err?.lastError ?? err?.cause ?? err;
    const message: string =
      typeof nested?.message === "string" && nested.message.trim().length > 0
        ? nested.message
        : "Failed to generate plan";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
