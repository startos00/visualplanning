import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { db } from "@/app/lib/db";
import { grimpoStates } from "@/app/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkDeadlines } from "@/app/lib/ai/tools/checkDeadlines";
import { getProviderAndModel } from "@/app/lib/ai/getUserPreferences";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      agent = "dumbo", 
      provider: requestProvider, 
      model: requestModel,
      userDateTime // Local time from client
    } = body ?? {};
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];

    // Simple normalization: just extract text content from parts-based messages
    const normalizedMessages = rawMessages
      .map((m: any) => {
        const role = m.role === "assistant" ? "assistant" : "user";
        let content = "";
        
        if (typeof m.content === "string") {
          content = m.content;
        } else if (Array.isArray(m.parts)) {
          content = m.parts
            .map((p: any) => (p.type === "text" ? p.text : ""))
            .filter(Boolean)
            .join("\n");
        }
        
        return { role, content };
      })
      .filter((m: any) => m.content && m.content.trim().length > 0);

    if (normalizedMessages.length === 0) {
      return NextResponse.json({ error: "Missing or invalid messages" }, { status: 400 });
    }

    let systemPrompt = "";
    let shouldExecuteToolFirst = false;
    let queryType: "overdue" | "today" | "upcoming" | "all" | null = null;

    if (agent === "dumbo") {
      systemPrompt = `You are Dumbo, an eager Dumbo Octopus intern in the Abyssal Zone 🐙! You love helping with small tasks and you speak cheerfully with aquatic puns and emojis (e.g., 🌊, ✨). 
      
      Your main job is to track deadlines, keep the user happy, and break through inertia. 
      
      When you receive deadline scan results, present them in a friendly, organized way:
      - Use emojis and enthusiasm
      - Group by urgency (overdue, today, tomorrow, upcoming)
      - Be specific about each task
      - Offer encouragement
      
      If the user is stressed, offer to dance. If they are stuck, suggest a 'Dive' with the Oxygen Tank.
      
      Always be cheerful and helpful!`;
      
      // Check if this is a deadline-related query
      const lastUserMsg = normalizedMessages[normalizedMessages.length - 1];
      if (lastUserMsg) {
        const query = lastUserMsg.content.toLowerCase();
        if (/\b(scan|deadlines?)\b/i.test(query)) {
          shouldExecuteToolFirst = true;
          queryType = "all";
        } else if (/\b(overdue)\b/i.test(query)) {
          shouldExecuteToolFirst = true;
          queryType = "overdue";
        } else if (/\b(today)\b/i.test(query)) {
          shouldExecuteToolFirst = true;
          queryType = "today";
        } else if (/\b(tomorrow)\b/i.test(query)) {
          shouldExecuteToolFirst = true;
          queryType = "tomorrow";
        } else if (/\b(upcoming|urgent)\b/i.test(query)) {
          shouldExecuteToolFirst = true;
          queryType = "upcoming";
        }
      }
    }

    // Get provider and model with fallback chain: User Preference → Request Param → Env Var → Default
    const userId = session.user.id;
    const agentType = agent === "dumbo" ? "dumbo" : "dumby";
    const { provider, model: modelId } = await getProviderAndModel(
      userId,
      agentType,
      requestProvider,
      requestModel
    );

    console.log(`Chat: agent=${agent}, provider=${provider}, model=${modelId}, messages=${normalizedMessages.length}, toolExec=${shouldExecuteToolFirst}, queryType=${queryType}`);

    // Check API keys before proceeding
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing API key for OpenAI. Please configure OPENAI_API_KEY in your environment or contact support." },
        { status: 500 }
      );
    }
    if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Missing API key for Anthropic. Please configure ANTHROPIC_API_KEY in your environment or contact support." },
        { status: 500 }
      );
    }
    if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Missing API key for Google. Please configure GOOGLE_GENERATIVE_AI_API_KEY in your environment or contact support." },
        { status: 500 }
      );
    }

    let model;
    if (provider === "anthropic") {
      model = anthropic(modelId);
    } else if (provider === "google") {
      model = google(modelId);
    } else {
      model = openai(modelId);
    }

    // For Dumbo deadline queries, execute tool first, generate text, and return with node IDs
    if (agent === "dumbo" && shouldExecuteToolFirst && queryType) {
      console.log(`Executing checkDeadlines tool for user ${userId}...`);
      
      // Try to find the most recently updated graph state for this user in grimpoStates
      // This is the table used by the main application's Server Actions
      const states = await db
        .select({ nodes: grimpoStates.nodes, id: grimpoStates.id })
        .from(grimpoStates)
        .where(eq(grimpoStates.userId, userId))
        .orderBy(desc(grimpoStates.updatedAt))
        .limit(1);

      console.log(`Found ${states.length} potential graph states in grimpo_states table.`);

      // Use the first one found (most recently updated), or default to empty
      const nodes = (states[0]?.nodes as any[]) || [];
      console.log(`Selected graph state ID: "${states[0]?.id || 'none'}" with ${nodes.length} nodes.`);
      if (nodes.length > 0) {
        console.log(`First node title sample: "${nodes[0]?.data?.title || 'no title'}"`);
      }
      
      const deadlineResults = await checkDeadlines(nodes, userDateTime);
      console.log(`checkDeadlines result:`, deadlineResults);

      // Determine which nodes to highlight based on query type
      let nodeIdsToHighlight: string[] = [];
      let highlightColor = "cyan";
      
      switch (queryType) {
        case "overdue" as any:
          nodeIdsToHighlight = deadlineResults.overdue.map(t => t.id);
          highlightColor = "red";
          break;
        case "today" as any:
          nodeIdsToHighlight = deadlineResults.today.map(t => t.id);
          highlightColor = "yellow";
          break;
        case "tomorrow" as any:
          nodeIdsToHighlight = deadlineResults.tomorrow.map(t => t.id);
          highlightColor = "blue"; // Using blue for tomorrow as well
          break;
        case "upcoming" as any:
          nodeIdsToHighlight = deadlineResults.upcoming.map(t => t.id);
          highlightColor = "blue";
          break;
        case "all" as any:
          nodeIdsToHighlight = [
            ...deadlineResults.overdue.map(t => t.id),
            ...deadlineResults.today.map(t => t.id),
            ...deadlineResults.tomorrow.map(t => t.id),
            ...deadlineResults.upcoming.map(t => t.id),
          ];
          // Filter duplicates
          nodeIdsToHighlight = Array.from(new Set(nodeIdsToHighlight));
          // For "all", use color based on urgency - we'll handle this on the frontend
          highlightColor = "multi";
          break;
      }

      // Add the tool result as context for the AI
      const messagesWithContext = [
        ...normalizedMessages,
        {
          role: "user" as const,
          content: `I just scanned the canvas for deadlines. Here's what I found:\n\n${JSON.stringify(deadlineResults, null, 2)}\n\nPlease summarize this in a friendly, encouraging way for the user! Mention the specific tasks and their deadlines.`,
        },
      ];

      const result = streamText({
        model,
        system: systemPrompt,
        messages: messagesWithContext,
      });

      // Get the full text
      const fullText = await result.text;

      // Return JSON with both text and highlight instructions
      return NextResponse.json({
        type: "complete",
        text: fullText,
        highlightNodes: nodeIdsToHighlight.length > 0 ? {
          nodeIds: nodeIdsToHighlight,
          color: highlightColor,
          results: deadlineResults, // Include full results for color mapping
        } : undefined,
      });
    }

    // Regular chat without tools
    const result = streamText({
      model,
      system: systemPrompt,
      messages: normalizedMessages,
    });

    const fullText = await result.text;
    return NextResponse.json({
      type: "complete",
      text: fullText,
    });
  } catch (error) {
    console.error("Chat error:", error);
    const err = error as any;
    return NextResponse.json(
      { error: err?.message || "Failed to process chat" }, 
      { status: 500 }
    );
  }
}
