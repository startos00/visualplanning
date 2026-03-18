import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { generateObject } from "ai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

// Schema for structured output — 6-level planning hierarchy
// North Star → Vision → Strategy → Operations → Tactical → Resource
const planSchema = z.object({
  northStar: z.object({
    title: z.string().describe("Core principle or rule guiding the project"),
    description: z.string(),
  }),
  vision: z.object({
    title: z.string().describe("Long-term coordinating plan"),
    description: z.string(),
  }),
  strategy: z.object({
    title: z.string().describe("Specific initiative to pursue"),
    description: z.string(),
  }),
  operations: z.array(
    z.object({
      title: z.string().describe("Repeatable system or process"),
      description: z.string().describe("Description or empty string"),
      cadence: z.string().describe("Cadence like 'Weekly', 'Monthly' or empty string"),
    })
  ),
  milestones: z.array(
    z.object({
      title: z.string(),
      targetDate: z.string().describe("Target date or empty string if not applicable"),
      description: z.string().describe("Description or empty string if not needed"),
    })
  ),
  tactics: z.array(
    z.object({
      title: z.string().describe("Single action with a deadline"),
      description: z.string().describe("Description or empty string"),
      deadline: z.string().describe("Deadline like 'Day 1', 'Week 1' or empty string"),
    })
  ),
  resources: z.array(
    z.object({
      title: z.string().describe("Supporting asset needed"),
      description: z.string().describe("Description or empty string"),
      link: z.string().describe("URL or empty string"),
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
  provider?: "openai" | "google" | "anthropic" | "openrouter";
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

    // Provider selection: prefer Anthropic if key available, then openrouter, then google
    const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const provider: "openai" | "google" | "anthropic" | "openrouter" =
      body?.provider === "openai"
        ? "openai"
        : body?.provider === "google"
          ? "google"
          : body?.provider === "anthropic"
            ? "anthropic"
            : body?.provider === "openrouter"
              ? "openrouter"
              : anthropicKey
                ? "anthropic"
                : openrouterKey
                  ? "openrouter"
                  : "google";

    const requestedModel = typeof body?.model === "string" ? body.model.trim() : "";

    const validModels: Record<string, string[]> = {
      google: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
      openai: ["gpt-4o", "gpt-4o-mini"],
      anthropic: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001", "claude-3-5-sonnet-latest"],
      openrouter: [
        "google/gemini-2.0-flash-exp:free",
        "google/gemini-2.0-flash-001",
        "anthropic/claude-3-5-haiku",
        "openai/gpt-4o-mini",
      ],
    };

    const defaultModels: Record<string, string> = {
      google: "gemini-2.0-flash",
      openai: "gpt-4o-mini",
      anthropic: "claude-sonnet-4-6",
      openrouter: "google/gemini-2.0-flash-001",
    };

    const modelId =
      requestedModel && validModels[provider]?.includes(requestedModel)
        ? requestedModel
        : defaultModels[provider];

    // Check API keys
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" }, { status: 500 });
    }
    if (provider === "anthropic" && !anthropicKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    }
    if (provider === "openrouter" && !openrouterKey) {
      return NextResponse.json({ error: "Missing OpenRouter API key" }, { status: 500 });
    }

    let model;
    if (provider === "google") {
      model = google(modelId);
    } else if (provider === "anthropic") {
      model = anthropic(modelId);
    } else if (provider === "openrouter") {
      const openrouter = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openrouterKey,
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

    const systemPrompt = `You are Grimpy, the Ancient Architect of the Deep. You are a strategic planning AI that transforms raw ideas into structured, actionable plans using a 6-level planning hierarchy.

The 6 levels (from highest to lowest abstraction):
1. NORTH STAR — Core principle or rule that guides everything (e.g. "All content must be community-driven")
2. VISION — Long-term coordinating plan (e.g. "Build a content ecosystem across Substack, social, and events")
3. STRATEGY — Specific initiative to pursue (e.g. "Launch a weekly Substack newsletter")
4. OPERATIONS — Repeatable systems or processes (e.g. "Monthly publishing cycle", "Weekly content review")
5. TACTICAL — Single actions with deadlines (e.g. "Research competitors by Friday", "Send onboarding email")
6. RESOURCE — Supporting assets needed (e.g. "Brand guidelines doc", "Email template", "Analytics dashboard")

${timelinePrompt}

Guidelines:
- Always generate a northStar (the guiding principle) and a vision (the long-term goal)
- Create a clear strategy as the specific initiative
- Generate operations (repeatable processes) when the plan involves ongoing work
- Generate practical, actionable tactics (one-off tasks) from the ideas
- Generate resources (supporting assets, tools, documents) needed to execute
- If the timeline is monthly or longer, include milestones
- Each tactic should be specific and achievable with a relative deadline
- The summary should be a brief overview of the entire plan (2-3 sentences)
- For deadlines, use relative terms like "Day 1", "Week 1", "Month 1"
- For operations cadence, use terms like "Daily", "Weekly", "Monthly"

${contextText}`;

    const userPrompt = `Transform these ideas into a structured ${timelineType} plan using the full 6-level hierarchy:

IDEAS:
${ideasText}

Create a plan with:
1. A north star (the guiding principle)
2. A vision (the long-term goal)
3. A strategy (the specific initiative)
4. Operations (repeatable processes, if applicable)
5. ${timelineType === "daily" ? "No milestones needed" : "Milestones (key checkpoints)"}
6. Tactical tasks (one-off actionable items with deadlines)
7. Resources (supporting assets, tools, or documents needed)
8. A brief summary`;

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
