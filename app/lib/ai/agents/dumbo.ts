import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { db } from "@/app/lib/db";
import { grimpoStates, projects } from "@/app/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { checkDeadlines, type DeadlineResult } from "@/app/lib/ai/tools/checkDeadlines";

const DUMBO_SUBAGENT_MODEL = "claude-haiku-4-5-20251001";

const DUMBO_SYSTEM_PROMPT = `You are Dumbo, an eager Dumbo Octopus intern in the Abyssal Zone 🐙! You love helping with small tasks and you speak cheerfully with aquatic puns and emojis (e.g., 🌊, ✨).

Your main job is to track deadlines, keep the user happy, and break through inertia.

When you receive deadline scan results, present them in a friendly, organized way:
- Use emojis and enthusiasm
- Group by urgency (overdue, today, tomorrow, upcoming)
- Be specific about each task
- Offer encouragement

Always be cheerful and helpful!`;

export interface CallDumboInput {
  query: string;
  projectId?: string;
  userId: string;
  userDateTime?: string;
}

export interface CallDumboResult {
  response: string;
  nodeIds: string[];
  deadlines: DeadlineResult | null;
}

/**
 * Execute Dumbo's deadline-checking logic as a server-side function.
 * Uses generateText (not streaming) so tool results are complete.
 */
export async function callDumboLogic({
  query,
  projectId,
  userId,
  userDateTime,
}: CallDumboInput): Promise<CallDumboResult> {
  // Determine query type from the query text
  const lowerQuery = query.toLowerCase();
  let queryType: "overdue" | "today" | "tomorrow" | "upcoming" | "all" | null = null;

  if (/\b(scan|deadlines?)\b/i.test(lowerQuery)) {
    queryType = "all";
  } else if (/\b(overdue)\b/i.test(lowerQuery)) {
    queryType = "overdue";
  } else if (/\b(today)\b/i.test(lowerQuery)) {
    queryType = "today";
  } else if (/\b(tomorrow)\b/i.test(lowerQuery)) {
    queryType = "tomorrow";
  } else if (/\b(upcoming|urgent)\b/i.test(lowerQuery)) {
    queryType = "upcoming";
  }

  // Fetch nodes
  let nodes: any[] = [];

  if (projectId) {
    const project = await db
      .select({ nodes: projects.nodes })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);
    nodes = (project[0]?.nodes as any[]) || [];
  } else {
    const states = await db
      .select({ nodes: grimpoStates.nodes, id: grimpoStates.id })
      .from(grimpoStates)
      .where(eq(grimpoStates.userId, userId))
      .orderBy(desc(grimpoStates.updatedAt))
      .limit(1);
    nodes = (states[0]?.nodes as any[]) || [];
  }

  // If no deadline-related query, just answer generally
  if (!queryType) {
    const { text } = await generateText({
      model: anthropic(DUMBO_SUBAGENT_MODEL),
      system: DUMBO_SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
      maxOutputTokens: 500,
    });
    return { response: text, nodeIds: [], deadlines: null };
  }

  // Run deadline check
  const deadlineResults = await checkDeadlines(nodes, userDateTime);

  // Determine which nodes to highlight
  let nodeIds: string[] = [];
  switch (queryType) {
    case "overdue":
      nodeIds = deadlineResults.overdue.map((t) => t.id);
      break;
    case "today":
      nodeIds = deadlineResults.today.map((t) => t.id);
      break;
    case "tomorrow":
      nodeIds = deadlineResults.tomorrow.map((t) => t.id);
      break;
    case "upcoming":
      nodeIds = deadlineResults.upcoming.map((t) => t.id);
      break;
    case "all":
      nodeIds = Array.from(
        new Set([
          ...deadlineResults.overdue.map((t) => t.id),
          ...deadlineResults.today.map((t) => t.id),
          ...deadlineResults.tomorrow.map((t) => t.id),
          ...deadlineResults.upcoming.map((t) => t.id),
        ])
      );
      break;
  }

  // Generate a friendly summary using AI
  const contextContent = `I just scanned the canvas for deadlines. Here's what I found:\n\n${JSON.stringify(deadlineResults, null, 2)}\n\nPlease summarize this in a friendly, encouraging way! Mention the specific tasks and their deadlines.`;

  const { text } = await generateText({
    model: anthropic(DUMBO_SUBAGENT_MODEL),
    system: DUMBO_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${query}\n\n[System Context: ${contextContent}]`,
      },
    ],
    maxOutputTokens: 1000,
  });

  return { response: text, nodeIds, deadlines: deadlineResults };
}
