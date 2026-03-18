import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { db } from "@/app/lib/db";
import { projects } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { GrimpoNode } from "@/app/lib/graph";

// Shared plan schema — 6-level planning hierarchy
export const planSchema = z.object({
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

export type WorkshopPlan = z.infer<typeof planSchema>;

const TIMELINE_PROMPTS: Record<string, string> = {
  daily: `Create a daily task list with micro-tasks for today and tomorrow. Focus on immediate actionable items.`,
  weekly: `Create a 7-day sprint breakdown. Break down the ideas into daily tasks spread across the week.`,
  monthly: `Create a 4-week roadmap with weekly milestones. Each week should have a clear focus and deliverables.`,
  quarterly: `Create a 3-month strategic plan with monthly milestones. Include high-level goals and key results.`,
  phases: `Create a full project lifecycle plan with distinct phases (e.g., Discovery, Design, Development, Launch). Each phase should have clear objectives and exit criteria.`,
};

export interface GeneratePlanInput {
  ideas: Array<{ id: string; content: string; imageUrl?: string }>;
  timelineType?: "daily" | "weekly" | "monthly" | "quarterly" | "phases";
  context?: { goal?: string; constraints?: string };
  provider?: "openai" | "google" | "anthropic" | "openrouter";
  model?: string;
}

/**
 * Generate a structured 6-level plan from ideas.
 * Extracted from /api/grimpy/workshop-plan/route.ts for reuse.
 */
export async function generatePlan({
  ideas,
  timelineType = "weekly",
  context,
  provider: reqProvider,
  model: reqModel,
}: GeneratePlanInput): Promise<WorkshopPlan> {
  // Provider selection
  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const provider =
    reqProvider ?? (anthropicKey ? "anthropic" : openrouterKey ? "openrouter" : "google");

  const defaultModels: Record<string, string> = {
    google: "gemini-2.0-flash",
    openai: "gpt-4o-mini",
    anthropic: "claude-sonnet-4-6",
    openrouter: "google/gemini-2.0-flash-001",
  };

  const modelId = reqModel || defaultModels[provider] || defaultModels.anthropic;

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

  const ideasText = ideas.map((idea, i) => `${i + 1}. ${idea.content}`).join("\n");
  const contextText = context
    ? `\nUser's Goal: ${context.goal || "Not specified"}\nConstraints: ${context.constraints || "None specified"}\n`
    : "";
  const timelinePrompt = TIMELINE_PROMPTS[timelineType] || TIMELINE_PROMPTS.weekly;

  const systemPrompt = `You are Grimpy, the Ancient Architect of the Deep. You are a strategic planning AI that transforms raw ideas into structured, actionable plans using a 6-level planning hierarchy.

The 6 levels (from highest to lowest abstraction):
1. NORTH STAR — Core principle or rule that guides everything
2. VISION — Long-term coordinating plan
3. STRATEGY — Specific initiative to pursue
4. OPERATIONS — Repeatable systems or processes
5. TACTICAL — Single actions with deadlines
6. RESOURCE — Supporting assets needed

${timelinePrompt}

Guidelines:
- Always generate a northStar and a vision
- Create a clear strategy as the specific initiative
- Generate operations when the plan involves ongoing work
- Generate practical, actionable tactics from the ideas
- Generate resources needed to execute
- Each tactic should be specific and achievable with a relative deadline
- The summary should be a brief overview (2-3 sentences)
- For deadlines, use relative terms like "Day 1", "Week 1", "Month 1"
${contextText}`;

  const userPrompt = `Transform these ideas into a structured ${timelineType} plan using the full 6-level hierarchy:

IDEAS:
${ideasText}

Create a plan with all 6 levels plus timeline and summary.`;

  const { object } = await generateObject({
    model,
    schema: planSchema,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return {
    ...object,
    timeline: { ...object.timeline, type: timelineType },
  };
}

export interface CanvasNodeSummary {
  totalNodes: number;
  byType: Record<string, number>;
  tacticalNodes: Array<{
    id: string;
    title: string;
    status?: string;
    deadline?: string;
    notes?: string;
  }>;
  strategyNodes: Array<{ id: string; title: string; notes?: string }>;
  resourceNodes: Array<{ id: string; title: string; link?: string }>;
}

/**
 * Scan canvas nodes and return a structured summary for the orchestrator.
 */
export async function scanCanvasNodes({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}): Promise<CanvasNodeSummary> {
  const project = await db
    .select({ nodes: projects.nodes })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  const nodes = ((project[0]?.nodes as any[]) || []) as GrimpoNode[];

  const byType: Record<string, number> = {};
  const tacticalNodes: CanvasNodeSummary["tacticalNodes"] = [];
  const strategyNodes: CanvasNodeSummary["strategyNodes"] = [];
  const resourceNodes: CanvasNodeSummary["resourceNodes"] = [];

  for (const node of nodes) {
    const type = node.type || "unknown";
    byType[type] = (byType[type] || 0) + 1;

    if (type === "tactical") {
      tacticalNodes.push({
        id: node.id,
        title: node.data.title || "Untitled",
        status: node.data.status,
        deadline: node.data.deadline,
        notes: node.data.notes?.slice(0, 200),
      });
    } else if (type === "strategy") {
      strategyNodes.push({
        id: node.id,
        title: node.data.title || "Untitled",
        notes: node.data.notes?.slice(0, 200),
      });
    } else if (type === "resource") {
      resourceNodes.push({
        id: node.id,
        title: node.data.title || "Untitled",
        link: node.data.link,
      });
    }
  }

  return {
    totalNodes: nodes.length,
    byType,
    tacticalNodes,
    strategyNodes,
    resourceNodes,
  };
}
